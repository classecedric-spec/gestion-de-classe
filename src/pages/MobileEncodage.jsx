import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import {
    ArrowLeft,
    Users,
    User,
    BookOpen,
    Activity,
    Check,
    X,
    RotateCcw,
    Loader2,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Play,
    ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const MobileEncodage = () => {
    const navigate = useNavigate();

    // Flow state
    const [step, setStep] = useState('groups'); // 'groups' | 'students' | 'modules' | 'activities'

    // Data state
    const [groups, setGroups] = useState([]);
    const [students, setStudents] = useState([]);
    const [modules, setModules] = useState([]);
    const [activities, setActivities] = useState([]);
    const [progressions, setProgressions] = useState({});

    // Selection state
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);
    const [expandedModuleId, setExpandedModuleId] = useState(null);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingModules, setLoadingModules] = useState(false);
    const [savingActivity, setSavingActivity] = useState(null);

    // Initial load
    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('Groupe')
            .select('id, nom')
            .order('nom');

        setGroups(data || []);
        setLoading(false);
    };

    const fetchStudents = async (groupId) => {
        setLoadingStudents(true);
        const { data } = await supabase
            .from('Eleve')
            .select(`
                *,
                Niveau (nom),
                EleveGroupe!inner(groupe_id)
            `)
            .eq('EleveGroupe.groupe_id', groupId)
            .order('prenom');

        setStudents(data || []);
        setLoadingStudents(false);
    };

    const fetchModulesAndActivities = async (studentId, levelId) => {
        setLoadingModules(true);

        // Fetch modules with activities
        const { data: modulesData } = await supabase
            .from('Module')
            .select(`
                *,
                SousBranche:sous_branche_id (
                    nom,
                    Branche:branche_id (nom)
                ),
                Activite (
                    id,
                    titre,
                    ordre,
                    ActiviteNiveau (niveau_id),
                    ActiviteMateriel (
                        TypeMateriel (acronyme)
                    )
                )
            `)
            .eq('statut', 'en_cours')
            .order('nom');

        // Fetch progressions for this student
        const { data: progressionsData } = await supabase
            .from('Progression')
            .select('activite_id, etat')
            .eq('eleve_id', studentId);

        // Build progressions map
        const progMap = {};
        progressionsData?.forEach(p => {
            progMap[p.activite_id] = p.etat;
        });
        setProgressions(progMap);

        // Process modules - filter activities by level and calculate stats
        const processedModules = (modulesData || []).map(m => {
            const validActivities = (m.Activite || []).filter(act => {
                if (!levelId) return true;
                const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                return levels.length === 0 || levels.includes(levelId);
            }).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

            const totalActivities = validActivities.length;
            const completedActivities = validActivities.filter(act =>
                progMap[act.id] === 'termine' || progMap[act.id] === 'a_verifier'
            ).length;

            return {
                ...m,
                filteredActivities: validActivities,
                totalActivities,
                completedActivities,
                percent: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0
            };
        }).filter(m => m.totalActivities > 0);

        // Sort by branch then sub-branch
        processedModules.sort((a, b) => {
            const aB = a.SousBranche?.Branche?.nom || '';
            const bB = b.SousBranche?.Branche?.nom || '';
            if (aB !== bB) return aB.localeCompare(bB);
            const aSB = a.SousBranche?.nom || '';
            const bSB = b.SousBranche?.nom || '';
            return aSB.localeCompare(bSB);
        });

        setModules(processedModules);
        setLoadingModules(false);
    };

    // Handlers
    const handleSelectGroup = (group) => {
        setSelectedGroup(group);
        setSelectedStudent(null);
        setSelectedModule(null);
        setExpandedModuleId(null);
        setStep('students');
        fetchStudents(group.id);
    };

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setSelectedModule(null);
        setExpandedModuleId(null);
        setStep('modules');
        fetchModulesAndActivities(student.id, student.niveau_id);
    };

    const handleToggleModule = (module) => {
        if (expandedModuleId === module.id) {
            setExpandedModuleId(null);
        } else {
            setExpandedModuleId(module.id);
        }
    };

    const handleBack = () => {
        if (step === 'students') {
            setStep('groups');
            setSelectedGroup(null);
        } else if (step === 'modules') {
            setStep('students');
            setSelectedStudent(null);
            setExpandedModuleId(null);
        }
    };

    // Activity status update
    const handleUpdateStatus = async (activityId, newStatus) => {
        if (!selectedStudent) return;
        setSavingActivity(activityId);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Check if progression exists
            const { data: existing } = await supabase
                .from('Progression')
                .select('id')
                .eq('eleve_id', selectedStudent.id)
                .eq('activite_id', activityId)
                .maybeSingle();

            if (existing) {
                // Update
                await supabase
                    .from('Progression')
                    .update({
                        etat: newStatus,
                        updated_at: new Date().toISOString(),
                        user_id: user?.id
                    })
                    .eq('id', existing.id);
            } else {
                // Insert
                await supabase
                    .from('Progression')
                    .insert({
                        eleve_id: selectedStudent.id,
                        activite_id: activityId,
                        etat: newStatus,
                        user_id: user?.id
                    });
            }

            // Update local state
            setProgressions(prev => ({
                ...prev,
                [activityId]: newStatus
            }));

            // Also update module stats
            setModules(prev => prev.map(m => {
                const isInModule = m.filteredActivities?.some(a => a.id === activityId);
                if (!isInModule) return m;

                const newProgMap = { ...progressions, [activityId]: newStatus };
                const completedActivities = m.filteredActivities.filter(act =>
                    newProgMap[act.id] === 'termine' || newProgMap[act.id] === 'a_verifier'
                ).length;

                return {
                    ...m,
                    completedActivities,
                    percent: m.totalActivities > 0 ? Math.round((completedActivities / m.totalActivities) * 100) : 0
                };
            }));

            const statusLabels = {
                'a_commencer': 'À commencer',
                'en_cours': 'En cours',
                'termine': 'Terminé'
            };
            toast.success(statusLabels[newStatus] || 'Mis à jour');
        } catch (error) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setSavingActivity(null);
        }
    };

    // Get status display info
    const getStatusInfo = (status) => {
        switch (status) {
            case 'termine':
                return { color: 'bg-success', text: 'Terminé', icon: Check };
            case 'a_verifier':
                return { color: 'bg-[#8B5CF6]', text: 'À vérifier', icon: ShieldCheck };
            case 'en_cours':
                return { color: 'bg-primary', text: 'En cours', icon: Play };
            case 'besoin_d_aide':
                return { color: 'bg-[#A0A8AD]', text: 'Aide', icon: AlertCircle };
            default:
                return { color: 'bg-white/10', text: 'À faire', icon: null };
        }
    };

    // Render breadcrumb/header
    const renderHeader = () => (
        <header className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
                {step !== 'groups' && (
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-grey-medium hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}

                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-black text-white uppercase tracking-tight truncate">
                        {step === 'groups' && 'Sélectionner un groupe'}
                        {step === 'students' && selectedGroup?.nom}
                        {step === 'modules' && `${selectedStudent?.prenom} ${selectedStudent?.nom}`}
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] text-grey-medium font-bold uppercase tracking-wider">
                        {step === 'students' && <><Users size={10} /> Sélectionner un élève</>}
                        {step === 'modules' && <><BookOpen size={10} /> {selectedStudent?.Niveau?.nom || 'Tous niveaux'}</>}
                    </div>
                </div>

                {step !== 'groups' && (
                    <button
                        onClick={() => navigate('/mobile-dashboard')}
                        className="text-[10px] font-bold text-grey-medium uppercase tracking-wider hover:text-primary transition-colors"
                    >
                        Accueil
                    </button>
                )}
            </div>
        </header>
    );

    // Render groups list
    const renderGroups = () => (
        <div className="p-4 space-y-2">
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-20 text-grey-medium">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Aucun groupe disponible</p>
                </div>
            ) : (
                groups.map(group => (
                    <button
                        key={group.id}
                        onClick={() => handleSelectGroup(group)}
                        className="w-full flex items-center gap-4 bg-surface/50 border border-border p-4 rounded-xl hover:bg-surface hover:border-primary/30 transition-all text-left"
                    >
                        <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center text-primary border border-primary/10">
                            <Users size={22} />
                        </div>
                        <span className="text-sm font-bold text-white flex-1">{group.nom}</span>
                        <ChevronDown size={16} className="text-grey-medium -rotate-90" />
                    </button>
                ))
            )}
        </div>
    );

    // Render students list
    const renderStudents = () => (
        <div className="p-4 space-y-2">
            {loadingStudents ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : students.length === 0 ? (
                <div className="text-center py-20 text-grey-medium">
                    <User size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Aucun élève dans ce groupe</p>
                </div>
            ) : (
                students.map(student => (
                    <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className="w-full flex items-center gap-4 bg-surface/50 border border-border p-4 rounded-xl hover:bg-surface hover:border-primary/30 transition-all text-left"
                    >
                        <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/5 bg-surface-light shrink-0">
                            {student.photo_base64 ? (
                                <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-black text-primary">
                                    {getInitials(student)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-white block truncate">
                                {student.prenom} {student.nom}
                            </span>
                            <span className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">
                                {student.Niveau?.nom || 'Niveau non défini'}
                            </span>
                        </div>
                        <ChevronDown size={16} className="text-grey-medium -rotate-90" />
                    </button>
                ))
            )}
        </div>
    );

    // Render modules with expandable activities
    const renderModules = () => (
        <div className="p-4 space-y-3">
            {loadingModules ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : modules.length === 0 ? (
                <div className="text-center py-20 text-grey-medium">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Aucun module en cours</p>
                </div>
            ) : (
                modules.map(module => {
                    const isExpanded = expandedModuleId === module.id;
                    const branchName = module.SousBranche?.Branche?.nom || '';

                    return (
                        <div key={module.id} className="bg-surface/50 border border-border rounded-2xl overflow-hidden">
                            {/* Module Header */}
                            <button
                                onClick={() => handleToggleModule(module)}
                                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                            >
                                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary border border-primary/10 shrink-0">
                                    <BookOpen size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest truncate">
                                        {branchName} • {module.SousBranche?.nom}
                                    </p>
                                    <h3 className="text-sm font-bold text-white truncate">{module.nom}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${module.percent}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-grey-medium">
                                            {module.completedActivities}/{module.totalActivities}
                                        </span>
                                    </div>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp size={20} className="text-primary shrink-0" />
                                ) : (
                                    <ChevronDown size={20} className="text-grey-medium shrink-0" />
                                )}
                            </button>

                            {/* Activities List */}
                            {isExpanded && (
                                <div className="border-t border-white/5 p-3 space-y-2 bg-background/50">
                                    {module.filteredActivities?.map(activity => {
                                        const currentStatus = progressions[activity.id] || 'a_commencer';
                                        const statusInfo = getStatusInfo(currentStatus);
                                        const isSaving = savingActivity === activity.id;
                                        const materials = activity.ActiviteMateriel?.map(am => am.TypeMateriel?.acronyme).filter(Boolean) || [];

                                        return (
                                            <div
                                                key={activity.id}
                                                className="bg-surface/60 border border-white/5 rounded-xl p-3"
                                            >
                                                {/* Activity Info */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className={clsx(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                        statusInfo.color
                                                    )}>
                                                        {statusInfo.icon && <statusInfo.icon size={14} className="text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-white leading-tight">
                                                            {activity.titre}
                                                        </p>
                                                        {materials.length > 0 && (
                                                            <p className="text-[9px] text-grey-medium mt-0.5">
                                                                {materials.join(' • ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(activity.id, 'a_commencer')}
                                                        disabled={isSaving}
                                                        className={clsx(
                                                            "py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1",
                                                            currentStatus === 'a_commencer'
                                                                ? "bg-white/20 text-white border border-white/20"
                                                                : "bg-white/5 text-grey-medium border border-white/5 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                                        Reset
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(activity.id, 'en_cours')}
                                                        disabled={isSaving}
                                                        className={clsx(
                                                            "py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1",
                                                            currentStatus === 'en_cours'
                                                                ? "bg-primary text-black border border-primary"
                                                                : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                                                        )}
                                                    >
                                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                                        En cours
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(activity.id, 'termine')}
                                                        disabled={isSaving}
                                                        className={clsx(
                                                            "py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1",
                                                            currentStatus === 'termine'
                                                                ? "bg-success text-white border border-success"
                                                                : "bg-success/10 text-success border border-success/20 hover:bg-success/20"
                                                        )}
                                                    >
                                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        Fait
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-text-main font-sans flex flex-col">
            {renderHeader()}

            <main className="flex-1 overflow-y-auto">
                {step === 'groups' && renderGroups()}
                {step === 'students' && renderStudents()}
                {step === 'modules' && renderModules()}
            </main>
        </div>
    );
};

export default MobileEncodage;
