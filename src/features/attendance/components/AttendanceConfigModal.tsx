import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { attendanceService, Group, Student, SetupPresence, CategoriePresence, Attendance } from '../services/attendanceService';
import { Settings, Plus, Trash2, Save, X, Layers, FileText, LayoutGrid, Download, Check, ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import AttendancePDF from './AttendancePDF';
import clsx from 'clsx';
import { toast } from 'sonner';

const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B',
];

interface AttendanceConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfigSaved?: () => void;
    groups?: Group[];
    selectedGroup: Group | null;
    onSelectGroup?: (group: Group | undefined) => void;
    setups?: SetupPresence[];
    selectedSetup: SetupPresence | null;
    onSelectSetup?: (setup: SetupPresence) => void;
    onUnlockEditing?: () => void;
    activeCategories?: CategoriePresence[];
    studentsForExport?: Student[];
    currentDateForExport: string;
    isSetupLocked?: boolean;
}

interface CategoryWithTemp extends Partial<CategoriePresence> {
    id: string;
    nom: string;
    couleur: string | undefined;
    isTemp?: boolean;
}

interface ConfirmModalState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => Promise<void> | void) | null;
}

const AttendanceConfigModal: React.FC<AttendanceConfigModalProps> = ({
    isOpen,
    onClose,
    onConfigSaved,
    groups = [],
    selectedGroup,
    onSelectGroup,
    setups = [],
    selectedSetup,
    onSelectSetup,
    onUnlockEditing,
    activeCategories = [],
    studentsForExport = [],
    currentDateForExport,
    isSetupLocked = false
}) => {
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
    const [exportData, setExportData] = useState<(Attendance & { CategoriePresence: { nom: string } | null })[]>([]);
    const [exportDates, setExportDates] = useState<string[]>([]);
    const [selectedDay, setSelectedDay] = useState(currentDateForExport);
    const [distinctDates, setDistinctDates] = useState<string[]>([]);

    // Tabs State
    const [activeTab, setActiveTab] = useState<'general' | 'config' | 'export'>('general');

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    // --- FETCH DATA ---
    const fetchDistinctDates = useCallback(async () => {
        if (!selectedGroup || !selectedSetup) return;
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

    // Fetch Available Dates when Export tab opens
    useEffect(() => {
        if (activeTab === 'export' && selectedGroup && selectedSetup) {
            fetchDistinctDates().then((dates) => {
                // Initial load: day mode by default
            });
            setExportMode('day');
            setSelectedDay(currentDateForExport);
        }
    }, [activeTab, selectedGroup, selectedSetup, currentDateForExport, fetchDistinctDates]);

    // Re-process periods when mode changes
    useEffect(() => {
        const toLocalISODate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (activeTab === 'export' && exportMode !== 'day' && distinctDates.length > 0) {
            const periods: { label: string; value: string }[] = [];
            const seen = new Set<string>();

            distinctDates.forEach(dateStr => {
                const [y, m, d] = dateStr.split('-').map(Number);
                const date = new Date(y, m - 1, d, 12, 0, 0);
                let value: string, label: string;

                if (exportMode === 'week') {
                    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
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

    // Handle Period/Day Change
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

            // Generate full range of dates
            const dates: string[] = [];
            const [startY, startM, startD] = start.split('-').map(Number);
            const [endY, endM, endD] = end.split('-').map(Number);
            const curr = new Date(startY, startM - 1, startD, 12, 0, 0);
            const last = new Date(endY, endM - 1, endD, 12, 0, 0);

            while (curr <= last) {
                const day = curr.getDay();
                if (day !== 0 && day !== 6) {
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

    // --- Configuration Logic ---
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
            setCategories(data.filter(c => c.nom !== 'Absent'));
            setView('edit');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSet = async (setId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce set de configuration ? Tout l'historique associé pourrait être impacté.")) return;
        try {
            await attendanceService.deleteSetup(setId);
            fetchSets();
        } catch (error: any) {
            toast.error('Erreur: ' + error.message);
        }
    };

    const handleSaveSet = async () => {
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

    const addCategory = () => {
        setCategories([...categories, { id: `temp-${Date.now()}`, nom: '', couleur: '#3B82F6', isTemp: true }]);
    };

    const removeCategory = (index: number) => {
        const newCats = [...categories];
        const cat = newCats[index];
        if (!cat.isTemp && cat.id) {
            if (confirm("Supprimer cette catégorie ?")) {
                attendanceService.deleteCategory(cat.id).then(() => {
                    newCats.splice(index, 1);
                    setCategories(newCats);
                });
            }
        } else {
            newCats.splice(index, 1);
            setCategories(newCats);
        }
    };

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab; label: string; icon: LucideIcon }) => (
        <button
            onClick={() => { setActiveTab(id); if (id !== 'config') setView('list'); }}
            className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 justify-center",
                activeTab === id
                    ? "bg-primary text-text-dark shadow-lg shadow-primary/20"
                    : "bg-surface/50 text-grey-medium hover:text-white hover:bg-white/5"
            )}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Options & Configuration"
            icon={<Settings size={24} />}
            footer={null}
        >
            <div className="flex items-center gap-2 mb-6 p-1 bg-black/20 rounded-xl">
                <TabButton id="general" label="Général" icon={LayoutGrid} />
                <TabButton id="config" label="Configuration" icon={Layers} />
                <TabButton id="export" label="Export" icon={FileText} />
            </div>

            <div className="min-h-[300px]">
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-grey-light uppercase tracking-wider">Groupe Actif</label>
                            <div className="p-4 bg-surface border border-white/10 rounded-xl">
                                <select
                                    value={selectedGroup?.id || ''}
                                    onChange={e => onSelectGroup && onSelectGroup(groups.find(g => g.id === e.target.value))}
                                    className="w-full bg-input border border-border/10 rounded-lg p-3 text-text-main focus:border-primary outline-none font-medium"
                                >
                                    <option value="" disabled>Sélectionner un groupe</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-grey-light uppercase tracking-wider">Configuration de Présence</label>
                            <div className="grid grid-cols-1 gap-2 p-1 bg-surface border border-white/10 rounded-xl max-h-[200px] overflow-y-auto custom-scrollbar">
                                {setups.map(s => (
                                    <button
                                        key={s.id}
                                        disabled={isSetupLocked}
                                        onClick={() => onSelectSetup && onSelectSetup(s)}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all text-left",
                                            selectedSetup?.id === s.id
                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                : "hover:bg-white/5 text-grey-light border border-transparent",
                                            isSetupLocked && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isSetupLocked && selectedSetup?.id === s.id && <Settings size={14} className="animate-pulse" />}
                                            <span>{s.nom}</span>
                                        </div>
                                        {selectedSetup?.id === s.id && <Check size={16} />}
                                    </button>
                                ))}
                                {isSetupLocked && (
                                    <p className="p-3 text-[10px] text-primary bg-primary/5 rounded-b-lg font-bold uppercase tracking-wider">
                                        Configuration verrouillée (Présences déjà encodées)
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <button
                                onClick={onUnlockEditing}
                                className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl border border-dashed border-primary/30 hover:border-primary transition-all flex items-center justify-center gap-2 font-medium"
                            >
                                <Settings size={18} />
                                <span>Réactiver l'édition des présences</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        {view === 'list' ? (
                            <div className="space-y-4">
                                <button
                                    onClick={handleCreateNew}
                                    className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    <span>Créer un nouveau Set</span>
                                </button>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {sets.map(set => (
                                        <div key={set.id} className="flex items-center justify-between p-4 bg-surface border border-white/10 rounded-xl hover:bg-white/5 transition-colors group">
                                            <div>
                                                <h3 className="font-bold text-text-main">{set.nom}</h3>
                                                {set.description && <p className="text-xs text-grey-medium">{set.description}</p>}
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(set)} className="p-2 hover:bg-white/10 rounded-lg text-primary">
                                                    <Settings size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteSet(set.id)} className="p-2 hover:bg-danger/10 rounded-lg text-danger">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : currentSet && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-grey-light uppercase">Nom du Set</label>
                                        <input
                                            value={currentSet.nom}
                                            onChange={e => setCurrentSet({ ...currentSet, nom: e.target.value })}
                                            placeholder="ex: Cantine, Ateliers..."
                                            className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-grey-light uppercase">Catégories</label>
                                        <button onClick={addCategory} className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <Plus size={12} /> Ajouter
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                                        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg opacity-50 select-none">
                                            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white text-xs font-bold">A</div>
                                            <span className="text-grey-medium italic flex-1">Absent (Par défaut)</span>
                                        </div>
                                        {categories.map((cat, idx) => (
                                            <div key={cat.id || idx} className="flex items-center gap-2">
                                                <div className="relative group/color shrink-0">
                                                    <div className="w-8 h-8 rounded-lg cursor-pointer border border-white/10" style={{ backgroundColor: cat.couleur }} />
                                                    <div className="absolute top-full mt-2 left-0 bg-surface border border-white/10 rounded-lg p-2 grid grid-cols-5 gap-1 z-50 hidden group-hover/color:grid w-40 shadow-xl">
                                                        {COLORS.map(c => (
                                                            <div key={c} onClick={() => { const newCats = [...categories]; newCats[idx].couleur = c; setCategories(newCats); }} className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <input
                                                    value={cat.nom}
                                                    onChange={e => { const newCats = [...categories]; newCats[idx].nom = e.target.value; setCategories(newCats); }}
                                                    placeholder="Nom de la catégorie"
                                                    className="flex-1 bg-input border border-border/10 rounded-lg p-2 text-sm text-text-main focus:border-primary outline-none"
                                                />
                                                <button onClick={() => removeCategory(idx)} className="p-2 text-grey-dark hover:text-danger transition-colors"><X size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                    <button onClick={() => setView('list')} className="text-sm text-grey-medium hover:text-white">&larr; Retour</button>
                                    <Button onClick={handleSaveSet} loading={loading} icon={Save}>Enregistrer</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'export' && (
                    <div className="flex h-[600px] gap-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-1/3 flex flex-col gap-4 p-4 bg-surface border border-white/10 rounded-xl h-full">
                            <div className="text-center space-y-2 mb-2">
                                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-text-main">Export PDF</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-lg">
                                {(['day', 'week', 'month'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setExportMode(mode)}
                                        className={clsx(
                                            "py-1.5 rounded-md text-xs font-bold transition-all uppercase",
                                            exportMode === mode ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                                        )}
                                    >
                                        {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 flex-1">
                                <p className="text-grey-medium text-xs">
                                    Rapport pour <strong>{selectedGroup?.nom || '...'}</strong>
                                </p>

                                {exportMode === 'day' && (
                                    <div className="w-full space-y-3">
                                        <label className="text-xs font-semibold text-grey-light uppercase block">Date</label>
                                        <input
                                            type="date"
                                            value={selectedDay}
                                            onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                                            onChange={e => setSelectedDay(e.target.value)}
                                            className="w-full bg-input border border-border/10 rounded-lg p-2 text-text-main focus:border-primary outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                                        />

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const [y, m, d] = selectedDay.split('-').map(Number);
                                                    const curr = new Date(y, m - 1, d, 12, 0, 0);
                                                    curr.setDate(curr.getDate() - 1);
                                                    const year = curr.getFullYear();
                                                    const month = String(curr.getMonth() + 1).padStart(2, '0');
                                                    const day = String(curr.getDate()).padStart(2, '0');
                                                    setSelectedDay(`${year}-${month}-${day}`);
                                                }}
                                                className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-lg text-grey-light hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                            >
                                                <ChevronLeft size={16} />
                                                Jour précédent
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const [y, m, d] = selectedDay.split('-').map(Number);
                                                    const curr = new Date(y, m - 1, d, 12, 0, 0);
                                                    curr.setDate(curr.getDate() + 1);
                                                    const year = curr.getFullYear();
                                                    const month = String(curr.getMonth() + 1).padStart(2, '0');
                                                    const day = String(curr.getDate()).padStart(2, '0');
                                                    setSelectedDay(`${year}-${month}-${day}`);
                                                }}
                                                className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-lg text-grey-light hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                            >
                                                Jour suivant
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {exportMode !== 'day' && (
                                    <div className="w-full space-y-1">
                                        <label className="text-xs font-semibold text-grey-light uppercase block">Période</label>
                                        <select
                                            value={selectedPeriod}
                                            onChange={e => setSelectedPeriod(e.target.value)}
                                            className="w-full bg-input border border-border/10 rounded-lg p-2 text-text-main focus:border-primary outline-none"
                                        >
                                            {availablePeriods.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                            {availablePeriods.length === 0 && <option disabled>Aucune donnée</option>}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {exportDates.length > 0 ? (
                                <PDFDownloadLink
                                    document={
                                        <AttendancePDF
                                            categories={activeCategories}
                                            students={studentsForExport}
                                            attendances={exportData}
                                            groupName={selectedGroup?.nom || 'Groupe Inconnu'}
                                            dates={exportDates}
                                        />
                                    }
                                    fileName={`presence-${selectedGroup?.nom}-${exportMode}-${exportDates[0] || 'report'}.pdf`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    {/*@ts-ignore - PDFDownloadLink children type can be tricky*/}
                                    {({ loading }) => (
                                        <div className="w-full py-3 bg-primary text-text-dark rounded-xl font-bold hover:bg-primary-light transition-colors flex items-center justify-center gap-2 mt-auto">
                                            <Download size={18} />
                                            {loading ? 'Chargement...' : 'Télécharger'}
                                        </div>
                                    )}
                                </PDFDownloadLink>
                            ) : (
                                <button disabled className="w-full py-3 bg-white/5 text-grey-medium rounded-xl font-bold flex items-center justify-center gap-2 mt-auto cursor-not-allowed">
                                    <FileText size={18} className="opacity-50" />
                                    Sélectionnez une période
                                </button>
                            )}
                        </div>

                        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-white/5 h-full relative">
                            {exportDates.length > 0 ? (
                                <PDFViewer width="100%" height="100%" className="w-full h-full border-none">
                                    <AttendancePDF
                                        categories={activeCategories}
                                        students={studentsForExport}
                                        attendances={exportData}
                                        groupName={selectedGroup?.nom || 'Groupe Inconnu'}
                                        dates={exportDates}
                                    />
                                </PDFViewer>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-grey-medium gap-2">
                                    <FileText size={48} className="opacity-20" />
                                    <p>Sélectionnez une période pour voir l'aperçu</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'general' && (
                <div className="sticky bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-sm border-t border-white/10 mt-6">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => {
                                if (!selectedGroup || !selectedSetup) {
                                    toast.error("Sélectionnez un groupe et une configuration");
                                    return;
                                }
                                setConfirmModal({
                                    isOpen: true,
                                    title: "Copier les présences",
                                    message: "Voulez-vous copier les données du matin vers l'après-midi ? Les données existantes de l'après-midi seront remplacées.",
                                    onConfirm: async () => {
                                        try {
                                            await attendanceService.copyPeriodData(
                                                currentDateForExport,
                                                selectedSetup.id,
                                                'matin',
                                                'apres_midi'
                                            );
                                            toast.success("Données copiées du matin vers l'après-midi");
                                            if (onConfigSaved) onConfigSaved();
                                        } catch (error: any) {
                                            toast.error("Erreur: " + error.message);
                                        }
                                    }
                                });
                            }}
                            className="py-3 bg-surface/50 hover:bg-white/5 text-grey-light hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <ChevronRight size={16} />
                            <span>Matin → AM</span>
                        </button>

                        <button
                            onClick={() => {
                                if (!selectedGroup || !selectedSetup) {
                                    toast.error("Sélectionnez un groupe et une configuration");
                                    return;
                                }
                                setConfirmModal({
                                    isOpen: true,
                                    title: "Copier les présences",
                                    message: "Voulez-vous copier les données de l'après-midi vers le matin ? Les données existantes du matin seront remplacées.",
                                    onConfirm: async () => {
                                        try {
                                            await attendanceService.copyPeriodData(
                                                currentDateForExport,
                                                selectedSetup.id,
                                                'apres_midi',
                                                'matin'
                                            );
                                            toast.success("Données copiées de l'après-midi vers le matin");
                                            if (onConfigSaved) onConfigSaved();
                                        } catch (error: any) {
                                            toast.error("Erreur: " + error.message);
                                        }
                                    }
                                });
                            }}
                            className="py-3 bg-surface/50 hover:bg-white/5 text-grey-light hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <ChevronLeft size={16} />
                            <span>AM → Matin</span>
                        </button>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="warning"
            />
        </Modal>
    );
};

export default AttendanceConfigModal;
