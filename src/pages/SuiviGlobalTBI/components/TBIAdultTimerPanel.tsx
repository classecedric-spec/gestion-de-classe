import React from 'react';
import { Plus, Trash2, User, X, Clock, Pause, RotateCcw } from 'lucide-react';

interface TBIAdultTimerPanelProps {
    allAdults: any[];
    activeAdults: any[];
    adultActivities: any[];
    availableActivityTypes: any[];
    showTaskSelectorFor: string | null;
    setShowTaskSelectorFor: (id: string | null) => void;
    onAddAdult: (id: string) => void;
    onRemoveAdult: (id: string) => void;
    onAddTaskEntry: (adultId: string, typeId: string) => void;
    onDeleteTaskEntry: (entryId: string) => void;
    // Timer
    timerMinutes: number;
    setTimerMinutes: (min: number) => void;
    timerSeconds: number;
    setTimerSeconds: (sec: number) => void;
    timerActive: boolean;
    timeLeft: number;
    showTimerConfig: boolean;
    setShowTimerConfig: (show: boolean) => void;
    startTimer: () => void;
    stopTimer: () => void;
    resetTimer: () => void;
    formatTime: (time: number) => string;
}

export const TBIAdultTimerPanel: React.FC<TBIAdultTimerPanelProps> = ({
    allAdults,
    activeAdults,
    adultActivities,
    availableActivityTypes,
    showTaskSelectorFor,
    setShowTaskSelectorFor,
    onAddAdult,
    onRemoveAdult,
    onAddTaskEntry,
    onDeleteTaskEntry,
    timerMinutes,
    setTimerMinutes,
    timerSeconds,
    setTimerSeconds,
    timerActive,
    timeLeft,
    showTimerConfig,
    setShowTimerConfig,
    startTimer,
    stopTimer,
    resetTimer,
    formatTime
}) => {
    return (
        <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
            {showTaskSelectorFor && (
                <div className="absolute inset-0 z-50 bg-background/95 p-2 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-primary italic">Choisir une tâche</span>
                        <button onClick={() => setShowTaskSelectorFor(null)} className="p-1 hover:bg-white/10 rounded" title="Fermer la sélection">
                            <X size={14} className="text-white" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1 content-start">
                        {availableActivityTypes.map(type => (
                            <button
                                key={type.id}
                                onClick={() => onAddTaskEntry(showTaskSelectorFor, type.id)}
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
                    onChange={(e) => onAddAdult(e.target.value)}
                    className="w-full bg-surface border border-white/10 text-white rounded-md py-1 px-2 text-[9px] font-bold"
                    title="Ajouter un adulte"
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
                                    <button onClick={() => setShowTaskSelectorFor(adult.id)} className="p-1 bg-primary/20 text-primary rounded hover:bg-primary/30" title="Ajouter une tâche">
                                        <Plus size={10} />
                                    </button>
                                    <button onClick={() => onRemoveAdult(adult.id)} className="p-1 hover:bg-white/10 text-grey-medium rounded" title="Retirer l'adulte">
                                        <X size={10} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-1 space-y-1">
                                {thisAdultActivities.map(activity => (
                                    <div key={activity.id} className="group flex items-center justify-between gap-1 p-1 bg-black/20 rounded border border-white/5">
                                        <div className="text-[8px] font-bold text-primary truncate leading-tight">{activity.TypeActiviteAdulte?.label}</div>
                                        <button onClick={() => onDeleteTaskEntry(activity.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-danger hover:bg-danger/10 rounded transition-opacity" title="Supprimer la tâche">
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
                            <button onClick={resetTimer} className="px-2 bg-white/10 text-white rounded py-1 text-[9px] font-bold hover:bg-white/20" title="Réinitialiser le timer">
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
    );
};
