import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { attendanceService, Group, SetupPresence, CategoriePresence } from '../services/attendanceService';
import { toast } from 'sonner';

interface UseAttendanceConfigProps {
    selectedGroup: Group | null;
    selectedSetup: SetupPresence | null;
    currentDateForExport: string;
    isOpen: boolean;
}

export interface CategoryWithTemp extends Partial<CategoriePresence> {
    id: string;
    nom: string;
    couleur: string | null | undefined;
    isTemp?: boolean;
}

export const useAttendanceConfig = ({
    selectedGroup,
    selectedSetup,
    currentDateForExport,
    isOpen
}: UseAttendanceConfigProps) => {
    const [sets, setSets] = useState<SetupPresence[]>([]);
    const [loading, setLoading] = useState(false);

    // Config Internal State
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [currentSet, setCurrentSet] = useState<{ id: string | null; nom: string; description: string | null } | null>(null);
    const [categories, setCategories] = useState<CategoryWithTemp[]>([]);

    // Export Internal State
    const [exportMode, setExportMode] = useState<'day' | 'week' | 'month'>('day');
    const [availablePeriods, setAvailablePeriods] = useState<{ label: string; value: string }[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [exportData, setExportData] = useState<any[]>([]);
    const [exportDates, setExportDates] = useState<string[]>([]);
    const [selectedDay, setSelectedDay] = useState(currentDateForExport);
    const [distinctDates, setDistinctDates] = useState<string[]>([]);

    // Tabs State
    const [activeTab, setActiveTab] = useState<'general' | 'config' | 'export'>('general');

    // --- FETCH DATA ---
    const fetchDistinctDates = useCallback(async () => {
        if (!selectedGroup || !selectedSetup) return [];
        try {
            const uniqueDates = await attendanceService.fetchDistinctDates(selectedSetup.id);
            setDistinctDates(uniqueDates);
            return uniqueDates;
        } catch (err) {
            console.error(err);
            return [];
        }
    }, [selectedGroup, selectedSetup]);

    const fetchSets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await attendanceService.fetchSetups();
            setSets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAttendanceRange = useCallback(async (start: string, end: string) => {
        if (!selectedGroup) return;
        setLoading(true);
        try {
            const data = await attendanceService.fetchAttendanceRange(start, end);
            setExportData(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedGroup]);

    // --- EFFECTS ---
    useEffect(() => {
        if (isOpen) {
            fetchSets();
        }
    }, [isOpen, fetchSets]);

    // Fetch dates when entering export tab
    useEffect(() => {
        if (activeTab === 'export' && selectedGroup && selectedSetup) {
            fetchDistinctDates();
            setExportMode('day');
            setSelectedDay(currentDateForExport);
        }
    }, [activeTab, selectedGroup, selectedSetup, currentDateForExport, fetchDistinctDates]);

    // Generate Periods based on Export Mode & Distinct Dates
    useEffect(() => {
        if (activeTab === 'export' && exportMode !== 'day' && distinctDates.length > 0) {
            const periods: { label: string; value: string }[] = [];
            const seen = new Set<string>();

            const toLocalISODate = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            distinctDates.forEach((dateStr) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                const date = new Date(y, m - 1, d, 12, 0, 0); // Noon to avoid timezone shifts
                let value: string, label: string;

                if (exportMode === 'week') {
                    const day = date.getDay(); // 0=Sun
                    const daysToMonday = day === 0 ? 6 : day - 1;
                    const monday = new Date(date);
                    monday.setDate(date.getDate() - daysToMonday);

                    const friday = new Date(monday);
                    friday.setDate(monday.getDate() + 4);

                    const mStr = monday.toLocaleDateString('fr-FR');
                    const fStr = friday.toLocaleDateString('fr-FR');

                    value = `${toLocalISODate(monday)}:${toLocalISODate(friday)}`;
                    label = `Semaine du ${mStr} au ${fStr}`;
                } else { // Month
                    const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                    const firstDay = new Date(y, m - 1, 1, 12, 0, 0);
                    const lastDay = new Date(y, m, 0, 12, 0, 0);
                    value = `${toLocalISODate(firstDay)}:${toLocalISODate(lastDay)}`;
                    label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                }

                if (!seen.has(value)) {
                    seen.add(value);
                    periods.push({ label, value });
                }
            });

            setAvailablePeriods(periods);
            if (periods.length > 0) {
                setSelectedPeriod(periods[0].value);
            } else {
                setSelectedPeriod('');
                setExportData([]);
                setExportDates([]);
            }
        }
    }, [exportMode, distinctDates, activeTab]);

    // Handle Period/Day Selection Change
    useEffect(() => {
        if (activeTab !== 'export') return;

        if (exportMode === 'day') {
            fetchAttendanceRange(selectedDay, selectedDay);
            setExportDates([selectedDay]);
            setSelectedPeriod('');
        } else {
            if (!selectedPeriod) {
                setExportData([]);
                setExportDates([]);
                return;
            }
            const [start, end] = selectedPeriod.split(':');
            fetchAttendanceRange(start, end);

            // Generate fully inclusive date range
            const dates: string[] = [];
            const [startY, startM, startD] = start.split('-').map(Number);
            const [endY, endM, endD] = end.split('-').map(Number);
            const curr = new Date(startY, startM - 1, startD, 12, 0, 0);
            const last = new Date(endY, endM - 1, endD, 12, 0, 0);

            while (curr <= last) {
                const day = curr.getDay();
                if (day !== 0 && day !== 6) { // Exclude weekends if needed, or keep all
                    const year = curr.getFullYear();
                    const month = String(curr.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(curr.getDate()).padStart(2, '0');
                    dates.push(`${year}-${month}-${dayStr}`);
                }
                curr.setDate(curr.getDate() + 1);
            }
            setExportDates(dates);
        }
    }, [selectedPeriod, exportMode, selectedDay, activeTab, fetchAttendanceRange]);

    // --- ACTIONS ---

    const handleCreateNew = () => {
        setCurrentSet({ id: null, nom: '', description: '' });
        setCategories([
            { id: 'temp-1', nom: 'Présent', couleur: '#10B981', isTemp: true },
            { id: 'temp-2', nom: 'En Retard', couleur: '#F59E0B', isTemp: true }
        ]);
        setView('edit');
    };

    const handleEdit = async (set: SetupPresence) => {
        setCurrentSet(set);
        setLoading(true);
        try {
            const data = await attendanceService.fetchCategories(set.id);
            setCategories(data.filter((c: any) => c.nom !== 'Absent'));
            setView('edit');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSet = async (setId: string) => {
        try {
            await attendanceService.deleteSetup(setId);
            fetchSets();
            toast.success("Configuration supprimée");
        } catch (error: any) {
            toast.error('Erreur: ' + error.message);
        }
    };

    const handleSaveSet = async (onConfigSaved?: () => void) => {
        if (!currentSet || !currentSet.nom.trim()) {
            toast.error("Le nom du set est obligatoire");
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            let setupId = currentSet.id;
            if (setupId) {
                await attendanceService.updateSetup(setupId, currentSet.nom, currentSet.description);
            } else {
                const newSetup = await attendanceService.createSetup(user.id, currentSet.nom, currentSet.description);
                setupId = newSetup.id;
            }

            const categoriesToUpsert = categories.map(c => ({
                id: c.isTemp ? undefined : c.id,
                setup_id: setupId!,
                nom: c.nom,
                couleur: c.couleur || '#3B82F6',
                user_id: user.id
            }));

            await attendanceService.upsertCategories(categoriesToUpsert);
            await attendanceService.ensureAbsentCategory(setupId!, user.id);

            setView('list');
            fetchSets();
            if (onConfigSaved) onConfigSaved();
            toast.success("Configuration sauvegardée");

        } catch (error: any) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPeriod = async (source: string, target: string, onConfigSaved?: () => void) => {
        if (!selectedGroup || !selectedSetup) {
            toast.error("Sélectionnez un groupe et une configuration");
            return;
        }
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            await attendanceService.copyPeriodData(
                currentDateForExport,
                selectedSetup.id,
                source,
                target,
                user.id
            );
            toast.success(`Données copiées`);
            if (onConfigSaved) onConfigSaved();
        } catch (error: any) {
            toast.error("Erreur: " + error.message);
        }
    };

    // Category Management Local
    const addCategory = () => {
        setCategories([...categories, { id: `temp-${Date.now()}`, nom: '', couleur: '#3B82F6', isTemp: true }]);
    };

    const removeCategory = async (index: number) => {
        const newCats = [...categories];
        const cat = newCats[index];
        if (!cat.isTemp && cat.id) {
            try {
                await attendanceService.deleteCategory(cat.id);
                newCats.splice(index, 1);
                setCategories(newCats);
            } catch (e) { console.error(e); }
        } else {
            newCats.splice(index, 1);
            setCategories(newCats);
        }
    };

    const updateCategory = (index: number, field: keyof CategoryWithTemp, value: any) => {
        const newCats = [...categories];
        // @ts-ignore
        newCats[index][field] = value;
        setCategories(newCats);
    };

    return {
        // State
        sets,
        loading,
        view, setView,
        currentSet, setCurrentSet,
        categories, setCategories,
        activeTab, setActiveTab,

        // Export State
        exportMode, setExportMode,
        availablePeriods,
        selectedPeriod, setSelectedPeriod,
        exportData,
        exportDates,
        selectedDay, setSelectedDay,

        // Actions
        handleCreateNew,
        handleEdit,
        handleDeleteSet,
        handleSaveSet,
        addCategory,
        removeCategory,
        updateCategory,
        handleCopyPeriod,
        fetchSets
    };
};
