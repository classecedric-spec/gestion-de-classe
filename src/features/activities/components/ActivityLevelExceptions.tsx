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
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Objectifs par Niveau</h4>
                <div className="relative">
                    <select
                        onChange={(e) => handleAddClick(e.target.value)}
                        value={selectedLevelId}
                        className="bg-white/5 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20 rounded-lg py-1.5 px-3 outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/10 transition-colors"
                        title="Ajouter un objectif pour un niveau"
                    >
                        <option value="" disabled>+ Ajouter un objectif</option>
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
                    <p className="text-xs text-gray-500 italic">Aucun objectif défini pour le moment.</p>
                    <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tight">Veuillez ajouter au moins un objectif pour cette activité</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activityLevels.map((al, index) => (
                        <div key={al.niveau_id} className="bg-white/5 p-3 rounded-2xl border border-white/5 relative group animate-in slide-in-from-right-2 duration-300">
                            <button
                                type="button"
                                onClick={() => onRemove(al.niveau_id)}
                                className="absolute top-3 right-3 text-gray-600 hover:text-danger p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                aria-label={`Supprimer l'objectif pour le niveau ${al.nom_niveau}`}
                            >
                                <X size={14} />
                            </button>

                            <div className="flex flex-col gap-3">
                                {/* Ligne 1 : Titre Niveau + Toggle Statut */}
                                <div className="flex items-center justify-between">
                                    <h6 className="text-[11px] font-black text-primary flex items-center gap-2 uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                        {al.nom_niveau}
                                    </h6>

                                    <div className="flex w-40 sm:w-48 bg-black/20 rounded-lg p-0.5 border border-white/5 h-7 sm:h-8">
                                        {(['obligatoire', 'facultatif'] as const).map(status => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => onUpdate(index, 'statut_exigence', status)}
                                                className={clsx(
                                                    "flex-1 px-3 text-[9px] font-black uppercase rounded-md transition-all tracking-wider",
                                                    al.statut_exigence === status
                                                        ? (status === 'obligatoire' ? "bg-success text-text-dark" : "bg-danger text-white")
                                                        : "text-gray-600 hover:text-white"
                                                )}
                                            >
                                                {status === 'obligatoire' ? 'OBLI' : 'FACUL'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Ligne 2 : Inputs (Exercices / Erreurs) */}
                                <div className="grid grid-cols-2 gap-4 bg-black/10 p-2 rounded-lg border border-white/5">
                                    <div className="flex items-center justify-between gap-2">
                                        <label htmlFor={`ex_count_${index}`} className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter shrink-0">Exercices</label>
                                        <input
                                            id={`ex_count_${index}`}
                                            type="number"
                                            value={al.nombre_exercices}
                                            onChange={(e) => onUpdate(index, 'nombre_exercices', e.target.value)}
                                            className="w-16 bg-black/20 border border-white/10 rounded-md px-2 py-1 text-xs text-center text-white focus:border-primary outline-none focus:bg-black/40 transition-all font-bold"
                                            min="1"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-l border-white/5 pl-4">
                                        <label htmlFor={`err_count_${index}`} className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter shrink-0">Erreurs Max</label>
                                        <input
                                            id={`err_count_${index}`}
                                            type="number"
                                            value={al.nombre_erreurs}
                                            onChange={(e) => onUpdate(index, 'nombre_erreurs', e.target.value)}
                                            className="w-16 bg-black/20 border border-white/10 rounded-md px-2 py-1 text-xs text-center text-white focus:border-primary outline-none focus:bg-black/40 transition-all font-bold"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityLevelExceptions;
