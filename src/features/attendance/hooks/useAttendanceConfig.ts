import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
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
    selectedSetup,
    currentDateForExport,
    isOpen
}: UseAttendanceConfigProps) => {
    const queryClient = useQueryClient();
    
    // UI Local State
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [activeTab, setActiveTab] = useState<'general' | 'config' | 'export'>('general');
    
    // Edit Internal State
    const [currentSet, setCurrentSet] = useState<{ id: string | null; nom: string; description: string | null } | null>(null);
    const [categories, setCategories] = useState<CategoryWithTemp[]>([]);

    // Export Internal State
    const [exportMode, setExportMode] = useState<'day' | 'week' | 'month'>('day');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [selectedDay, setSelectedDay] = useState(currentDateForExport);

    // 0. User fetching
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Setups fetching
    const { data: sets = [], isLoading: loadingSets } = useQuery({
        queryKey: ['attendance-setup', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await attendanceService.fetchSetups();
        },
        enabled: isOpen && !!user,
        staleTime: 1000 * 60 * 5,
    });

    // 2. Distinct dates for export
    const { data: distinctDates = [] } = useQuery({
        queryKey: ['attendance-dates', user?.id, selectedSetup?.id],
        queryFn: async () => {
            if (!selectedSetup) return [];
            return await attendanceService.fetchDistinctDates(selectedSetup.id);
        },
        enabled: activeTab === 'export' && !!selectedSetup && !!user,
    });

    // 3. Export data fetching
    const [exportRange, setExportRange] = useState<{ start: string; end: string } | null>(null);
    
    const { data: exportData = [], isLoading: loadingExport } = useQuery({
        queryKey: ['attendance-range', user?.id, exportRange?.start, exportRange?.end],
        queryFn: async () => {
            if (!exportRange) return [];
            return await attendanceService.fetchAttendanceRange(exportRange.start, exportRange.end);
        },
        enabled: activeTab === 'export' && !!exportRange && !!user,
    });

    // 4. Mutations
    const deleteSetupMutation = useMutation({
        mutationFn: (id: string) => attendanceService.deleteSetup(id),
        onMutate: async (id) => {
            const queryKey = ['attendance-setup', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<SetupPresence[]>(queryKey) || [];
            queryClient.setQueryData(queryKey, previous.filter(s => s.id !== id));
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            toast.error('Erreur: ' + (_err as any).message);
        },
        onSuccess: () => {
            toast.success("Configuration supprimée");
        }
    });

    const saveSetupMutation = useMutation({
        mutationFn: async ({ currentSet, categories, onConfigSaved }: { currentSet: any, categories: CategoryWithTemp[], onConfigSaved?: () => void }) => {
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
            
            return { setupId, onConfigSaved };
        },
        onSuccess: ({ onConfigSaved }) => {
            queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] });
            setView('list');
            if (onConfigSaved) onConfigSaved();
            toast.success("Configuration sauvegardée");
        },
        onError: (err: any) => toast.error('Erreur: ' + err.message)
    });

    const copyPeriodMutation = useMutation({
        mutationFn: async ({ source, target, onConfigSaved }: { source: string, target: string, onConfigSaved?: () => void }) => {
            if (!selectedSetup || !user) throw new Error("Sélection manquante");
            await attendanceService.copyPeriodData(currentDateForExport, selectedSetup.id, source, target, user.id);
            return onConfigSaved;
        },
        onSuccess: (onConfigSaved) => {
            toast.success("Données copiées");
            if (onConfigSaved) onConfigSaved();
            // Invalidate attendance queries in useAttendance's scope
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id] });
        },
        onError: (err: any) => toast.error("Erreur: " + err.message)
    });

    // --- LOGIC FOR EXPORT PERIODS ---
    const availablePeriods = useMemo(() => {
        if (activeTab !== 'export' || exportMode === 'day' || distinctDates.length === 0) return [];
        
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
            const date = new Date(y, m - 1, d, 12, 0, 0);
            let value: string, label: string;

            if (exportMode === 'week') {
                const day = date.getDay();
                const daysToMonday = day === 0 ? 6 : day - 1;
                const monday = new Date(date);
                monday.setDate(date.getDate() - daysToMonday);
                const friday = new Date(monday);
                friday.setDate(monday.getDate() + 4);

                value = `${toLocalISODate(monday)}:${toLocalISODate(friday)}`;
                label = `Semaine du ${monday.toLocaleDateString('fr-FR')} au ${friday.toLocaleDateString('fr-FR')}`;
            } else { // month
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
        return periods;
    }, [activeTab, exportMode, distinctDates]);

    useEffect(() => {
        if (availablePeriods.length > 0 && !selectedPeriod) {
            setSelectedPeriod(availablePeriods[0].value);
        }
    }, [availablePeriods, selectedPeriod]);

    const exportDates = useMemo(() => {
        if (exportMode === 'day') return [selectedDay];
        if (!selectedPeriod) return [];
        
        const [start, end] = selectedPeriod.split(':');
        const dates: string[] = [];
        const [startY, startM, startD] = start.split('-').map(Number);
        const [endY, endM, endD] = end.split('-').map(Number);
        const curr = new Date(startY, startM - 1, startD, 12, 0, 0);
        const last = new Date(endY, endM - 1, endD, 12, 0, 0);

        while (curr <= last) {
            const day = curr.getDay();
            if (day !== 0 && day !== 6) {
                const dayStr = String(curr.getDate()).padStart(2, '0');
                const monthStr = String(curr.getMonth() + 1).padStart(2, '0');
                dates.push(`${curr.getFullYear()}-${monthStr}-${dayStr}`);
            }
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }, [exportMode, selectedDay, selectedPeriod]);

    useEffect(() => {
        if (activeTab !== 'export') return;
        if (exportMode === 'day') {
            setExportRange({ start: selectedDay, end: selectedDay });
        } else if (selectedPeriod) {
            const [start, end] = selectedPeriod.split(':');
            setExportRange({ start, end });
        }
    }, [activeTab, exportMode, selectedDay, selectedPeriod]);

    // Actions
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
        try {
            const data = await attendanceService.fetchCategories(set.id);
            setCategories(data.filter((c: any) => c.nom !== 'Absent'));
            setView('edit');
        } catch (error) {
            console.error(error);
        }
    };

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
        sets,
        loading: loadingSets || loadingExport || saveSetupMutation.isPending || deleteSetupMutation.isPending || copyPeriodMutation.isPending,
        view, setView,
        currentSet, setCurrentSet,
        categories, setCategories,
        activeTab, setActiveTab,
        exportMode, setExportMode,
        availablePeriods,
        selectedPeriod, setSelectedPeriod,
        exportData: exportData || [],
        exportDates,
        selectedDay, setSelectedDay,

        handleCreateNew,
        handleEdit,
        handleDeleteSet: (id: string) => deleteSetupMutation.mutate(id),
        handleSaveSet: (onConfigSaved?: () => void) => {
            if (!currentSet) return;
            saveSetupMutation.mutate({ currentSet, categories, onConfigSaved });
        },
        addCategory,
        removeCategory,
        updateCategory,
        handleCopyPeriod: (source: string, target: string, onConfigSaved?: () => void) => 
            copyPeriodMutation.mutate({ source, target, onConfigSaved }),
        fetchSets: () => queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] })
    };
};
