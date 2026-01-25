import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, User, ChevronRight, ChevronDown,
    AlertCircle, CheckCircle2, Loader2, BookOpen, Clock
} from 'lucide-react';
import { useGroupUrgentWork, UrgentStudent, UrgentModule, UrgentActivity } from '../features/dashboard/hooks/useGroupUrgentWork';
import { trackingService } from '../features/tracking/services/trackingService';
import { toast } from 'react-hot-toast';
import { Badge } from '../components/ui';

const MobileVisionUrgente: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();

    // Custom hook for strict business logic
    const { data: students, loading, refresh } = useGroupUrgentWork(groupId || null);

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
            refresh();
        } catch (err) {
            console.error(err);
            toast.error("Échec de la validation");
        } finally {
            setValidatingIds(prev => ({ ...prev, [progressionId]: false }));
        }
    };

    return (
        <div className="min-h-screen bg-background text-white flex flex-col font-sans select-none">
            {/* Mobile Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    title="Retour"
                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-grey-medium active:scale-95 transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-lg font-black uppercase tracking-tighter text-primary leading-none">Vision Urgente</h1>
                    <p className="text-[10px] text-grey-medium font-bold uppercase mt-1 tracking-widest">Retards critiques</p>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4 pb-20 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Analyse des retards...</p>
                    </div>
                ) : students.length > 0 ? (
                    <div className="space-y-3">
                        {students.map((student: UrgentStudent) => (
                            <div
                                key={student.id}
                                className="bg-surface/40 border border-white/5 rounded-2xl overflow-hidden"
                            >
                                {/* Level 1: Student row */}
                                <div
                                    className="p-4 flex items-center justify-between active:bg-white/5 transition-colors"
                                    onClick={() => toggleStudent(student.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="text-grey-medium" size={24} />
                                                )}
                                            </div>
                                            <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-background shadow-md">
                                                {student.totalOverdue}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-base leading-none mb-1 uppercase tracking-tight">
                                                {student.prenom} {student.nom}
                                            </h3>
                                            <p className="text-[9px] text-grey-medium font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                <Clock size={10} /> {student.modules.length} module(s)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-1 text-grey-medium">
                                        {expandedStudents[student.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </div>
                                </div>

                                {/* Level 2: Modules list */}
                                {expandedStudents[student.id] && (
                                    <div className="px-3 pb-3 space-y-2 bg-black/20">
                                        {student.modules.map((module: UrgentModule) => (
                                            <div key={module.id} className="border border-white/5 rounded-xl overflow-hidden bg-surface/30">
                                                <div
                                                    className="p-3 flex items-center justify-between active:bg-white/5 transition-colors"
                                                    onClick={() => toggleModule(`${student.id}-${module.id}`)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-xs font-black text-white uppercase tracking-tight block truncate">
                                                                {module.nom}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge variant="primary" size="xs" className="scale-90 origin-left opacity-70">
                                                                    {module.branchName}
                                                                </Badge>
                                                                <span className="text-[9px] font-bold text-rose-400">
                                                                    {new Date(module.date_fin).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-1 text-grey-medium">
                                                        {expandedModules[`${student.id}-${module.id}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </div>
                                                </div>

                                                {/* Level 3: Activities list */}
                                                {expandedModules[`${student.id}-${module.id}`] && (
                                                    <div className="p-3 pt-0 space-y-2">
                                                        {module.activities.map((item: UrgentActivity) => (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-white/5 active:scale-[0.98] transition-all"
                                                            >
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <p className="text-[13px] font-bold text-white tracking-tight leading-tight mb-1">
                                                                        {item.Activite?.titre}
                                                                    </p>
                                                                    <p className="text-[9px] text-grey-medium uppercase tracking-widest font-black">
                                                                        {item.etat === 'besoin_d_aide' ? '⚠️ Aide' : '⏳ En cours'}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => handleValidate(e, item.id)}
                                                                    disabled={validatingIds[item.id]}
                                                                    title="Marquer comme acquis"
                                                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-90 transition-all"
                                                                >
                                                                    {validatingIds[item.id] ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <CheckCircle2 size={14} />
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
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5 mb-4">
                            <CheckCircle2 size={32} className="text-primary" />
                        </div>
                        <p className="text-xs font-black text-white uppercase tracking-widest">Tout est à jour</p>
                        <p className="text-[10px] text-grey-medium font-bold mt-1">Aucun retard détecté pour ce groupe.</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-background/80 backdrop-blur-sm border-t border-white/5 text-center">
                <p className="text-[9px] font-bold text-grey-dark uppercase tracking-[0.2em]">Système de Surveillance des Retards</p>
            </div>
        </div>
    );
};

export default MobileVisionUrgente;
