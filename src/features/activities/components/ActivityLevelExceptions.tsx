import React, { useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { Tables } from '../../../types/supabase';

/**
 * ActivityLevelExceptions
 * 
 * Gère l'affichage et l'ajout des exceptions par niveau.
 * Reçoit les données et les handlers depuis le parent (via useActivityForm).
 */

export interface ActivityLevel {
    id?: string;
    niveau_id: string;
    nom_niveau?: string;
    nombre_exercices: number | string;
    nombre_erreurs: number | string;
    statut_exigence: string;
}

interface ActivityLevelExceptionsProps {
    activityLevels: ActivityLevel[];
    allLevels: Tables<'Niveau'>[];
    onAdd: (levelId: string) => void;
    onRemove: (levelId: string) => void;
    onUpdate: (index: number, field: string, value: any) => void;
}

const ActivityLevelExceptions: React.FC<ActivityLevelExceptionsProps> = ({
    activityLevels,
    allLevels = [],
    onAdd,
    onRemove,
    onUpdate
}) => {
    // État local uniquement pour le select "Ajouter..."
    const [selectedLevelId, setSelectedLevelId] = useState("");

    const handleAddClick = (levelId: string) => {
        if (!levelId) return;
        // On délègue la logique métier au parent via onAdd
        onAdd(levelId);
        setSelectedLevelId(""); // Reset select
    };

    return (
        <div className="space-y-4 mb-6">
            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center">
                    <span className="px-6 bg-input text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 border border-white/10 rounded-full py-1">
                        Exceptions par Niveau
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <h5 className="text-xs font-bold text-white uppercase tracking-wide opacity-50">Personnalisation</h5>
                <div className="relative">
                    <select
                        onChange={(e) => handleAddClick(e.target.value)}
                        value={selectedLevelId}
                        className="bg-white/5 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20 rounded-lg py-1.5 px-3 outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/10 transition-colors"
                        title="Ajouter une exception pour un niveau"
                    >
                        <option value="" disabled>+ Ajouter une exception</option>
                        {allLevels
                            .filter(l => !activityLevels.find(al => al.niveau_id === l.id))
                            .map(level => (
                                <option key={level.id} value={level.id}>{level.nom}</option>
                            ))
                        }
                    </select>
                </div>
            </div>

            {activityLevels.length === 0 ? (
                <div className="bg-black/10 border border-dashed border-white/5 rounded-2xl py-10 text-center">
                    <p className="text-xs text-gray-500 italic">Aucune exigence spécifique configurée.</p>
                    <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tight">Utilise les exigences de base par défaut</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activityLevels.map((al, index) => (
                        <div key={al.niveau_id} className="bg-white/5 p-4 rounded-2xl border border-white/5 relative group animate-in slide-in-from-bottom-2 duration-300">
                            <button
                                type="button"
                                onClick={() => onRemove(al.niveau_id)}
                                className="absolute top-4 right-4 text-gray-600 hover:text-danger p-1 rounded transition-colors"
                                aria-label={`Supprimer l'exception pour le niveau ${al.nom_niveau}`}
                            >
                                <X size={14} />
                            </button>

                            <h6 className="text-[11px] font-black text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Niveau {al.nom_niveau}
                            </h6>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <label htmlFor={`ex_count_${index}`} className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Exercices</label>
                                    <input
                                        id={`ex_count_${index}`}
                                        type="number"
                                        value={al.nombre_exercices}
                                        onChange={(e) => onUpdate(index, 'nombre_exercices', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none"
                                        min="1"
                                        title="Nombre d'exercices"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor={`err_count_${index}`} className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Erreurs Max</label>
                                    <input
                                        id={`err_count_${index}`}
                                        type="number"
                                        value={al.nombre_erreurs}
                                        onChange={(e) => onUpdate(index, 'nombre_erreurs', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none"
                                        min="0"
                                        title="Nombre d'erreurs maximum"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {(['obligatoire', 'facultatif'] as const).map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => onUpdate(index, 'statut_exigence', status)}
                                        className={clsx(
                                            "flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all tracking-wider",
                                            al.statut_exigence === status
                                                ? (status === 'obligatoire' ? "bg-success text-text-dark border-success" : "bg-danger text-white border-danger")
                                                : "border-white/5 text-gray-600 hover:border-white/10"
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityLevelExceptions;
