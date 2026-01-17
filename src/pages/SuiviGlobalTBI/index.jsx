import React, { useState, useEffect } from 'react';
import { getInitials } from '../../lib/utils';
import { getStatusStyle as getStatusStyleBase, getStatusIcon } from '../../lib/statusHelpers';
import {
    Users, Check, Clock, ShieldCheck, ChevronDown, User, ArrowLeft, Play, Pause, RotateCcw,
    Plus, Trash2, X
} from 'lucide-react';
import clsx from 'clsx';
import { useUpdateProgression } from '../../hooks/useUpdateProgression';

import { useTBIData } from './hooks/useTBIData';
import { useAdultTracking, useTimer } from './hooks/useAdultTimer';

/**
 * Suivi Global TBI - Optimisé pour Tableau Blanc Interactif
 * Résolution: 960x540 pixels, Mode Paysage
 */
const SuiviGlobalTBI = () => {
    const { updateProgression } = useUpdateProgression();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Hooks
    const {
        groups, selectedGroupId, setSelectedGroupId,
        students, selectedStudent,
        modules, selectedModule,
        activities, progressions, setProgressions,
        view, helpRequests,
        handleStudentClick, handleModuleClick, handleBackToStudents,
        handleHelpStatusClick, fetchHelpRequests
    } = useTBIData();

    const {
        allAdults, activeAdults, adultActivities, availableActivityTypes,
        showTaskSelectorFor, setShowTaskSelectorFor,
        handleAddAdultToView, handleRemoveAdultFromView, handleAddTaskEntry, handleDeleteTaskEntry
    } = useAdultTracking();

    const {
        timerMinutes, setTimerMinutes, timerSeconds, setTimerSeconds,
        timerActive, timeLeft, showTimerConfig, setShowTimerConfig,
        startTimer, stopTimer, resetTimer, formatTime
    } = useTimer();

    // Time update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // Status handlers
    const handleStatusClick = async (activityId, currentStatus) => {
        if (!selectedStudent) return;
        await updateProgression(selectedStudent.id, activityId, currentStatus, setProgressions, fetchHelpRequests);
    };

    const getStatusStyle = (status) => {
        const style = getStatusStyleBase(status);
        switch (status) {
            case 'termine': return `${style} text-white`;
            case 'a_verifier': return `${style} text-white`;
            case 'besoin_d_aide': return `${style} text-white`;
            case 'ajustement': return `${style} text-black`;
            case 'a_domicile': return `${style} text-white`;
            default: return `${style} text-grey-medium border border-white/20`;
        }
    };

    return (
        <div className="h-screen w-screen bg-background flex flex-col overflow-hidden" style={{ maxWidth: '960px', maxHeight: '540px' }}>
            {/* HEADER */}
            <div className="bg-surface/80 border-b border-white/10 px-2 py-1 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Users className="text-primary" size={12} />
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="bg-background border border-white/10 text-white rounded-md py-0.5 px-2 appearance-none text-[10px] font-bold"
                    >
                        <option value="">Groupe...</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                    </select>
                </div>

                {selectedStudent && (
                    <div className="text-[11px] font-bold text-primary">
                        {selectedStudent.prenom} {selectedStudent.nom}
                    </div>
                )}

                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-md">
                    <Clock size={10} className="text-primary" />
                    <span className="text-[11px] font-black text-white font-mono">
                        {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* MAIN - 3 Columns */}
            <div className="flex-1 flex overflow-hidden">
                {/* COL 1: Navigation (40%) */}
                <div className="bg-surface border-r border-white/10 flex flex-col overflow-hidden" style={{ width: '40%' }}>
                    {view === 'students' && (
                        <>
                            <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                                    Élèves ({students.length})
                                </span>
                            </div>
                            <div className="flex-1 overflow-hidden p-1">
                                <div
                                    className="grid gap-1 h-full content-start justify-center"
                                    style={{
                                        gridTemplateColumns: `repeat(${students.length <= 6 ? 3 : students.length <= 12 ? 4 : students.length <= 20 ? 5 : students.length <= 28 ? 6 : 8}, 1fr)`
                                    }}
                                >
                                    {students.map(student => {
                                        const photoSize = students.length <= 6 ? '70px' : students.length <= 12 ? '60px' : students.length <= 20 ? '54px' : students.length <= 28 ? '48px' : '42px';
                                        const fontSize = students.length <= 6 ? '10px' : students.length <= 12 ? '9px' : '8px';

                                        return (
                                            <button
                                                key={student.id}
                                                onClick={() => handleStudentClick(student)}
                                                className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-white/5 transition-all w-full"
                                            >
                                                <div className="rounded-full overflow-hidden bg-white/10 shrink-0" style={{ width: photoSize, height: photoSize }}>
                                                    {student.photo_base64 ? (
                                                        <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-primary" style={{ fontSize: `calc(${photoSize} * 0.3)` }}>
                                                            {getInitials(student)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-bold text-white text-center leading-tight line-clamp-1 w-full" style={{ fontSize }}>
                                                    {student.prenom}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {view === 'modules' && (
                        <>
                            <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center justify-between">
                                <button onClick={handleBackToStudents} className="flex items-center gap-1 text-primary hover:text-white transition-colors">
                                    <ArrowLeft size={12} />
                                    <span className="text-[8px] font-bold">Retour</span>
                                </button>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Modules</span>
                            </div>
                            <div className="p-2">
                                {selectedStudent && (
                                    <div className="mb-2 p-2 bg-white/5 rounded-lg">
                                        <div className="text-[14px] font-bold text-white leading-tight">{selectedStudent.prenom} {selectedStudent.nom}</div>
                                        <div className="text-[10px] text-grey-medium mt-0.5">{selectedStudent.Niveau?.nom}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                                {modules.map(module => {
                                    const isExpanded = selectedModule?.id === module.id;
                                    return (
                                        <div key={module.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                            <button onClick={() => handleModuleClick(module)} className="w-full p-2 text-left hover:bg-white/5 transition-all">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className={clsx("text-[10px] font-bold line-clamp-1 leading-tight flex-1", isExpanded ? "text-primary" : "text-white")}>
                                                        {module.nom}
                                                    </div>
                                                    <ChevronDown size={12} className={clsx("transition-transform ml-1 shrink-0", isExpanded ? "rotate-180 text-primary" : "text-grey-medium")} />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-success" style={{ width: `${module.percent}%` }} />
                                                    </div>
                                                    <span className="text-[8px] text-grey-medium">{module.completed}/{module.total}</span>
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="px-2 pb-2 space-y-1 border-t border-white/5 pt-1">
                                                    {activities.length === 0 ? (
                                                        <div className="text-[8px] text-grey-medium text-center py-2">Chargement...</div>
                                                    ) : (
                                                        activities.map(activity => {
                                                            const status = progressions[activity.id] || 'a_commencer';
                                                            return (
                                                                <div key={activity.id} className="p-1.5 bg-white/[0.03] rounded-md border border-white/5">
                                                                    <div className="text-[9px] font-semibold text-white mb-1 leading-tight">{activity.titre}</div>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => handleStatusClick(activity.id, 'a_commencer')}
                                                                            className={clsx(
                                                                                "flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border",
                                                                                status === 'a_commencer' ? "bg-primary text-black border-primary" : "bg-black/20 border-white/5 text-grey-medium hover:border-primary/40"
                                                                            )}
                                                                        >A.C.</button>
                                                                        <button
                                                                            onClick={() => handleStatusClick(activity.id, 'besoin_d_aide')}
                                                                            className={clsx(
                                                                                "flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border",
                                                                                status === 'besoin_d_aide' ? "bg-gray-400 text-white border-gray-400" : "bg-black/20 border-white/5 text-grey-medium hover:border-gray-400/40"
                                                                            )}
                                                                        >Aide</button>
                                                                        <button
                                                                            onClick={() => handleStatusClick(activity.id, 'termine')}
                                                                            className={clsx(
                                                                                "flex-[1.5] py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-0.5",
                                                                                (status === 'termine' || status === 'a_verifier')
                                                                                    ? (status === 'a_verifier' ? "bg-violet-500 text-white border-violet-500" : "bg-success text-white border-success")
                                                                                    : "bg-black/20 border-white/5 text-grey-medium hover:border-success/40"
                                                                            )}
                                                                        >
                                                                            {status === 'a_verifier' ? <><ShieldCheck size={8} /><span>Verif</span></> : <><Check size={8} /><span>OK</span></>}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* COL 2: Help Requests (40%) */}
                <div className="bg-surface/50 border-r border-white/10 flex flex-col overflow-hidden" style={{ width: '40%' }}>
                    <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                            Demandes d'aide ({helpRequests.length})
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1">
                        {helpRequests.map(request => (
                            <div key={request.id} className="mb-1 bg-white/5 rounded-lg p-2 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0 px-1">
                                        <div className="text-[10px] font-bold text-white truncate">{request.eleve?.prenom} {request.eleve?.nom}</div>
                                        <div className="text-[8px] text-primary/80 truncate">
                                            {request.activite?.Module?.nom ? `${request.activite.Module.nom} • ` : ''}
                                            {request.activite?.titre || "Suivi personnalisé"}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleHelpStatusClick(request.id)}
                                        className={clsx(
                                            "px-2 py-1 rounded text-[9px] font-bold shrink-0 hover:opacity-80",
                                            request.etat === 'besoin_d_aide' ? "bg-gray-400 text-white" : "bg-violet-500 text-white"
                                        )}
                                    >OK</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COL 3: Adult + Timer (20%) */}
                <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
                    {showTaskSelectorFor && (
                        <div className="absolute inset-0 z-50 bg-background/95 p-2 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-primary italic">Choisir une tâche</span>
                                <button onClick={() => setShowTaskSelectorFor(null)} className="p-1 hover:bg-white/10 rounded">
                                    <X size={14} className="text-white" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1 content-start">
                                {availableActivityTypes.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleAddTaskEntry(showTaskSelectorFor, type.id)}
                                        className="p-2 bg-white/5 border border-white/10 rounded hover:bg-primary/20 hover:border-primary/40 transition-all text-left"
                                    >
                                        <div className="text-[9px] font-bold text-white leading-tight">{type.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Adultes</span>
                    </div>
                    <div className="p-1 shrink-0 border-b border-white/5">
                        <select
                            value=""
                            onChange={(e) => handleAddAdultToView(e.target.value)}
                            className="w-full bg-surface border border-white/10 text-white rounded-md py-1 px-2 text-[9px] font-bold"
                        >
                            <option value="">+ Ajouter un adulte...</option>
                            {allAdults.map(adult => <option key={adult.id} value={adult.id}>{adult.prenom} {adult.nom}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-1 space-y-2">
                        {activeAdults.map(adult => {
                            const thisAdultActivities = adultActivities.filter(aa => aa.adulte_id === adult.id);
                            return (
                                <div key={adult.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                    <div className="p-1.5 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                        <div className="text-[10px] font-bold text-white truncate">{adult.prenom}</div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setShowTaskSelectorFor(adult.id)} className="p-1 bg-primary/20 text-primary rounded hover:bg-primary/30">
                                                <Plus size={10} />
                                            </button>
                                            <button onClick={() => handleRemoveAdultFromView(adult.id)} className="p-1 hover:bg-white/10 text-grey-medium rounded">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-1 space-y-1">
                                        {thisAdultActivities.map(activity => (
                                            <div key={activity.id} className="group flex items-center justify-between gap-1 p-1 bg-black/20 rounded border border-white/5">
                                                <div className="text-[8px] font-bold text-primary truncate leading-tight">{activity.TypeActiviteAdulte?.label}</div>
                                                <button onClick={() => handleDeleteTaskEntry(activity.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-danger hover:bg-danger/10 rounded transition-opacity">
                                                    <Trash2 size={8} />
                                                </button>
                                            </div>
                                        ))}
                                        {thisAdultActivities.length === 0 && <div className="text-[7px] text-grey-medium text-center py-1">Pas de tâches</div>}
                                    </div>
                                </div>
                            );
                        })}
                        {activeAdults.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 py-8">
                                <User size={24} className="text-grey-medium mb-1" />
                                <span className="text-[9px] font-bold text-grey-medium">Aucun adulte sélectionné</span>
                            </div>
                        )}
                    </div>

                    {/* Timer */}
                    <div className="border-t border-white/10 p-2 bg-surface/50 shrink-0">
                        {showTimerConfig ? (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    <input type="number" min="0" max="59" value={timerMinutes} onChange={(e) => setTimerMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="flex-1 bg-background border border-white/10 text-white rounded px-1 py-0.5 text-[10px] text-center" placeholder="Min" />
                                    <span className="text-white text-[10px] self-center">:</span>
                                    <input type="number" min="0" max="59" value={timerSeconds} onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="flex-1 bg-background border border-white/10 text-white rounded px-1 py-0.5 text-[10px] text-center" placeholder="Sec" />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={startTimer} className="flex-1 bg-primary text-black rounded py-1 text-[9px] font-bold hover:bg-primary/90">Démarrer</button>
                                    <button onClick={() => setShowTimerConfig(false)} className="px-2 bg-white/10 text-white rounded py-1 text-[9px] font-bold hover:bg-white/20">✕</button>
                                </div>
                            </div>
                        ) : timerActive ? (
                            <div className="space-y-1">
                                <div className="text-center text-[18px] font-black text-primary font-mono leading-none py-1">{formatTime(timeLeft)}</div>
                                <div className="flex gap-1">
                                    <button onClick={stopTimer} className="flex-1 bg-white/10 text-white rounded py-1 text-[9px] font-bold hover:bg-white/20 flex items-center justify-center gap-1">
                                        <Pause size={10} /> Pause
                                    </button>
                                    <button onClick={resetTimer} className="px-2 bg-white/10 text-white rounded py-1 text-[9px] font-bold hover:bg-white/20">
                                        <RotateCcw size={10} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setShowTimerConfig(true)} className="w-full bg-primary/20 border border-primary/30 text-primary rounded py-1.5 text-[10px] font-bold hover:bg-primary/30 flex items-center justify-center gap-1">
                                <Clock size={12} /> Timer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuiviGlobalTBI;
