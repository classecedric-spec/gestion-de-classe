import React, { Dispatch, SetStateAction } from 'react';
import { CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { useActivityRequirements } from '../hooks/useActivityRequirements';
import { ActivityWithRelations } from '../services/activityService';

interface ActivityDetailsProps {
    selectedActivity: ActivityWithRelations | null;
    setActivities: Dispatch<SetStateAction<ActivityWithRelations[]>>;
}

const ActivityDetails: React.FC<ActivityDetailsProps> = ({
    selectedActivity,
    setActivities
}) => {
    const { requirements, toggleStatus, updateRequirement } = useActivityRequirements(selectedActivity, setActivities);

    if (!selectedActivity) return null;

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative p-6">
            {/* Objectives Table Header */}
            <h3 className="text-xs font-black text-white/40 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
                <CheckCircle size={14} className="text-primary" />
                Objectifs par niveau
            </h3>

            <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-black/10 shadow-inner">
                <div className="grid grid-cols-4 gap-4 p-3 bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <div className="col-span-1">Niveau</div>
                    <div className="text-center">Exercices</div>
                    <div className="text-center">Erreurs Max</div>
                    <div className="text-center">Statut</div>
                </div>

                <div className="divide-y divide-white/5">
                    {requirements.map((req) => (
                        <div key={req.id} className="grid grid-cols-4 gap-4 p-3 items-center transition-colors hover:bg-white/5">
                            <div className="col-span-1 font-bold text-sm text-white flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                {req.label}
                            </div>
                            <div className="text-center">
                                <input
                                    type="number"
                                    aria-label={`Nombre d'exercices pour ${req.label}`}
                                    className="w-14 bg-black/20 border border-white/10 text-center text-white text-xs hover:bg-black/40 rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all py-1.5 font-bold"
                                    value={req.nbExercises}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        updateRequirement(req, 'nombre_exercices', val);
                                    }}
                                />
                            </div>

                            <div className="text-center">
                                <input
                                    type="number"
                                    aria-label={`Nombre d'erreurs maximum pour ${req.label}`}
                                    className="w-14 bg-black/20 border border-white/10 text-center text-white text-xs hover:bg-black/40 rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all py-1.5 font-bold"
                                    value={req.nbErrors}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        updateRequirement(req, 'nombre_erreurs', val);
                                    }}
                                />
                            </div>

                            <div className="text-center flex justify-center">
                                <button
                                    onClick={() => toggleStatus(req)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider",
                                        req.status === 'obligatoire'
                                            ? "bg-success text-text-dark"
                                            : "bg-danger text-white"
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
    );
};

export default ActivityDetails;
