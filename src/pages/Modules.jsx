import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Folder, Search, Plus, Edit, Trash2, Loader2, GitBranch, Layers, Puzzle, GripVertical, X, ChevronDown, Sparkles, Users, CheckSquare, Check, TrendingUp, Trophy, AlertCircle, Clock, Home, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import AddModuleModal from '../components/AddModuleModal';
import AddActivityModal from '../components/AddActivityModal';
import CreateActivitySeriesModal from '../components/CreateActivitySeriesModal';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableActivityItem = ({ activity, index, sortableId, onEdit }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sortableId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
    };

    if (!activity) return null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onEdit && onEdit(activity)}
            className={clsx(
                "flex items-center gap-3 p-2 bg-surface/40 hover:bg-surface/60 transition-colors rounded-lg border border-white/5 group cursor-pointer",
                isDragging ? "opacity-50 border-primary dashed" : ""
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-grey-dark hover:text-white transition-colors p-1"
            >
                <GripVertical size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-lg select-none truncate">{activity.titre}</h3>

                    {/* Requirements Badges */}
                    <div className="flex flex-wrap gap-1.5">


                        {/* Level-specific Requirements */}
                        {activity.ActiviteNiveau?.map(req => (
                            <div key={req.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/5 rounded text-[10px] font-bold text-primary border border-primary/10 whitespace-nowrap">
                                <span className="opacity-70 uppercase tracking-tighter">{req.Niveau?.nom}</span>
                                <span>{req.nombre_exercices || 0}</span>
                                <span className="opacity-30">/</span>
                                <span className="text-danger/70">{req.nombre_erreurs || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {activity.description && <p className="text-grey-medium text-sm truncate select-none">{activity.description}</p>}
            </div>

            <div className="flex gap-2">
                {/* Actions like Edit/Delete could go here */}
            </div>
        </div>
    );
};

const ProgressionCard = ({ progression }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: progression.id,
        data: {
            type: 'student',
            progression
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-white/5 hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group shadow-sm mb-2"
        >
            <div className="w-6 h-6 rounded bg-surface flex items-center justify-center text-primary font-bold overflow-hidden border border-white/10 shrink-0">
                {progression.Eleve?.photo_base64 ? (
                    <img src={progression.Eleve.photo_base64} alt="" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[9px]">{progression.Eleve?.prenom?.[0]}{progression.Eleve?.nom?.[0]}</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-text-main truncate group-hover:text-primary transition-colors">
                    {progression.Eleve?.prenom} {progression.Eleve?.nom}
                </p>
            </div>
        </div>
    );
};

const ProgressionColumn = ({ id, label, icon: Icon, color, bg, children, count }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: {
            type: 'column',
            status: id
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex-1 flex flex-col min-w-[250px] rounded-2xl border transition-all duration-200",
                isOver ? "bg-white/5 border-primary/50 scale-[1.01]" : "bg-surface/20 border-white/5"
            )}
        >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface/10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    {Icon && (
                        <div className={clsx("p-1.5 rounded-lg shadow-inner", bg, color)}>
                            <Icon size={14} />
                        </div>
                    )}
                    <h4 className={clsx("text-[10px] font-black uppercase tracking-[0.15em]", color)}>
                        {label}
                    </h4>
                </div>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-grey-medium font-bold tabular-nums">
                    {count}
                </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar min-h-[200px] grid grid-cols-2 gap-2 content-start">
                {children}
            </div>
        </div>
    );
};

const Modules = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [moduleToEdit, setModuleToEdit] = useState(null);
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all'); // all, en_preparation, en_cours, archive
    const [branchFilter, setBranchFilter] = useState('all');
    const [subBranchFilter, setSubBranchFilter] = useState('all');

    const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
    const [isCreateSeriesModalOpen, setIsCreateSeriesModalOpen] = useState(false);
    const [activityToEdit, setActivityToEdit] = useState(null);

    // Progression/Group Integration
    const [detailTab, setDetailTab] = useState('activities'); // 'activities', 'groups', 'progression'
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [generatingProgressions, setGeneratingProgressions] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [selectedProgressionActivity, setSelectedProgressionActivity] = useState(null);
    const [progressions, setProgressions] = useState([]);
    const [loadingProgressions, setLoadingProgressions] = useState(false);

    // Notifications
    const [notification, setNotification] = useState(null);
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Local state for sortable activities
    const [moduleActivities, setModuleActivities] = useState([]);
    const [stats, setStats] = useState({});

    // Fetch stats for all activities in the current module
    useEffect(() => {
        const fetchStats = async () => {
            if (!moduleActivities.length) return;

            const activityIds = moduleActivities.map(a => a.id);
            if (activityIds.length === 0) return;

            const { data, error } = await supabase
                .from('Progression')
                .select('activite_id, etat')
                .in('activite_id', activityIds);

            if (error) {
                console.error('Error fetching stats:', error);
                return;
            }

            const newStats = {};
            activityIds.forEach(id => {
                const activityProgressions = data.filter(p => p.activite_id === id);
                const total = activityProgressions.length;
                const completed = activityProgressions.filter(p => p.etat === 'termine').length;
                newStats[id] = {
                    total,
                    completed,
                    percent: total > 0 ? Math.round((completed / total) * 100) : 0
                };
            });
            setStats(newStats);
        };

        fetchStats();
    }, [moduleActivities, progressions]);

    useEffect(() => {
        fetchModules();
    }, []);

    useEffect(() => {
        if (selectedModule && selectedModule.Activite) {
            // Sort by order initially
            const sorted = [...selectedModule.Activite].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
            setModuleActivities(sorted);
        } else {
            setModuleActivities([]);
        }
    }, [selectedModule]);

    const fetchModules = async () => {
        setLoading(true);
        try {
            // Fetch modules with their related SubBranch and nested Branch info
            const { data, error } = await supabase
                .from('Module')
                .select(`
                    *,
                        SousBranche:sous_branche_id (
                            id,
                            nom,
                            branche_id,
                            ordre,
                            Branche:branche_id (
                                id,
                                nom,
                                ordre
                            )
                        ),
                    Activite (
                        *,
                        ActiviteNiveau (
                            *,
                            Niveau (*)
                        ),
                        ActiviteMateriel (
                            TypeMateriel (
                                acronyme
                            )
                        ),
                        Progression (etat)
                    )
                `)
                .order('nom')
                .order('ordre', { foreignTable: 'Activite', ascending: true });

            if (error) throw error;

            // Calculate progress for each module
            const modulesWithStats = (data || []).map(m => {
                let totalProgressions = 0;
                let completedProgressions = 0;

                if (m.Activite && m.Activite.length > 0) {
                    m.Activite.forEach(act => {
                        if (act.Progression && act.Progression.length > 0) {
                            totalProgressions += act.Progression.length;
                            completedProgressions += act.Progression.filter(p => p.etat === 'termine').length;
                        }
                    });
                }

                return {
                    ...m,
                    totalProgressions,
                    completedProgressions,
                    percent: totalProgressions > 0 ? Math.round((completedProgressions / totalProgressions) * 100) : 0
                };
            });

            setModules(modulesWithStats);
            if (data && data.length > 0) {
                const stillExists = selectedModule && data.find(m => m.id === selectedModule.id);
                if (stillExists) {
                    setSelectedModule(stillExists);
                } else if (!selectedModule) {
                    setSelectedModule(data[0]);
                }
            } else {
                setSelectedModule(null);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreated = async (newModule) => {
        await fetchModules();
        if (newModule) {
            setSelectedModule(newModule);
        }
        setModuleToEdit(null);
    };

    const fetchGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('Groupe')
                .select('*, Classe(nom)')
                .order('nom');
            if (error) throw error;
            setGroups(data || []);
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    useEffect(() => {
        if (detailTab === 'groups') {
            fetchGroups();
        }
    }, [detailTab]);

    const handleToggleGroup = (groupId) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const generateProgressions = async () => {
        if (selectedGroups.length === 0 || !selectedModule) return;

        setGeneratingProgressions(true);
        setProgress(5);
        setProgressText('Recherche des élèves...');
        try {
            // 1. Fetch all students from selected groups using Join Table
            const { data: students, error: studentsError } = await supabase
                .from('Eleve')
                .select('id, prenom, nom, niveau_id, EleveGroupe!inner(groupe_id)')
                .in('EleveGroupe.groupe_id', selectedGroups);

            if (studentsError) throw studentsError;

            setProgress(15);
            setProgressText(`${students.length} élèves trouvés...`);

            // 2. Fetch all activities for this module
            const activities = selectedModule.Activite || [];
            const progressionsToInsert = [];

            let studentIndex = 0;
            for (const student of students) {
                studentIndex++;
                const currentPercentage = 15 + Math.round((studentIndex / students.length) * 75);
                setProgress(currentPercentage);
                setProgressText(`Analyse : ${student.prenom} ${student.nom}...`);

                for (const activity of activities) {
                    // Get levels associated with this activity
                    const activityLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];


                    // STRICT MATCHING RULE
                    if (activityLevels.length === 0) continue;

                    if (activityLevels.includes(student.niveau_id)) {
                        progressionsToInsert.push({
                            eleve_id: student.id,
                            activite_id: activity.id,
                            etat: 'a_commencer',
                            user_id: (await supabase.auth.getUser()).data.user?.id,
                            date_limite: selectedModule.date_fin || null // Add Due Date from Module
                        });
                    }
                }
            }

            if (progressionsToInsert.length > 0) {
                setProgress(95);
                setProgressText('Enregistrement en base de données...');
                const { error: insertError } = await supabase
                    .from('Progression')
                    .upsert(progressionsToInsert, {
                        onConflict: 'eleve_id, activite_id',
                        ignoreDuplicates: true
                    });

                if (insertError) throw insertError;

                setProgress(100);
                showNotification(`${progressionsToInsert.length} lignes de progression générées !`);
                setSelectedGroups([]);
                setDetailTab('activities');
            } else {
                showNotification("Aucun élève correspondant aux niveaux des activités n'a été trouvé dans ces groupes.", 'error');
            }
        } catch (err) {
            console.error('Error generating progressions:', err);
            showNotification("Erreur lors de la génération des progressions.", 'error');
        } finally {
            setGeneratingProgressions(false);
            setProgress(0);
            setProgressText('');
        }
    };

    const fetchProgressions = async (activityId) => {
        if (!activityId) return;
        setLoadingProgressions(true);
        try {
            const { data, error } = await supabase
                .from('Progression')
                .select('*, Eleve(nom, prenom, photo_base64, EleveGroupe(Groupe(nom)))')
                .eq('activite_id', activityId)
            // Remove local sorting, we'll group by status in UI

            if (error) throw error;
            setProgressions(data || []);
        } catch (err) {
            console.error('Error fetching progressions:', err);
        } finally {
            setLoadingProgressions(false);
        }
    };

    const updateProgressionStatus = async (progressionId, newStatus) => {
        // Optimistic UI
        const oldProgressions = [...progressions];
        setProgressions(prev => prev.map(p =>
            p.id === progressionId ? { ...p, etat: newStatus } : p
        ));

        try {
            const { error } = await supabase
                .from('Progression')
                .update({ etat: newStatus })
                .eq('id', progressionId);

            if (error) throw error;
        } catch (err) {
            console.error('Error updating progression status:', err);
            // Revert
            setProgressions(oldProgressions);
        }
    };

    const handleProgressionDragEnd = (event) => {
        const { active, over } = event;

        if (!over) return;

        const progressionId = active.id;
        const newStatus = over.id; // The column id is the status string

        // Only update if dropping on a different status
        const currentProgression = progressions.find(p => p.id === progressionId);
        if (currentProgression && currentProgression.etat !== newStatus && ['a_commencer', 'besoin_d_aide', 'a_verifier', 'termine', 'a_domicile'].includes(newStatus)) {
            // Optimistically update module progress
            if (selectedModule) {
                setModules(prev => prev.map(m => {
                    if (m.id === selectedModule.id) {
                        let { totalProgressions = 0, completedProgressions = 0 } = m;

                        // Adjust counts based on status change
                        const isNewCompleted = newStatus === 'termine';
                        const isOldCompleted = currentProgression.etat === 'termine';

                        if (isNewCompleted && !isOldCompleted) {
                            completedProgressions++;
                        } else if (!isNewCompleted && isOldCompleted) {
                            completedProgressions--;
                        }

                        return {
                            ...m,
                            totalProgressions,
                            completedProgressions,
                            percent: totalProgressions > 0 ? Math.round((completedProgressions / totalProgressions) * 100) : 0
                        };
                    }
                    return m;
                }));
            }

            // Optimistically update activity stats
            if (stats[selectedProgressionActivity?.id]) {
                setStats(prev => {
                    const currentStats = prev[selectedProgressionActivity.id];
                    let { total, completed } = currentStats;

                    const isNewCompleted = newStatus === 'termine';
                    const isOldCompleted = currentProgression.etat === 'termine';

                    if (isNewCompleted && !isOldCompleted) {
                        completed++;
                    } else if (!isNewCompleted && isOldCompleted) {
                        completed--;
                    }

                    return {
                        ...prev,
                        [selectedProgressionActivity.id]: {
                            total,
                            completed,
                            percent: total > 0 ? Math.round((completed / total) * 100) : 0
                        }
                    };
                });
            }

            updateProgressionStatus(progressionId, newStatus);
        }
    };

    useEffect(() => {
        if (detailTab === 'progression' && selectedProgressionActivity) {
            fetchProgressions(selectedProgressionActivity.id);
        }
    }, [detailTab, selectedProgressionActivity]);

    // Set first activity as default when switching modules OR to progression tab
    useEffect(() => {
        if (detailTab === 'progression' && moduleActivities.length > 0) {
            setSelectedProgressionActivity(moduleActivities[0]);
        }
    }, [detailTab, selectedModule?.id, moduleActivities.length > 0]);

    const handleDelete = async () => {
        const targetModule = moduleToDelete;
        if (!targetModule) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('Module').delete().eq('id', targetModule.id);
            if (error) throw error;

            if (selectedModule?.id === targetModule.id) {
                setSelectedModule(null);
            }
            setModuleToDelete(null);
            fetchModules();
        } catch (err) {
            console.error('Error deleting module:', err);
            showNotification("Erreur lors de la suppression du module.", 'error');
        } finally {
            setLoading(false);
        }
    };


    const handleEdit = (module) => {
        setModuleToEdit(module);
        setIsAddModalOpen(true);
    };

    const handleEditActivity = (activity) => {
        setActivityToEdit(activity);
        setIsAddActivityModalOpen(true);
    };

    const availableBranches = useMemo(() => {
        const branchesMap = new Map();
        modules.forEach(m => {
            const b = m.SousBranche?.Branche;
            if (b) {
                branchesMap.set(String(b.id), b.nom);
            }
        });
        return Array.from(branchesMap.entries())
            .map(([id, nom]) => ({ id, nom }))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [modules]);

    const availableSubBranches = useMemo(() => {
        const subBranchesMap = new Map();
        modules.forEach(m => {
            const sb = m.SousBranche;
            if (sb && (branchFilter === 'all' || String(sb.branche_id) === String(branchFilter))) {
                subBranchesMap.set(String(sb.id), sb.nom);
            }
        });
        return Array.from(subBranchesMap.entries())
            .map(([id, nom]) => ({ id, nom }))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [modules, branchFilter]);

    // Reset sub-branch when branch changes
    useEffect(() => {
        setSubBranchFilter('all');
    }, [branchFilter]);

    const toggleStatus = async (module) => {
        if (!module) return;
        const currentStatus = module.statut || 'en_preparation';
        let newStatus = 'en_cours';

        if (currentStatus === 'en_preparation') newStatus = 'en_cours';
        else if (currentStatus === 'en_cours') newStatus = 'archive';
        else if (currentStatus === 'archive') newStatus = 'en_cours';

        // Optimistic UI update
        const updatedModule = { ...module, statut: newStatus };
        setSelectedModule(updatedModule);
        setModules(prev => prev.map(m => m.id === module.id ? updatedModule : m));

        try {
            const { error } = await supabase.from('Module').update({ statut: newStatus }).eq('id', module.id);
            if (error) throw error;
        } catch (err) {
            console.error("Error updating status:", err);
            // Revert or refresh on error
            fetchModules();
        }
    };

    // Drag and Drop Logic
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = moduleActivities.findIndex((item) => item.id === active.id);
            const newIndex = moduleActivities.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(moduleActivities, oldIndex, newIndex);

            // Update local activity state
            setModuleActivities(newItems);

            // Update database payload
            const updates = newItems.map((item, index) => ({
                id: item.id,
                ordre: index + 1,
                titre: item.titre,
                module_id: item.module_id,
                user_id: item.user_id
            }));

            // Sync with global modules state
            setModules(prev => prev.map(m => {
                if (m.id === selectedModule.id) {
                    const updatedActivities = m.Activite.map(act => {
                        const update = updates.find(u => u.id === act.id);
                        return update ? { ...act, ordre: update.ordre } : act;
                    }).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

                    const updatedModule = { ...m, Activite: updatedActivities };
                    // Also update selectedModule to maintain consistency
                    if (selectedModule.id === m.id) {
                        setSelectedModule(updatedModule);
                    }
                    return updatedModule;
                }
                return m;
            }));

            updateActivitiesOrder(updates);
        }
    };

    const updateActivitiesOrder = async (updates) => {
        try {
            const { error } = await supabase
                .from('Activite')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;
        } catch (err) {
            console.error("Error updating activity order:", err);
            // Optionally fetch modules again if update failed to revert UI
            fetchModules();
        }
    };


    const filteredModules = useMemo(() => {
        return modules.filter(m => {
            const matchesSearch = m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.SousBranche?.nom && m.SousBranche.nom.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (m.statut === statusFilter) ||
                (statusFilter === 'en_preparation' && !m.statut);

            const matchesBranch = branchFilter === 'all' ||
                String(m.SousBranche?.branche_id) === String(branchFilter);

            const matchesSubBranch = subBranchFilter === 'all' ||
                String(m.sous_branche_id) === String(subBranchFilter) ||
                String(m.SousBranche?.id) === String(subBranchFilter);

            const isFullyCompleted = m.totalProgressions > 0 && m.completedProgressions === m.totalProgressions;

            return matchesSearch && matchesStatus && matchesBranch && matchesSubBranch && !isFullyCompleted;
        }).sort((a, b) => {
            // 1. Date de fin (D'abord les plus proches, nulls à la fin)
            if (a.date_fin && b.date_fin) {
                if (a.date_fin !== b.date_fin) {
                    return new Date(a.date_fin) - new Date(b.date_fin);
                }
            } else if (a.date_fin) {
                return -1; // a a une date, b non -> a d'abord
            } else if (b.date_fin) {
                return 1; // b a une date, a non -> b d'abord
            }

            // 2. Ordre de la Branche
            const aBranchOrder = a.SousBranche?.Branche?.ordre || 0;
            const bBranchOrder = b.SousBranche?.Branche?.ordre || 0;
            if (aBranchOrder !== bBranchOrder) {
                return aBranchOrder - bBranchOrder;
            }

            // 3. Ordre de la Sous-Branche
            const aSBOrder = a.SousBranche?.ordre || 0;
            const bSBOrder = b.SousBranche?.ordre || 0;
            if (aSBOrder !== bSBOrder) {
                return aSBOrder - bSBOrder;
            }

            // 4. Ordre Alphabétique (Nom)
            return a.nom.localeCompare(b.nom);
        });
    }, [modules, searchTerm, statusFilter, branchFilter, subBranchFilter]);

    return (
        <div className="flex h-full gap-6">
            {/* Left Sidebar List */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
                {/* Header & Search */}
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <Folder className="text-primary" size={24} />
                            Liste des Modules
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {filteredModules.length} {filteredModules.length > 1 ? 'Modules' : 'Module'}
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un module..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>

                    {/* Status Filters - Capsule Style */}
                    <div className="neu-selector-container flex p-1 rounded-xl gap-1">
                        {[
                            { id: 'all', label: 'Tous' },
                            { id: 'en_preparation', label: 'Prép.' },
                            { id: 'en_cours', label: 'En cours' },
                            { id: 'archive', label: 'Arch.' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStatusFilter(f.id)}
                                data-active={statusFilter === f.id}
                                className={clsx(
                                    "flex-1 flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300",
                                    statusFilter !== f.id && "text-grey-medium hover:text-white"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Hierarchical Filters */}
                    <div className={clsx("grid gap-2", branchFilter !== 'all' ? "grid-cols-2" : "grid-cols-1")}>
                        {/* Branch Filter */}
                        <div className="relative group">
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider truncate pr-7"
                            >
                                <option value="all">Branches: Tous</option>
                                {availableBranches.map(b => (
                                    <option key={b.id} value={b.id}>{b.nom}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                                <ChevronDown size={14} />
                            </div>
                        </div>

                        {/* Sub-Branch Filter - Only visible if a branch is selected */}
                        {branchFilter !== 'all' && (
                            <div className="relative group animate-in slide-in-from-left-2 duration-200">
                                <select
                                    value={subBranchFilter}
                                    onChange={(e) => setSubBranchFilter(e.target.value)}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider truncate pr-7"
                                >
                                    <option value="all">Sous-Br.: Tous</option>
                                    {availableSubBranches.map(sb => (
                                        <option key={sb.id} value={sb.id}>{sb.nom}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : filteredModules.length === 0 ? (
                        <div className="text-center p-8 text-grey-medium italic">Aucun module trouvé.</div>
                    ) : (
                        filteredModules.map((module) => {
                            const isExpired = module.date_fin && new Date(module.date_fin) < new Date();
                            return (
                                <div
                                    key={module.id}
                                    onClick={() => setSelectedModule(module)}
                                    className={clsx(
                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer overflow-hidden backdrop-blur-sm",
                                        selectedModule?.id === module.id
                                            ? clsx("selected-state", isExpired && "!border-danger")
                                            : (isExpired ? "bg-surface/50 border-danger/40 hover:border-danger/60" : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface")
                                    )}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedModule(module); }}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                                        selectedModule?.id === module.id
                                            ? "bg-white/20 text-inherit"
                                            : "bg-background text-primary"
                                    )}>
                                        <Folder size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        {/* Line 1: Module Name + Date */}
                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                            <h3 className={clsx(
                                                "font-bold truncate text-[13px] leading-tight flex-1",
                                                selectedModule?.id === module.id ? "text-text-dark" : "text-text-main"
                                            )}>
                                                {module.nom}
                                            </h3>
                                            {module.date_fin && (
                                                <span className={clsx(
                                                    "font-bold text-[10px] shrink-0",
                                                    isExpired
                                                        ? (selectedModule?.id === module.id ? "text-white" : "text-danger")
                                                        : (selectedModule?.id === module.id ? "text-text-dark/70" : "text-white/60")
                                                )}>
                                                    {new Date(module.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            )}
                                        </div>

                                        {/* Line 2: Progress Bar + Branch Info */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="w-full h-1.5 rounded-full bg-black/20 overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full transition-all duration-500 ease-out",
                                                        isExpired ? (selectedModule?.id === module.id ? "bg-white" : "bg-danger") : "bg-success"
                                                    )}
                                                    style={{ width: `${(module.totalProgressions > 0 ? (module.completedProgressions / module.totalProgressions) * 100 : 0)}%` }}
                                                />
                                            </div>
                                            <div className={clsx(
                                                "flex items-center gap-2 text-[10px] truncate",
                                                selectedModule?.id === module.id ? "text-text-dark/70" : "text-grey-medium"
                                            )}>
                                                <span className="truncate opacity-80" title={`${module.Branche?.nom || module.SousBranche?.Branche?.nom} > ${module.SousBranche?.nom}`}>
                                                    {module.Branche?.nom || module.SousBranche?.Branche?.nom} - {module.SousBranche?.nom}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={clsx(
                                        "flex gap-1 transition-opacity",
                                        selectedModule?.id === module.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    )}>
                                        <div
                                            onClick={(e) => { e.stopPropagation(); handleEdit(module); }}
                                            className={clsx(
                                                "p-1.5 rounded-lg transition-colors cursor-pointer",
                                                selectedModule?.id === module.id
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
                                        onClick={(e) => { e.stopPropagation(); setModuleToDelete(module); }}
                                        className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                        title="Supprimer le module"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>

                                    <ChevronRight size={16} className={clsx(
                                        "transition-transform",
                                        selectedModule?.id === module.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                                    )} />
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Add Module Button (Bottom) */}
                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full h-12 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Ajouter un module</span>
                    </button>
                </div>
            </div>

            {/* Main Detail Area - Unified Card */}
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
                {selectedModule ? (
                    <>
                        {/* Header Section */}
                        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                            <div className="flex gap-6 items-center">
                                <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0">
                                    <Folder size={48} />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold text-text-main mb-2">{selectedModule.nom}</h1>
                                    <div className="flex items-center gap-4 text-grey-medium">
                                        {selectedModule.SousBranche && (
                                            <span className="text-sm text-grey-medium font-medium flex items-center gap-2">
                                                {selectedModule.SousBranche.Branche && `${selectedModule.SousBranche.Branche.nom} - `}
                                                {selectedModule.SousBranche.nom}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => toggleStatus(selectedModule)}
                                            className="transition-transform active:scale-95 focus:outline-none"
                                        >
                                            {selectedModule.statut === 'en_cours' && (
                                                <span className="px-3 py-1 bg-success/20 text-success text-[10px] font-bold uppercase rounded-lg border border-success/30 cursor-pointer hover:bg-success/30 transition-colors tracking-wider">
                                                    En cours
                                                </span>
                                            )}
                                            {selectedModule.statut === 'archive' && (
                                                <span className="px-3 py-1 bg-danger/20 text-danger text-[10px] font-bold uppercase rounded-lg border border-danger/30 cursor-pointer hover:bg-danger/30 transition-colors tracking-wider">
                                                    Archive
                                                </span>
                                            )}
                                            {(!selectedModule.statut || selectedModule.statut === 'en_preparation') && (
                                                <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase rounded-lg border border-primary/30 cursor-pointer hover:bg-primary/30 transition-colors tracking-wider">
                                                    En préparation
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={() => setIsCreateSeriesModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-text-dark text-[11px] font-bold uppercase rounded-lg border border-primary/20 transition-all active:scale-95"
                                >
                                    <Sparkles size={14} />
                                    Créer une série
                                </button>
                            </div>
                        </div>

                        {/* Content Section - Tabs */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            {/* Tabs Header - Modern Capsule Style */}
                            <div className="flex justify-center mb-10">
                                <div className="neu-selector-container flex p-1.5 rounded-2xl w-full max-w-md">
                                    <button
                                        onClick={() => setDetailTab('activities')}
                                        data-active={detailTab === 'activities'}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-300",
                                            detailTab === 'activities'
                                                ? "bg-primary text-text-dark"
                                                : "text-grey-medium hover:text-white"
                                        )}
                                    >
                                        <Puzzle size={16} />
                                        Activités
                                    </button>
                                    <button
                                        onClick={() => setDetailTab('groups')}
                                        data-active={detailTab === 'groups'}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-300",
                                            detailTab === 'groups'
                                                ? "bg-primary text-text-dark"
                                                : "text-grey-medium hover:text-white"
                                        )}
                                    >
                                        <Users size={16} />
                                        Groupes
                                    </button>
                                    <button
                                        onClick={() => setDetailTab('progression')}
                                        data-active={detailTab === 'progression'}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-300",
                                            detailTab === 'progression'
                                                ? "bg-primary text-text-dark"
                                                : "text-grey-medium hover:text-white"
                                        )}
                                    >
                                        <TrendingUp size={16} />
                                        Suivi
                                    </button>
                                </div>
                            </div>

                            {detailTab === 'activities' ? (
                                <div className="space-y-1 animate-in fade-in duration-300">
                                    {!moduleActivities || moduleActivities.length === 0 ? (
                                        <div className="pt-4">
                                            <button
                                                onClick={() => {
                                                    setActivityToEdit(null);
                                                    setIsAddActivityModalOpen(true);
                                                }}
                                                className="w-full h-12 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                                <span className="font-medium">Ajouter une activité</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={moduleActivities.map(a => a.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {moduleActivities.map((activity, index) => (
                                                    <SortableActivityItem
                                                        key={activity.id}
                                                        activity={activity}
                                                        index={index}
                                                        sortableId={activity.id}
                                                        onEdit={handleEditActivity}
                                                    />
                                                ))}
                                            </SortableContext>

                                            {/* Bottom Add Activity Button */}
                                            <div className="pt-4">
                                                <button
                                                    onClick={() => {
                                                        setActivityToEdit(null);
                                                        setIsAddActivityModalOpen(true);
                                                    }}
                                                    className="w-full h-12 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                                    <span className="font-medium">Ajouter une activité</span>
                                                </button>
                                            </div>
                                        </DndContext>
                                    )}
                                </div>
                            ) : detailTab === 'groups' ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groups.length === 0 ? (
                                            <div className="col-span-full text-center p-12 bg-surface/10 rounded-2xl border border-dashed border-white/10 italic text-grey-medium">
                                                Aucun groupe trouvé dans votre base.
                                            </div>
                                        ) : (
                                            groups.map(group => (
                                                <div
                                                    key={group.id}
                                                    onClick={() => handleToggleGroup(group.id)}
                                                    className={clsx(
                                                        "p-6 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center gap-4 group relative overflow-hidden",
                                                        selectedGroups.includes(group.id)
                                                            ? "bg-primary text-text-dark border-primary shadow-lg shadow-primary/10"
                                                            : "bg-surface/30 border-white/5 hover:border-white/10 hover:bg-surface/50"
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "w-14 h-14 rounded-xl flex items-center justify-center transition-all",
                                                        selectedGroups.includes(group.id) ? "bg-text-dark/10" : "bg-background text-primary"
                                                    )}>
                                                        <Users size={28} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={clsx("font-black uppercase tracking-tight text-sm", selectedGroups.includes(group.id) ? "text-text-dark" : "text-text-main")}>
                                                            {group.nom}
                                                        </h4>
                                                    </div>
                                                    <div className={clsx(
                                                        "absolute top-3 right-3 w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                                                        selectedGroups.includes(group.id) ? "bg-text-dark/10 border-text-dark/20 text-text-dark" : "border-white/10 text-transparent opacity-0 group-hover:opacity-100"
                                                    )}>
                                                        <Check size={16} strokeWidth={3} />
                                                    </div>
                                                    <div className={clsx(
                                                        "absolute -bottom-4 -right-4 w-12 h-12 rounded-full blur-2xl transition-opacity",
                                                        selectedGroups.includes(group.id) ? "bg-text-dark/20 opacity-100" : "bg-primary/5 opacity-0 group-hover:opacity-100"
                                                    )} />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            onClick={generateProgressions}
                                            disabled={selectedGroups.length === 0 || generatingProgressions}
                                            className={clsx(
                                                "w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-4 transition-all active:scale-[0.98] hover:scale-[1.02]",
                                                generatingProgressions
                                                    ? "bg-primary text-text-dark shadow-xl shadow-primary/20"
                                                    : "bg-success text-text-dark shadow-xl shadow-success/20 hover:bg-success/90"
                                            )}
                                        >
                                            {generatingProgressions ? (
                                                <div className="w-full px-8 flex flex-col gap-2">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-dark">
                                                        <span className="truncate pr-4">{progressText}</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-text-dark/20 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-text-dark transition-all duration-300 ease-out"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-8 h-8 rounded-full bg-text-dark/10 flex items-center justify-center">
                                                        <CheckSquare size={20} strokeWidth={3} />
                                                    </div>
                                                    Générer le suivi complet
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-8 h-full min-h-[500px] animate-in slide-in-from-right-2 duration-300">
                                    <div className="w-56 flex flex-col gap-2 border-r border-white/5 pr-6">
                                        <h4 className="text-[10px] uppercase font-bold text-grey-medium tracking-widest mb-2 px-2">Activités</h4>
                                        <div className="space-y-1 overflow-y-auto custom-scrollbar pr-2">
                                            {moduleActivities.map(act => (
                                                <button
                                                    key={act.id}
                                                    onClick={() => setSelectedProgressionActivity(act)}
                                                    className={clsx(
                                                        "w-full text-left p-2.5 rounded-xl transition-all border flex flex-col gap-1 group",
                                                        selectedProgressionActivity?.id === act.id
                                                            ? "bg-primary border-primary shadow-lg shadow-primary/10"
                                                            : "bg-surface/30 border-white/5 hover:border-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1 w-full">
                                                        <span className={clsx("text-[11px] font-bold truncate leading-tight", selectedProgressionActivity?.id === act.id ? "text-text-dark" : "text-text-main")}>
                                                            {act.titre}
                                                        </span>
                                                        {act.ActiviteMateriel && act.ActiviteMateriel.length > 0 && (
                                                            <span className={clsx("shrink-0 text-[10px] font-normal opacity-80", selectedProgressionActivity?.id === act.id ? "text-text-dark" : "text-grey-medium")}>
                                                                [{act.ActiviteMateriel.map(am => am.TypeMateriel?.acronyme).filter(Boolean).join(', ')}]
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-full h-1 rounded-full bg-black/20 overflow-hidden">
                                                            <div
                                                                className="h-full bg-success transition-all duration-500 ease-out"
                                                                style={{ width: `${stats[act.id]?.percent || 0}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col min-w-0">
                                        {!selectedProgressionActivity ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-grey-medium text-center">
                                                <TrendingUp size={48} className="mb-4 opacity-20" />
                                                <p className="font-medium text-sm">Sélectionnez une activité pour voir l'avancement.</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col gap-6">
                                                <div className="space-y-8 overflow-y-auto custom-scrollbar pr-4 pb-12">
                                                    {loadingProgressions ? (
                                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                                            <Loader2 size={32} className="animate-spin text-primary opacity-50" />
                                                            <p className="text-xs text-grey-medium animate-pulse">Chargement du suivi...</p>
                                                        </div>
                                                    ) : progressions.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface/10 rounded-3xl border border-dashed border-white/5">
                                                            <Clock size={48} className="mb-4 text-grey-dark opacity-30" />
                                                            <p className="text-grey-medium italic">Le module n'a pas encore été démarré pour cette activité.</p>
                                                            <button
                                                                onClick={() => setDetailTab('groups')}
                                                                className="mt-4 text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                                                            >
                                                                Démarrer maintenant
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <DndContext
                                                            sensors={sensors}
                                                            collisionDetection={closestCenter}
                                                            onDragEnd={handleProgressionDragEnd}
                                                        >
                                                            <div className="grid grid-cols-2 gap-4 pb-4 custom-scrollbar flex-1 min-h-0">
                                                                {[
                                                                    { id: 'a_commencer', label: 'À commencer', icon: null, color: 'text-grey-medium', bg: 'bg-white/5' },
                                                                    { id: 'besoin_d_aide', label: 'Besoin d\'aide', icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10' },
                                                                    { id: 'a_verifier', label: 'À Vérifier', icon: ShieldCheck, color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10' },
                                                                    { id: 'a_domicile', label: 'À domicile', icon: Home, color: 'text-danger', bg: 'bg-danger/10' },
                                                                    { id: 'termine', label: 'Terminé', icon: Trophy, color: 'text-success', bg: 'bg-success/10' }
                                                                ].map(column => {
                                                                    const columnProgressions = progressions.filter(p => p.etat === column.id);
                                                                    return (
                                                                        <ProgressionColumn
                                                                            key={column.id}
                                                                            id={column.id}
                                                                            label={column.label}
                                                                            icon={column.icon}
                                                                            color={column.color}
                                                                            bg={column.bg}
                                                                            count={columnProgressions.length}
                                                                        >
                                                                            <SortableContext
                                                                                items={columnProgressions.map(p => p.id)}
                                                                                strategy={verticalListSortingStrategy}
                                                                            >
                                                                                {columnProgressions.map(p => (
                                                                                    <ProgressionCard key={p.id} progression={p} />
                                                                                ))}
                                                                            </SortableContext>
                                                                        </ProgressionColumn>
                                                                    );
                                                                })}
                                                            </div>
                                                        </DndContext>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>


                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-grey-medium">
                        <Folder size={64} className="mb-4 opacity-50" />
                        <p className="text-xl">Sélectionnez un module pour voir les détails</p>
                    </div>
                )}
            </div>

            <AddModuleModal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); setModuleToEdit(null); }}
                onAdded={handleCreated}
                moduleToEdit={moduleToEdit}
            />

            <AddActivityModal
                isOpen={isAddActivityModalOpen}
                onClose={() => setIsAddActivityModalOpen(false)}
                onAdded={() => {
                    fetchModules();
                    if (selectedModule) {
                        const updated = modules.find(m => m.id === selectedModule.id);
                        if (updated) setSelectedModule(updated);
                    }
                }}
                activityToEdit={activityToEdit}
                defaultModuleId={selectedModule?.id}
                defaultModuleName={selectedModule?.nom}
                nextOrder={moduleActivities?.length > 0 ? Math.max(...moduleActivities.map(a => a.ordre || 0)) + 1 : 0}
            />

            <CreateActivitySeriesModal
                isOpen={isCreateSeriesModalOpen}
                onClose={() => setIsCreateSeriesModalOpen(false)}
                onAdded={fetchModules}
                moduleId={selectedModule?.id}
            />

            {/* Floating Notification Popup */}
            {
                notification && (
                    <div className={clsx(
                        "fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 border backdrop-blur-md",
                        notification.type === 'success'
                            ? "bg-success/90 border-success/20 text-text-dark"
                            : "bg-danger/90 border-danger/20 text-white"
                    )}>
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center shadow-inner",
                            notification.type === 'success' ? "bg-text-dark/10" : "bg-white/10"
                        )}>
                            {notification.type === 'success' ? <Check size={18} strokeWidth={3} /> : <AlertCircle size={18} strokeWidth={3} />}
                        </div>
                        <div className="flex flex-col">
                            <p className="font-black text-sm tracking-tight leading-tight uppercase">
                                {notification.type === 'success' ? 'Succès' : 'Attention'}
                            </p>
                            <p className="text-xs font-medium opacity-90">{notification.message}</p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-4 p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-50 hover:opacity-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                moduleToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le module ?</h2>
                            <p className="text-sm text-grey-medium mb-6">
                                Êtes-vous sûr de vouloir supprimer le module <span className="text-white font-bold">"{moduleToDelete.nom}"</span> ?
                                <br />Cette action est irréversible.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setModuleToDelete(null)}
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
                )
            }
        </div >
    );
};

// Helper for icon
const ChevronRight = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default Modules;
