/**
 * Nom du module/fichier : ActivityDetails.tsx
 * 
 * Données en entrée : L'activité sélectionnée (`selectedActivity`) et la fonction pour mettre à jour la liste des activités (`setActivities`).
 * 
 * Données en sortie : Un tableau interactif permettant de modifier les objectifs par niveau.
 * 
 * Objectif principal : Afficher et permettre la modification rapide des critères de réussite (nombre d'exercices, erreurs maximum, statut obligatoire/facultatif) pour chaque niveau scolaire associé à une activité. C'est l'interface directe pour l'enseignant pour ajuster la difficulté.
 * 
 * Ce que ça affiche : Un titre "Objectifs par niveau" suivi d'un tableau avec des colonnes pour le nom du niveau, le nombre d'exercices, le nombre d'erreurs max et un bouton de statut coloré.
 */

import React, { Dispatch, SetStateAction } from 'react';
import { CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { useActivityRequirements } from '../hooks/useActivityRequirements';
import { ActivityWithRelations } from '../services/activityService';

interface ActivityDetailsProps {
    selectedActivity: ActivityWithRelations | null;
    setActivities: Dispatch<SetStateAction<ActivityWithRelations[]>>;
}

/**
 * Composant d'affichage détaillé pour les objectifs d'un atelier.
 */
const ActivityDetails: React.FC<ActivityDetailsProps> = ({
    selectedActivity,
    setActivities
}) => {
    // On utilise le Hook dédié pour gérer toute la logique métier de modification des exigences
    const { requirements, toggleStatus, updateRequirement } = useActivityRequirements(selectedActivity, setActivities);

    // Si aucune activité n'est sélectionnée (ex: au démarrage), on n'affiche rien du tout
    if (!selectedActivity) return null;

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative p-6">
            {/* Titre de la section avec icône */}
            <h3 className="text-xs font-black text-white/40 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
                <CheckCircle size={14} className="text-primary" />
                Objectifs par niveau
            </h3>

            {/* Conteneur du tableau des objectifs */}
            <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-black/10 shadow-inner">
                {/* En-tête du tableau : définit les colonnes de données */}
                <div className="grid grid-cols-4 gap-4 p-3 bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <div className="col-span-1">Niveau</div>
                    <div className="text-center">Exercices</div>
                    <div className="text-center">Erreurs Max</div>
                    <div className="text-center">Statut</div>
                </div>

                {/* Corps du tableau : une ligne par niveau scolaire configuré */}
                <div className="divide-y divide-white/5">
                    {requirements.map((req) => (
                        <div key={req.id} className="grid grid-cols-4 gap-4 p-3 items-center transition-colors hover:bg-white/5">
                            {/* Colonne 1 : Nom du niveau (ex: PS, MS, GS) */}
                            <div className="col-span-1 font-bold text-sm text-white flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                {req.label}
                            </div>

                            {/* Colonne 2 : Nombre d'exercices à réussir */}
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

                            {/* Colonne 3 : Nombre d'erreurs maximum permises */}
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

                            {/* Colonne 4 : Bouton pour changer le statut (Obligatoire / Facultatif) */}
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur une activité dans sa liste d'ateliers.
 * 2. Le composant `ActivityDetails` reçoit les informations de cet atelier.
 * 3. Il récupère la liste des exigences paramétrées (ex: GS -> 5 exercices, MS -> 3 exercices).
 * 4. Il affiche un tableau interactif :
 *    - Pour chaque niveau, il présente des champs de saisie pour modifier les quantités.
 *    - Il affiche un bouton coloré pour le statut (Vert = Obligatoire, Rouge = Facultatif).
 * 5. Si l'enseignant change une valeur (ex: il tape '6' exercices) :
 *    - Le système met à jour l'écran immédiatement.
 *    - Le système enregistre le changement en base de données en arrière-plan.
 */
