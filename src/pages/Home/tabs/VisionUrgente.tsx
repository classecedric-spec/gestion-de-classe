import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Users, User, ChevronRight, ChevronDown,
    AlertCircle, CheckCircle2, Loader2, BookOpen
} from 'lucide-react';
import { DashboardContextType } from '../DashboardContext';
import { useGroupUrgentWork, UrgentStudent, UrgentModule, UrgentActivity } from '../../../features/dashboard/hooks/useGroupUrgentWork';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { toast } from 'react-hot-toast';
import { Badge } from '../../../core';

const VisionUrgente: React.FC = () => {
    const { groups, selectedGroup: globalSelectedGroup, user } = useOutletContext<DashboardContextType>();

    // Local filter state
    const [localGroupId, setLocalGroupId] = useState<string>(globalSelectedGroup?.id || '');

    // Custom hook for strict business logic
    // We pass user?.id as teacherId to support "All Groups" mode
    const { data: students, loading, refresh } = useGroupUrgentWork(localGroupId, user?.id);

    // State for accordions
    const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [validatingIds, setValidatingIds] = useState<Record<string, boolean>>({});

    const toggleStudent = (id: string) => {
        setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleModule = (id: string) => {
        setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleValidate = async (e: React.MouseEvent, progressionId: string) => {
        e.stopPropagation();
        setValidatingIds(prev => ({ ...prev, [progressionId]: true }));
        try {
            await trackingService.updateProgressionStatus(progressionId, 'termine');
            toast.success("Activité acquise !");
            refresh(); // Reload data after update
        } catch (err) {
            console.error(err);
            toast.error("Échec de la validation");
        } finally {
            setValidatingIds(prev => ({ ...prev, [progressionId]: false }));
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            {/* Header: Group Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/30 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Users size={20} />
                    </div>
                    <h1 className="text-lg font-black text-white uppercase tracking-tight">Filtre de Classe</h1>
                </div>
                <select
                    aria-label="Sélectionner un groupe"
                    value={localGroupId}
                    onChange={(e) => setLocalGroupId(e.target.value)}
                    className="bg-background/80 border border-white/10 text-xs text-white rounded-xl p-3 outline-none focus:border-primary transition-all cursor-pointer min-w-[200px]"
                >
                    <option value="">Tous les groupes</option>
                    {groups?.map(group => (
                        <option key={group.id} value={group.id}>{group.nom}</option>
                    ))}
                </select>
            </div>

            {/* Main Content */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Tableau de bord des urgences</h2>
                        <p className="text-[11px] text-grey-medium font-medium">Suivi des activités en retard par élève</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : students.length > 0 ? (
                    <div className="space-y-4">
                        {students.map((student: UrgentStudent) => (
                            <div
                                key={student.id}
                                className="bg-surface/50 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                            >
                                {/* Level 1: Student Header */}
                                <div
                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => toggleStudent(student.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="text-grey-medium" size={20} />
                                                )}
                                            </div>
                                            <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-background shadow-md">
                                                {student.totalOverdue}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-base leading-none mb-1 uppercase tracking-tight group-hover:text-primary transition-colors">
                                                {student.prenom} {student.nom}
                                            </h3>
                                            <p className="text-[9px] text-grey-medium font-bold uppercase tracking-widest">
                                                {student.modules.length} module(s) en attente
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/5 text-grey-medium transition-transform duration-300">
                                        {expandedStudents[student.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </div>
                                </div>

                                {/* Level 2: Modules (Expanded) */}
                                {expandedStudents[student.id] && (
                                    <div className="p-3 pt-0 space-y-2 bg-black/20 animate-in slide-in-from-top-2 duration-300">
                                        <div className="h-px bg-white/5 mb-3"></div>
                                        {student.modules.map((module: UrgentModule) => (
                                            <div key={module.id} className="border border-white/5 rounded-xl overflow-hidden bg-surface/30 group/module">
                                                <div
                                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                                    onClick={() => toggleModule(`${student.id}-${module.id}`)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner group-hover/module:scale-110 transition-transform">
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-[13px] font-black text-white uppercase tracking-tight block truncate">
                                                                {module.nom}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge variant="primary" size="xs" className="scale-90 origin-left opacity-80">
                                                                    {module.branchName}
                                                                </Badge>
                                                                <span className="text-[9px] font-bold text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded border border-rose-400/10">
                                                                    {new Date(module.date_fin).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="hidden sm:flex flex-col items-end">
                                                            <span className="text-[9px] font-black text-grey-medium uppercase tracking-widest">
                                                                {module.activities.length} Ateliers
                                                            </span>
                                                        </div>
                                                        <div className="p-1 rounded-lg bg-white/5 text-grey-medium">
                                                            {expandedModules[`${student.id}-${module.id}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Level 3: Activities inside Module */}
                                                {expandedModules[`${student.id}-${module.id}`] && (
                                                    <div className="p-3 pt-0 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                                        {module.activities.map((item: UrgentActivity) => (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-center justify-between p-3 bg-background/40 rounded-xl border border-white/5 hover:border-white/10 transition-all group/activity hover:translate-x-1"
                                                            >
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <p className="text-[13px] font-bold text-white tracking-tight truncate group-hover/activity:text-primary transition-colors">
                                                                        {item.Activite?.titre}
                                                                    </p>
                                                                    <p className="text-[9px] text-grey-medium uppercase tracking-[0.2em] font-black mt-0.5">
                                                                        {item.etat === 'besoin_d_aide' ? '⚠️ Aide' : '⏳ En cours'}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => handleValidate(e, item.id)}
                                                                    disabled={validatingIds[item.id]}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
                                                                >
                                                                    {validatingIds[item.id] ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <CheckCircle2 size={12} />
                                                                            <span>Acquis</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-20 bg-surface/30 border border-white/5 border-dashed rounded-[3rem] text-center text-grey-medium flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <p className="text-lg font-black text-white uppercase tracking-widest">Tout est à jour</p>
                            <p className="text-sm opacity-60">Aucun élève en retard sur ses activités actives.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisionUrgente;
