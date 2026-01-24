import React, { Dispatch, SetStateAction } from 'react';
import { Puzzle, Folder, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { useActivityRequirements } from '../hooks/useActivityRequirements';
import { ActivityWithRelations } from '../services/activityService';
import { Badge, Avatar, EmptyState } from '../../../components/ui';

interface ActivityDetailsProps {
    selectedActivity: ActivityWithRelations | null;
    setActivities: Dispatch<SetStateAction<ActivityWithRelations[]>>;
}

const ActivityDetails: React.FC<ActivityDetailsProps> = ({
    selectedActivity,
    setActivities
}) => {
    const { requirements, toggleStatus, updateRequirement } = useActivityRequirements(selectedActivity, setActivities);

    if (!selectedActivity) {
        return (
            <EmptyState
                icon={Puzzle}
                title="Sélectionnez une activité"
                description="Choisissez une activité dans la liste pour voir ses exigences et détails."
                size="lg"
                className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl"
            />
        );
    }

    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
            {/* Header Detail */}
            <div className="flex items-start justify-between border-b border-white/5 p-8 bg-surface/20">
                <div className="flex gap-6 items-center">
                    <Avatar
                        size="lg"
                        icon={Puzzle}
                        className="bg-surface border-4 border-background"
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-text-main mb-2">{selectedActivity.titre}</h1>
                        <div className="flex items-center gap-4 text-grey-medium">
                            {selectedActivity.Module && (
                                <Badge variant="secondary" size="sm" className="bg-white/5">
                                    <Folder size={14} className="mr-2" />
                                    {selectedActivity.Module.nom}
                                </Badge>
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
                                <div className="text-center">
                                    <input
                                        type="number"
                                        aria-label={`Nombre d'exercices pour ${req.label}`}
                                        className="w-16 bg-white/5 border border-white/10 text-center text-white hover:bg-white/10 rounded-lg focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all py-1 font-bold"
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
                                        className="w-16 bg-white/5 border border-white/10 text-center text-white hover:bg-white/10 rounded-lg focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all py-1 font-bold"
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
