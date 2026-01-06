import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Puzzle, Search, Plus, Edit, Trash2, Loader2, Folder, FileText, CheckCircle, XCircle, X, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import AddActivityModal from '../components/AddActivityModal';

const Activities = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activityToEdit, setActivityToEdit] = useState(null);
    const [activityToDelete, setActivityToDelete] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all'); // all, en_preparation, en_cours, archive
    const [moduleFilter, setModuleFilter] = useState('all'); // all or module_id

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            // Fetch activities with their Module info and Requirements per Level
            const { data, error } = await supabase
                .from('Activite')
                .select(`
                    *,
                    Module:module_id (nom, statut),
                    ActiviteNiveau (
                        *,
                        Niveau (nom, ordre)
                    )
                `)
                .order('titre');

            if (error) throw error;
            setActivities(data || []);

            // Refind selected activity if it exists to update its data
            if (selectedActivity) {
                const updatedSelected = data.find(a => a.id === selectedActivity.id);
                if (updatedSelected) {
                    setSelectedActivity(updatedSelected);
                } else if (data.length > 0) {
                    setSelectedActivity(data[0]);
                } else {
                    setSelectedActivity(null);
                }
            } else if (data && data.length > 0) {
                setSelectedActivity(data[0]);
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleCreated = () => {
        fetchActivities();
        setActivityToEdit(null);
    };

    const handleDelete = async () => {
        const targetActivity = activityToDelete;
        if (!targetActivity) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('Activite').delete().eq('id', targetActivity.id);
            if (error) throw error;

            if (selectedActivity?.id === targetActivity.id) {
                setSelectedActivity(null);
            }
            setActivityToDelete(null);
            fetchActivities();
        } catch (err) {
            alert("Erreur lors de la suppression de l'activité.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (activity) => {
        setActivityToEdit(activity);
        setIsAddModalOpen(true);
    };

    const handleOpenCreate = () => {
        setActivityToEdit(null);
        setIsAddModalOpen(true);
    };

    const filteredActivities = useMemo(() => {
        return activities.filter(a => {
            const matchesSearch = a.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.Module?.nom && a.Module.nom.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (a.Module?.statut === statusFilter) ||
                (statusFilter === 'en_preparation' && !a.Module?.statut);

            const matchesModule = moduleFilter === 'all' || a.module_id === moduleFilter;

            return matchesSearch && matchesStatus && matchesModule;
        });
    }, [activities, searchTerm, statusFilter, moduleFilter]);

    // Unique modules based on current status filter
    const availableModules = useMemo(() => {
        const modulesMap = new Map();
        activities.forEach(a => {
            if (!a.Module) return;

            const matchesStatus = statusFilter === 'all' ||
                (a.Module.statut === statusFilter) ||
                (statusFilter === 'en_preparation' && !a.Module.statut);

            if (matchesStatus) {
                modulesMap.set(a.module_id, a.Module.nom);
            }
        });

        return Array.from(modulesMap.entries())
            .map(([id, nom]) => ({ id, nom }))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [activities, statusFilter]);

    // Watch status filter change to reset module filter
    useEffect(() => {
        setModuleFilter('all');
    }, [statusFilter]);

    // Consolidate requirements for display
    const getRequirementsList = (activity) => {
        if (!activity) return [];

        // Base Requirement
        const baseReq = {
            id: 'base',
            label: 'Exigence de base',
            nbExercises: activity.nombre_exercices || 0,
            nbErrors: activity.nombre_erreurs || 0,
            status: activity.statut_exigence || 'obligatoire',
            isBase: true
        };

        // Level Specific Requirements
        const levelReqs = (activity.ActiviteNiveau || [])
            .map(an => ({
                id: an.id,
                label: an.Niveau?.nom || 'Niveau Inconnu',
                nbExercises: an.nombre_exercices || 0,
                nbErrors: an.nombre_erreurs || 0,
                status: an.statut_exigence || 'obligatoire',
                isBase: false,
                order: an.Niveau?.ordre || 999
            }))
            .sort((a, b) => a.order - b.order);

        return [baseReq, ...levelReqs];
    };

    // Update handlers
    const handleUpdateRequirement = async (req, field, value) => {
        // Optimistic update
        const updatedActivities = activities.map(a => {
            if (a.id === selectedActivity.id) {
                if (req.isBase) {
                    return { ...a, [field]: value };
                } else {
                    return {
                        ...a,
                        ActiviteNiveau: a.ActiviteNiveau.map(an =>
                            an.id === req.id ? { ...an, [field]: value } : an
                        )
                    };
                }
            }
            return a;
        });
        setActivities(updatedActivities);
        if (selectedActivity) {
            const updatedSelected = updatedActivities.find(a => a.id === selectedActivity.id);
            if (updatedSelected) setSelectedActivity(updatedSelected);
        }

        try {
            let error;
            if (req.isBase) {
                const { error: err } = await supabase
                    .from('Activite')
                    .update({ [field]: value })
                    .eq('id', selectedActivity.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('ActiviteNiveau')
                    .update({ [field]: value })
                    .eq('id', req.id);
                error = err;
            }

            if (error) throw error;
        } catch (err) {
            fetchActivities();
        }
    };

    const handleToggleStatus = async (req) => {
        const newStatus = req.status === 'obligatoire' ? 'facultatif' : 'obligatoire';
        await handleUpdateRequirement(req, 'statut_exigence', newStatus);
    };

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar List */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <FileText className="text-primary" size={24} />
                            Liste des Activités
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {activities.length} Total
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            id="activities_search"
                            name="activities_search"
                            type="text"
                            placeholder="Rechercher une activité..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            aria-label="Rechercher une activité"
                        />
                    </div>

                    {/* Hierarchical Filters */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Status Filter Dropdown */}
                        <div className="relative group">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider"
                            >
                                <option value="all">Statuts: Tous</option>
                                <option value="en_preparation">Prép.</option>
                                <option value="en_cours">En Cours</option>
                                <option value="archive">Archivés</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                                <ChevronDown size={14} />
                            </div>
                        </div>

                        {/* Module Filter Dropdown */}
                        <div className="relative group">
                            <select
                                value={moduleFilter}
                                onChange={(e) => setModuleFilter(e.target.value)}
                                className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider truncate pr-8"
                            >
                                <option value="all">Modules: Tous</option>
                                {availableModules.map(m => (
                                    <option key={m.id} value={m.id}>{m.nom}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="text-center p-8 text-grey-medium italic">Aucune activité trouvée.</div>
                    ) : (
                        filteredActivities.map((activity) => (
                            <div
                                key={activity.id}
                                onClick={() => setSelectedActivity(activity)}
                                className={clsx(
                                    "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                    selectedActivity?.id === activity.id
                                        ? "selected-state"
                                        : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedActivity(activity); }}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                                    selectedActivity?.id === activity.id ? "bg-white/20 text-text-dark" : "bg-background text-primary"
                                )}>
                                    <Puzzle size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={clsx(
                                        "font-semibold truncate",
                                        selectedActivity?.id === activity.id ? "text-text-dark" : "text-text-main"
                                    )}>
                                        {activity.titre}
                                    </h3>

                                    {activity.Module && (
                                        <p className={clsx(
                                            "text-xs truncate flex items-center gap-1 mt-0.5",
                                            selectedActivity?.id === activity.id ? "text-text-dark/70" : "text-grey-medium"
                                        )}>
                                            <Folder size={10} />
                                            {activity.Module.nom}
                                        </p>
                                    )}
                                </div>

                                <div className={clsx(
                                    "flex gap-1 transition-opacity",
                                    selectedActivity?.id === activity.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleEdit(activity); }}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            selectedActivity?.id === activity.id
                                                ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                                : "text-grey-medium hover:text-white hover:bg-white/10"
                                        )}
                                        title="Modifier"
                                    >
                                        <Edit size={14} />
                                    </div>
                                </div>

                                {/* Absolute Delete Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActivityToDelete(activity); }}
                                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Supprimer l'activité"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>

                                <ChevronRight size={16} className={clsx(
                                    "transition-transform",
                                    selectedActivity?.id === activity.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                                )} />
                            </div>
                        ))
                    )}
                </div>

                {/* Add Button */}
                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <button
                        onClick={handleOpenCreate}
                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Nouvelle Activité</span>
                    </button>
                </div>
            </div>

            {/* Details Area - Unified Card */}
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
                {selectedActivity ? (
                    <>
                        {/* Header Detail - Lighter Background */}
                        <div className="flex items-start justify-between border-b border-white/5 p-8 bg-surface/20">
                            <div className="flex gap-6 items-center">
                                <div className="w-20 h-20 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0">
                                    <Puzzle size={40} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-text-main mb-2">{selectedActivity.titre}</h1>
                                    <div className="flex items-center gap-4 text-grey-medium">
                                        {selectedActivity.Module && (
                                            <span className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm">
                                                <Folder size={14} />
                                                {selectedActivity.Module.nom}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                            </div>
                        </div>

                        {/* Requirements Table - Content Background */}
                        <div className="flex-1 p-8 bg-background/20 overflow-y-auto custom-scrollbar">
                            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-wide">
                                <CheckCircle size={20} className="text-primary" />
                                Exigences
                            </h3>

                            <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-background/20 shadow-inner">
                                <div className="grid grid-cols-4 gap-4 p-4 bg-white/5 text-xs font-bold text-grey-medium uppercase tracking-wider border-b border-white/5">
                                    <div className="col-span-1">Niveau / Type</div>
                                    <div className="text-center">Exercices</div>
                                    <div className="text-center">Erreurs Max</div>
                                    <div className="text-center">Statut</div>
                                </div>

                                <div className="divide-y divide-white/5">
                                    {getRequirementsList(selectedActivity).map((req) => (
                                        <div key={req.id} className={clsx(
                                            "grid grid-cols-4 gap-4 p-4 items-center transition-colors hover:bg-white/5",
                                            req.isBase ? "bg-primary/5" : ""
                                        )}>
                                            <div className="col-span-1 font-medium text-white flex items-center gap-2">
                                                {req.isBase && <span className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50"></span>}
                                                {!req.isBase && <span className="w-1.5 h-1.5 rounded-full bg-white/30 ml-2"></span>}
                                                {req.label}
                                            </div>
                                            {/* Editable Exercises */}
                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    className="w-16 bg-white/5 border border-white/10 text-center text-white hover:bg-white/10 rounded-lg focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all py-1 font-bold"
                                                    value={req.nbExercises}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        handleUpdateRequirement(req, 'nombre_exercices', val);
                                                    }}
                                                />
                                            </div>

                                            {/* Editable Errors */}
                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    className="w-16 bg-white/5 border border-white/10 text-center text-white hover:bg-white/10 rounded-lg focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all py-1 font-bold"
                                                    value={req.nbErrors}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        handleUpdateRequirement(req, 'nombre_erreurs', val);
                                                    }}
                                                />
                                            </div>

                                            {/* Toggable Status */}
                                            <div className="text-center flex justify-center">
                                                <button
                                                    onClick={() => handleToggleStatus(req)}
                                                    className={clsx(
                                                        "px-3 py-1 rounded-lg text-xs font-bold uppercase border transition-all hover:scale-105 active:scale-95 shadow-lg",
                                                        req.status === 'obligatoire'
                                                            ? "bg-success/10 text-success border-success/20 hover:bg-success/20 shadow-success/10"
                                                            : "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20 shadow-danger/10"
                                                    )}
                                                >
                                                    {req.status}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-grey-medium">
                        <Puzzle size={64} className="mb-4 opacity-50" />
                        <p className="text-xl">Sélectionnez une activité pour voir les détails</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {activityToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer l'activité ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer l'activité <span className="text-white font-bold">"{activityToDelete.titre}"</span> ?
                            <br />Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActivityToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddActivityModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdded={handleCreated}
                activityToEdit={activityToEdit}
            />
        </div>
    );
};

const ChevronRight = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default Activities;
