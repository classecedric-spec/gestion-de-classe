import React from 'react';
import { Puzzle, Folder, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { useActivityRequirements } from '../hooks/useActivityRequirements';

const ActivityDetails = ({
    selectedActivity,
    setActivities // Needed for optimistic updates within the hook
}) => {
    const { requirements, updateRequirement, toggleStatus } = useActivityRequirements(selectedActivity, setActivities);

    if (!selectedActivity) {
        return (
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative items-center justify-center text-grey-medium">
                <Puzzle size={64} className="mb-4 opacity-50" />
                <p className="text-xl">Sélectionnez une activité pour voir les détails</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
            {/* Header Detail */}
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
            </div>

            {/* Requirements Table */}
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
                        {requirements.map((req) => (
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
                                            updateRequirement(req, 'nombre_exercices', val);
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
                                            updateRequirement(req, 'nombre_erreurs', val);
                                        }}
                                    />
                                </div>

                                {/* Toggable Status */}
                                <div className="text-center flex justify-center">
                                    <button
                                        onClick={() => toggleStatus(req)}
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
        </div>
    );
};

export default ActivityDetails;
