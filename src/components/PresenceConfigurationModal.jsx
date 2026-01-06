import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Settings, Plus, Trash2, Save, X, Palette, Check, Layers, FileText, LayoutGrid, Download } from 'lucide-react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import Modal from './ui/Modal';
import Button from './ui/Button';
import PresencePDF from './PresencePDF';
import clsx from 'clsx';

const COLORS = [
    '#EF4444', // Red (Danger/Absent default)
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue (Default)
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#64748B', // Slate
];

const PresenceConfigurationModal = ({
    isOpen,
    onClose,
    onConfigSaved,
    // Props for "Général" & "Export"
    groups = [],
    selectedGroup,
    onSelectGroup,
    setups = [],
    selectedSetup,
    onSelectSetup,
    onUnlockEditing, // New prop
    activeCategories = [], // Passed from parent for Export context
    studentsForExport = [], // For PDF
    attendancesForExport = [], // For PDF (Default for "Day" mode initially, potentially)
    currentDateForExport, // For PDF (Default Day)
    isSetupLocked = false
}) => {
    const [sets, setSets] = useState([]); // User's sets for config management
    const [loading, setLoading] = useState(false);

    // Config Internal State
    const [view, setView] = useState('list'); // 'list', 'edit' (Nested view in Configuration tab)
    const [currentSet, setCurrentSet] = useState(null);
    const [categories, setCategories] = useState([]);

    // Export Internal State
    const [exportMode, setExportMode] = useState('day'); // 'day', 'week', 'month'
    const [availablePeriods, setAvailablePeriods] = useState([]); // [{ label: 'Semaine 12', value: '2024-02-12:2024-02-18' }]
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [exportData, setExportData] = useState([]); // Attendances for the PDF
    const [exportDates, setExportDates] = useState([]); // Array of date strings for PDF columns
    const [selectedDay, setSelectedDay] = useState(currentDateForExport); // Selected date for Day mode

    // Tabs State
    const [activeTab, setActiveTab] = useState('general'); // 'general', 'config', 'export'

    const [distinctDates, setDistinctDates] = useState([]);

    const fetchDistinctDates = async () => {
        if (!selectedGroup || !selectedSetup) return;
        try {
            // We need to fetch all distinct dates for this setup.
            const { data, error } = await supabase
                .from('Attendance')
                .select('date')
                .eq('setup_id', selectedSetup.id)
                .order('date', { ascending: false });

            if (error) throw error;

            const uniqueDates = [...new Set(data.map(item => item.date))].sort().reverse();
            setDistinctDates(uniqueDates);

            if (exportMode !== 'day') {
                processAvailablePeriods(uniqueDates, exportMode);
            }

        } catch (err) {
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Fetch sets only if needed or on open
            fetchSets();
        }
    }, [isOpen]);

    // Fetch Available Dates when Export tab opens
    useEffect(() => {
        if (activeTab === 'export' && selectedGroup && selectedSetup) {
            fetchDistinctDates();
            // Default to Day mode
            setExportMode('day');
            setSelectedDay(currentDateForExport);
        }
    }, [activeTab, selectedGroup, selectedSetup, currentDateForExport]);

    // Re-process periods when mode changes (Day -> Week/Month)
    useEffect(() => {
        if (activeTab === 'export' && exportMode !== 'day' && distinctDates.length > 0) {
            processAvailablePeriods(distinctDates, exportMode);
        }
    }, [exportMode, distinctDates, activeTab]);

    // Handle Period Change (Week/Month) OR Day change
    useEffect(() => {
        if (activeTab !== 'export') return;

        if (exportMode === 'day') {
            // Day mode: reuse fetchAttendanceRange for single day
            fetchAttendanceRange(selectedDay, selectedDay);
            setExportDates([selectedDay]);
            setSelectedPeriod(''); // Clear selected period when in day mode
        } else {
            // Week/Month mode
            if (!selectedPeriod) {
                setExportData([]);
                setExportDates([]);
                return;
            }
            const [start, end] = selectedPeriod.split(':');
            fetchAttendanceRange(start, end);

            // Generate full range of dates for headers
            const dates = [];
            const curr = new Date(start);
            const last = new Date(end);
            while (curr <= last) {
                dates.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }
            setExportDates(dates);
        }
    }, [selectedPeriod, exportMode, selectedDay, activeTab]);

    const processAvailablePeriods = (uniqueDates, mode) => {
        const periods = [];
        const seen = new Set();

        uniqueDates.forEach(dateStr => {
            // Parse YYYY-MM-DD manually to avoid UTC conversion issues
            const [y, m, d] = dateStr.split('-').map(Number);
            // Use noon to avoid DST/midnight edge cases
            const date = new Date(y, m - 1, d, 12, 0, 0);

            let start, end, label, value;

            if (mode === 'week') {
                // Get Monday
                // Day 0 is Sunday, 1 is Monday
                const day = date.getDay();
                // If diff is positive, subtract. If 0 (Sun), subtract 6.
                // Logic: Monday = Date - (day === 0 ? 6 : day - 1)
                const daysToMonday = day === 0 ? 6 : day - 1;

                const monday = new Date(date);
                monday.setDate(date.getDate() - daysToMonday);

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                const mStr = monday.toLocaleDateString('fr-FR');
                // const sStr = sunday.toLocaleDateString('fr-FR');

                // Helper to format YYYY-MM-DD using local time
                const toLocalISODate = (d) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const startStr = toLocalISODate(monday);
                const endStr = toLocalISODate(sunday);

                value = `${startStr}:${endStr}`;
                label = `Semaine du ${mStr}`;
            } else { // Month
                const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                // Start of month
                const firstDay = new Date(y, m - 1, 1, 12, 0, 0);
                const lastDay = new Date(y, m, 0, 12, 0, 0);

                // Helper to format YYYY-MM-DD using local time
                const toLocalISODate = (d) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const startStr = toLocalISODate(firstDay);
                const endStr = toLocalISODate(lastDay);

                value = `${startStr}:${endStr}`;
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
    };

    const fetchAttendanceRange = async (start, end) => {
        if (!selectedGroup) return;
        setLoading(true);
        try {
            // Fetch attendances for ALL students in the group for this range.
            // We use studentsForExport (which is the list of students in the current group).
            const { data, error } = await supabase
                .from('Attendance')
                .select('*')
                .eq('setup_id', selectedSetup.id)
                .gte('date', start)
                .lte('date', end)
                .in('eleve_id', studentsForExport.map(s => s.id));

            if (error) throw error;
            setExportData(data || []);

        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const fetchSets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('SetupPresence')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSets(data || []);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    // --- Configuration Logic ---
    const handleCreateNew = () => {
        setCurrentSet({ id: null, nom: '', description: '' });
        setCategories([
            { id: 'temp-1', nom: 'Présent', couleur: '#10B981', isTemp: true },
            { id: 'temp-2', nom: 'En Retard', couleur: '#F59E0B', isTemp: true }
        ]);
        setView('edit');
    };

    const handleEdit = async (set) => {
        setCurrentSet(set);
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('CategoriePresence')
                .select('*')
                .eq('setup_id', set.id)
                .neq('nom', 'Absent')
                .order('created_at');

            if (error) throw error;
            setCategories(data || []);
            setView('edit');
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSet = async (setId) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce set de configuration ? Tout l'historique associé pourrait être impacté.")) return;
        try {
            const { error } = await supabase.from('SetupPresence').delete().eq('id', setId);
            if (error) throw error;
            fetchSets();
            // If deleted set was selected in parent, parent might need update, but we rely on fetchSets and parent logic separate for now
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const handleSaveSet = async () => {
        if (!currentSet.nom.trim()) {
            alert("Le nom du set est obligatoire");
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            let setupId = currentSet.id;
            const setupData = {
                nom: currentSet.nom,
                description: currentSet.description,
                user_id: user.id
            };

            if (setupId) {
                const { error } = await supabase.from('SetupPresence').update(setupData).eq('id', setupId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('SetupPresence').insert([setupData]).select().single();
                if (error) throw error;
                setupId = data.id;
            }

            const categoriesToUpsert = categories.map(c => ({
                id: c.isTemp ? undefined : c.id,
                setup_id: setupId,
                nom: c.nom,
                couleur: c.couleur,
                user_id: user.id
            }));

            for (const cat of categoriesToUpsert) {
                const { error } = await supabase.from('CategoriePresence').upsert(cat);
                if (error) throw error;
            }

            // Ensure Absent exists
            const { count } = await supabase.from('CategoriePresence').select('*', { count: 'exact', head: true }).eq('setup_id', setupId).eq('nom', 'Absent');
            if (count === 0) {
                await supabase.from('CategoriePresence').insert({ setup_id: setupId, nom: 'Absent', couleur: '#EF4444', user_id: user.id });
            }

            setView('list');
            fetchSets();
            if (onConfigSaved) onConfigSaved();

        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const addCategory = () => {
        setCategories([...categories, { id: `temp-${Date.now()}`, nom: '', couleur: '#3B82F6', isTemp: true }]);
    };

    const removeCategory = (index) => {
        const newCats = [...categories];
        const cat = newCats[index];
        if (!cat.isTemp && cat.id) {
            if (confirm("Supprimer cette catégorie ?")) {
                supabase.from('CategoriePresence').delete().eq('id', cat.id).then(({ error }) => {
                    if (!error) {
                        newCats.splice(index, 1);
                        setCategories(newCats);
                    }
                });
            }
        } else {
            newCats.splice(index, 1);
            setCategories(newCats);
        }
    };

    // --- Render Logic ---

    // Tab Button Component
    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => { setActiveTab(id); if (id !== 'config') setView('list'); }} // Reset nested view when changing tabs
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
            {/* Tabs Header */}
            <div className="flex items-center gap-2 mb-6 p-1 bg-black/20 rounded-xl">
                <TabButton id="general" label="Général" icon={LayoutGrid} />
                <TabButton id="config" label="Configuration" icon={Layers} />
                <TabButton id="export" label="Export" icon={FileText} />
            </div>

            <div className="min-h-[300px]">
                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Group Selection */}
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
                                <p className="text-xs text-grey-medium mt-2">
                                    Sélectionnez le groupe d'élèves pour lequel vous souhaitez gérer les présences.
                                </p>
                            </div>
                        </div>

                        {/* Setup Selection */}
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
                                {setups.length === 0 && <p className="p-3 text-xs text-grey-medium">Aucune configuration disponible. Créez-en une dans l'onglet Configuration.</p>}
                            </div>
                        </div>

                        {/* Unlock Editing Button */}
                        <div className="pt-4 border-t border-white/10">
                            <button
                                onClick={onUnlockEditing}
                                className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl border border-dashed border-primary/30 hover:border-primary transition-all flex items-center justify-center gap-2 font-medium"
                            >
                                <Settings size={18} />
                                <span>Réactiver l'édition des présences</span>
                            </button>
                            <p className="text-xs text-grey-medium mt-2 text-center">
                                Permet de modifier le placement des élèves déjà assignés.
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. CONFIGURATION TAB */}
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
                        ) : (
                            // Edit View
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

                {/* 3. EXPORT TAB */}
                {activeTab === 'export' && (
                    <div className="flex h-[600px] gap-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Sidebar Controls */}
                        <div className="w-1/3 flex flex-col gap-4 p-4 bg-surface border border-white/10 rounded-xl h-full">
                            <div className="text-center space-y-2 mb-2">
                                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-text-main">Export PDF</h3>
                            </div>

                            {/* Mode Selection */}
                            <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-lg">
                                <button
                                    onClick={() => setExportMode('day')}
                                    className={clsx(
                                        "py-1.5 rounded-md text-xs font-bold transition-all",
                                        exportMode === 'day' ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                                    )}
                                >
                                    Jour
                                </button>
                                <button
                                    onClick={() => setExportMode('week')}
                                    className={clsx(
                                        "py-1.5 rounded-md text-xs font-bold transition-all",
                                        exportMode === 'week' ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                                    )}
                                >
                                    Semaine
                                </button>
                                <button
                                    onClick={() => setExportMode('month')}
                                    className={clsx(
                                        "py-1.5 rounded-md text-xs font-bold transition-all",
                                        exportMode === 'month' ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                                    )}
                                >
                                    Mois
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                <p className="text-grey-medium text-xs">
                                    Rapport pour <strong>{selectedGroup?.nom || '...'}</strong>
                                </p>

                                {/* Day Selection if Day Mode */}
                                {exportMode === 'day' && (
                                    <div className="w-full space-y-1">
                                        <label className="text-xs font-semibold text-grey-light uppercase block">Date</label>
                                        <input
                                            type="date"
                                            value={selectedDay}
                                            onChange={e => setSelectedDay(e.target.value)}
                                            className="w-full bg-input border border-border/10 rounded-lg p-2 text-text-main focus:border-primary outline-none"
                                        />
                                    </div>
                                )}

                                {/* Period Dropdown if Week/Month */}
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

                            {/* Download Button at bottom of sidebar */}
                            <PDFDownloadLink
                                document={
                                    <PresencePDF
                                        categories={activeCategories}
                                        students={studentsForExport}
                                        attendances={exportData}
                                        groupName={selectedGroup?.nom || 'Groupe Inconnu'}
                                        dates={exportDates}
                                    />
                                }
                                fileName={`presence-${selectedGroup?.nom}-${exportMode}-${exportDates[0] || 'report'}.pdf`}
                                className="w-full py-3 bg-primary text-text-dark rounded-xl font-bold hover:bg-primary-light transition-colors flex items-center justify-center gap-2 mt-auto"
                            >
                                {({ loading }) => (
                                    <>
                                        <Download size={18} />
                                        {loading ? 'Chargement...' : 'Télécharger'}
                                    </>
                                )}
                            </PDFDownloadLink>
                        </div>

                        {/* Right Panel: PDF Preview */}
                        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-white/5 h-full relative">
                            {/* Overlay loader or empty state can go here */}
                            {((exportMode === 'day' && exportData.length >= 0) || (selectedPeriod && exportData.length >= 0)) ? (
                                <PDFViewer width="100%" height="100%" className="w-full h-full border-none">
                                    <PresencePDF
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
        </Modal>
    );
};

export default PresenceConfigurationModal;


