/**
 * Nom du module/fichier : ProgressionCell.tsx
 * 
 * Données en entrée : 
 *   - `activity` : Les détails de l'exercice (titre, matériel nécessaire, niveaux autorisés).
 *   - `currentStatus` : L'état actuel de réussite de l'élève sur cet exercice (ex: 'en_cours', 'termine').
 *   - `onStatusClick` : Fonction déclenchée quand l'enseignant change le statut.
 * 
 * Données en sortie : 
 *   - Une petite carte interactive (cellule) représentant un exercice unique pour un élève.
 * 
 * Objectif principal : Être l'unité de base du suivi. Chaque "case" permet à l'enseignant de voir si l'élève a besoin d'aide, s'il fait des erreurs récurrentes (ajustement), ou s'il a terminé. C'est l'interface directe pour "Valider" le travail d'un enfant en un clic.
 * 
 * Ce que ça affiche : 
 *   - Le nom de l'exercice.
 *   - Trois boutons d'action rapide : "Aide", "Ajustement" (orange), et "Valider" (vert/violet).
 *   - Un mode spécial "À vérifier" (violet) si l'élève a fini sur sa tablette et attend la validation de l'adulte.
 */

import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { getStatusShortLabel, getStatusLabel } from '../../../../lib/helpers/statusHelpers';

export type ProgressionStatus = 'a_commencer' | 'en_cours' | 'besoin_d_aide' | 'a_verifier' | 'ajustement' | 'termine';

interface ActivityLevel {
    niveau_id: string;
    statut_exigence?: string | null;
}

interface ActivityMaterial {
    TypeMateriel: {
        acronyme: string | null;
    } | null;
}

export interface Activity {
    id: string;
    titre: string;
    ActiviteNiveau?: ActivityLevel[];
    ActiviteMateriel?: ActivityMaterial[];
}

interface ProgressionCellProps {
    activity: Activity;
    currentStatus?: ProgressionStatus | string;
    onStatusClick: (activityId: string, status: ProgressionStatus, currentStatus: string) => void;
    studentLevelId?: string;
}

/**
 * Cellule d'exercice individuelle avec boutons de changement de statut.
 */
const ProgressionCell: React.FC<ProgressionCellProps> = ({
    activity,
    currentStatus,
    onStatusClick,
    studentLevelId
}) => {
    // FILTRAGE : Si l'exercice n'est pas prévu pour le niveau de l'élève (ex: un exercice de CE2 pour un CP), on ne l'affiche pas.
    if (studentLevelId) {
        const activityLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];
        if (activityLevels.length > 0 && !activityLevels.includes(studentLevelId)) {
            return null;
        }
    }

    // ÉTAT DE VERROUILLAGE : Si l'élève a envoyé son travail pour correction ('a_verifier'), 
    // l'enseignant doit confirmer le 'Terminé' avant de pouvoir refaire d'autres changements.
    const isLocked = currentStatus === 'a_verifier';

    /** 
     * CHANGEMENT DE STATUT : 
     * Cette fonction est appelée quand on clique sur l'un des trois boutons.
     * Elle gère le cycle de vie de l'exercice (ex: passer de 'En cours' à 'Aide').
     */
    const handleToggleStatus = (newStatus: ProgressionStatus) => {
        // Sécurité : on ne peut pas changer vers autre chose que 'termine' si c'est verrouillé pour vérification.
        if (isLocked && newStatus !== 'termine') return;

        const statusStr = typeof currentStatus === 'string' ? currentStatus : 'a_commencer';
        if (currentStatus === newStatus) {
            // Si on reclique sur le même bouton, on revient à l'état "Non commencé".
            onStatusClick(activity.id, 'a_commencer', statusStr);
        } else {
            onStatusClick(activity.id, newStatus, statusStr);
        }
    };

    const isNotStarted = !currentStatus || currentStatus === 'a_commencer';

    return (
        <div className={clsx(
            "p-2.5 rounded-xl border transition-all flex flex-col gap-2.5 h-full",
            isLocked
                ? "bg-purple-900/10 border-purple-500/30 ring-1 ring-purple-500/10"
                : "bg-white/[0.03] border-white/5"
        )}>
            {/* ZONE TITRE : Nom de l'exercice et codes de matériel (ex: [ORP] pour ordinateur) */}
            <div className="w-full min-w-0">
                <span className={clsx(
                    "text-xs leading-tight transition-all text-left block",
                    isLocked ? "font-bold text-[#8B5CF6]" : (isNotStarted ? "font-bold underline text-white" : "font-semibold text-gray-400 opacity-80"),
                    currentStatus === 'termine' && "text-success opacity-100",
                    currentStatus === 'besoin_d_aide' && "text-grey-medium opacity-100",
                    currentStatus === 'ajustement' && "text-[#F59E0B] opacity-100"
                )}>
                    {activity.titre}
                    {activity.ActiviteMateriel && activity.ActiviteMateriel.length > 0 && (
                        <span className="ml-1 opacity-50 font-normal no-underline">
                            [{activity.ActiviteMateriel.map(am => am.TypeMateriel?.acronyme).filter(Boolean).join(', ')}]
                        </span>
                    )}
                </span>
            </div>

            {/* ZONE BOUTONS : Les trois actions possibles pour l'adulte */}
            <div className="grid grid-cols-3 gap-1.5 w-full mt-auto">
                {/* Bouton AIDE : Lucas lève la main ? On clique ici. */}
                <button
                    disabled={isLocked}
                    onClick={() => handleToggleStatus('besoin_d_aide')}
                    className={clsx(
                        "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border truncate px-1",
                        isLocked && "opacity-20 grayscale cursor-not-allowed",
                        currentStatus === 'besoin_d_aide'
                            ? "bg-[#A0A8AD] text-white border-[#A0A8AD] shadow-sm"
                            : "bg-black/20 border-white/5 text-grey-medium hover:border-grey-medium/40"
                    )}
                    title="Besoin d'aide"
                >
                    Aide
                </button>

                {/* Bouton AJUSTEMENT : L'exercice est trop dur ou demande une correction ? Bouton orange. */}
                <button
                    disabled={isLocked}
                    onClick={() => handleToggleStatus('ajustement')}
                    className={clsx(
                        "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border truncate px-1",
                        isLocked && "opacity-20 grayscale cursor-not-allowed",
                        currentStatus === 'ajustement'
                            ? "bg-[#F59E0B] text-black border-[#F59E0B] shadow-sm"
                            : "bg-black/20 border-white/5 text-grey-medium hover:border-[#F59E0B]/40"
                    )}
                    title={getStatusLabel('ajustement')}
                >
                    {getStatusShortLabel('ajustement')}
                </button>

                {/* Bouton VALIDER : Le Graal pour l'élève. Devient Vert quand c'est fini. */}
                <button
                    disabled={isLocked}
                    onClick={() => handleToggleStatus('termine')}
                    className={clsx(
                        "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-1 shrink-0 truncate px-1",
                        isLocked
                            ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm ring-2 ring-purple-500/50 scale-100 opacity-90 cursor-not-allowed"
                            : ((currentStatus === 'termine' || currentStatus === 'a_verifier')
                                ? (currentStatus === 'a_verifier'
                                    ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm"
                                    : "bg-success text-white border-success shadow-sm")
                                : "bg-black/20 border-white/5 text-grey-medium hover:border-success/40")
                    )}
                    title={currentStatus === 'termine' ? 'Validé' : (isLocked ? 'À vérifier' : 'Valider')}
                >
                    {isLocked ? (
                        <>
                            <ShieldCheck size={11} className="shrink-0" />
                            <span className="truncate">À vérifier</span>
                        </>
                    ) : (
                        <>
                            <Check size={11} className={clsx("shrink-0", currentStatus !== 'termine' && "opacity-50")} />
                            <span className="truncate">{currentStatus === 'termine' ? 'Validé' : 'Valider'}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// Optimisation : React.memo évite de repeindre cette case si le statut de l'élève n'a pas bougé.
export default React.memo(ProgressionCell);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. PRÉSENTATION : Dans la fiche de Julie, on voit l'exercice "Les verbes du 1er groupe". Julie n'a pas encore commencé.
 * 2. ACTION ÉLÈVE : Julie ouvre l'exercice sur sa tablette.
 * 3. MISE À JOUR : La case passe automatiquement en mode "En cours" (les boutons deviennent plus clairs).
 * 4. BLOCAGE : Julie ne comprend pas la consigne. Elle appuie sur "Aide".
 * 5. RÉACTION ADULTE : La case de Julie affiche "Aide" en gris sur le dashboard de l'enseignant.
 * 6. VÉRIFICATION : L'enseignant va voir Julie, l'aide, et trouve qu'elle a fini.
 * 7. ACTION ADULTE : L'enseignant clique sur le gros bouton "Valider".
 * 8. FIN : La case devient Verte Émeraude. Julie peut passer à l'exercice suivant. Ses parents verront ce soir qu'elle a réussi cet atelier.
 */
