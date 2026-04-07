/**
 * Nom du module/fichier : MobileRequestCard.tsx
 * 
 * Données en entrée : 
 *   - `req` : Les détails de la demande (élève, exercice, statut, date).
 *   - `isExpanded` : Indique si la fiche est ouverte pour montrer les actions détaillées.
 *   - `helpers` : Liste des élèves tuteurs suggérés.
 *   - `onStatusUpdate`, `onClear` : Actions de validation de l'exercice.
 * 
 * Données en sortie : 
 *   - Une carte interactive optimisée pour le pouce (mobile) permettant de traiter une alerte.
 * 
 * Objectif principal : Être l'unité d'action en mobilité. Quand l'enseignant circule avec sa tablette, il voit ces fiches. Elles lui permettent de valider un travail ("Validé"), de demander de le refaire ("A refaire"), ou de voir qui peut aider l'élève ("Helpers"). C'est le "Post-it" numérique de la classe.
 * 
 * Ce que ça affiche : 
 *   - La photo et le nom de l'élève.
 *   - Le nom du module et de l'exercice en petit.
 *   - Le statut coloré (Aide, À vérifier, Suivi).
 *   - Quand on clique : trois gros boutons (Non Valide, A refaire, Validé) et la liste des tuteurs.
 */

import React from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getStatusShortLabel, normalizeStatus } from '../../../../lib/helpers/statusHelpers';
import { getInitials } from '../../../../lib/helpers';
import { ProgressionWithDetails, StudentBasicInfo } from '../../services/trackingService';

interface MobileRequestCardProps {
    req: ProgressionWithDetails;
    isExpanded: boolean;
    helpers: StudentBasicInfo[] | undefined;
    onExpand: (requestId: string, activityId: string | undefined) => void;
    onStatusUpdate: (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => void;
    onClear: (req: ProgressionWithDetails) => void;
}

/**
 * Fiche individuelle de demande de suivi/aide pour l'interface mobile.
 */
const MobileRequestCard: React.FC<MobileRequestCardProps> = ({
    req,
    isExpanded,
    helpers,
    onExpand,
    onStatusUpdate,
    onClear
}) => {
    return (
        <div
            // Déplier la fiche au clic pour voir les boutons d'action
            onClick={() => !req.is_suivi && req.etat !== 'besoin_d_aide' && onExpand(req.id, req.activite?.id)}
            className={clsx(
                "bg-surface border border-white/10 rounded-2xl p-4 shadow-xl active:scale-[0.98] transition-all relative group",
                !req.is_suivi && req.etat !== 'besoin_d_aide' && "cursor-pointer",
                isExpanded && "ring-2 ring-primary/50 border-primary/50"
            )}
        >
            {/* Bouton de suppression (croix rouge) : pour les demandes d'aide ou suivis manuels */}
            {(req.is_suivi || req.etat === 'besoin_d_aide') && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(req); }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-danger text-white rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10"
                    title="Supprimer la demande"
                >
                    <X size={16} strokeWidth={3} />
                </button>
            )}

            <div className="flex w-full items-center gap-3">
                {/* PHOTO DE L'ÉLÈVE */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/5 shrink-0 bg-surface-light shadow-inner">
                    {(req.eleve as any)?.photo_url || (req.eleve as any)?.photo_base64 ? (
                        <img src={(req.eleve as any).photo_url || (req.eleve as any).photo_base64} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-primary">
                            {getInitials(req.eleve as any)}
                        </div>
                    )}
                </div>

                {/* INFORMATIONS TEXTUELLES (Élève, Module, Activité) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h2 className="text-base font-black text-white truncate leading-tight">
                        {req.eleve?.prenom} {req.eleve?.nom}
                    </h2>

                    {!req.is_suivi && req.activite?.Module?.nom && (
                        <div className="ml-[10%] w-[90%]">
                            <p className="text-[11px] text-primary/80 font-medium uppercase tracking-tight truncate">
                                {req.activite.Module.nom}
                            </p>
                        </div>
                    )}

                    {!req.is_suivi && req.activite?.titre && (
                        <div className="ml-[20%] w-[80%] flex items-center justify-between gap-1 overflow-hidden pr-2">
                            <p className="text-[10px] text-grey-light font-medium truncate">
                                {req.activite.titre}
                            </p>
                        </div>
                    )}
                </div>

                {/* ZONE STATUT ET DATE : Le badge de couleur */}
                <div className="shrink-0 flex flex-col items-end justify-center gap-1.5">
                    {req.updated_at && (
                        <span className="text-[9px] text-[#FFD700] font-bold whitespace-nowrap drop-shadow-sm">
                            {new Intl.DateTimeFormat('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            }).format(new Date(req.updated_at))}
                        </span>
                    )}
                    <div className={clsx(
                        "px-2 py-1 rounded-md font-black uppercase tracking-wider text-[10px] whitespace-nowrap",
                        req.is_suivi
                            ? "bg-primary text-black border border-primary"
                            : req.etat === 'a_verifier'
                                ? "bg-[#8B5CF6] text-white border border-[#8B5CF6]"
                                : req.etat === 'ajustement'
                                    ? "bg-orange-500 text-white border border-orange-500"
                                    : "bg-[#A0A8AD] text-white border border-[#A0A8AD]"
                    )}>
                        {req.is_suivi ? 'Suivi' : getStatusShortLabel(normalizeStatus(req.etat))}
                    </div>
                </div>
            </div>

            {/* ACTIONS ÉTENDUES (Apparaissent au clic) */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Boutons d'action rapide pour le pouce de l'enseignant */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(req, 'non_valide'); }}
                            className="py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-xl border border-danger/20 text-[10px] font-black uppercase tracking-tighter transition-all"
                        >
                            Non Valide
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(req, 'status_quo'); }}
                            className="py-2.5 bg-white/5 hover:bg-white/10 text-grey-medium hover:text-white rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-tighter transition-all"
                        >
                            A refaire
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(req, 'valide'); }}
                            className="py-2.5 bg-success hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-success/20 text-[10px] font-black uppercase tracking-tighter transition-all"
                        >
                            Validé
                        </button>
                    </div>

                    {/* SÉCURITÉ PÉDAGOGIQUE : Liste des tuteurs (seulement pour les demandes d'aide) */}
                    {req.etat === 'besoin_d_aide' && (
                        <div className="pt-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Users size={12} className="text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-grey-medium">Peut t'aider :</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {helpers ? (
                                    helpers.length > 0 ? (
                                        helpers.map(helper => (
                                            <div key={helper.id} className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-xl border border-white/5 pr-3">
                                                <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                    {(helper as any).photo_base64 ? (
                                                        <img src={(helper as any).photo_base64} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-surface-light flex items-center justify-center text-[8px] font-black text-primary uppercase">
                                                            {getInitials(helper as any)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold text-grey-light truncate max-w-[100px]">
                                                    {helper.prenom} {helper.nom}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-grey-dark italic py-1">Personne n'a encore fini cette activité.</p>
                                    )
                                ) : (
                                    <div className="flex items-center gap-2 py-1">
                                        <Loader2 size={12} className="animate-spin text-primary" />
                                        <span className="text-[10px] font-bold text-grey-medium uppercase tracking-widest">Recherche...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileRequestCard;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Charlotte finit son exercice de calcul et attend la validation.
 * 2. Un ticket violet "À vérifier" apparaît sur le smartphone de l'enseignant.
 * 3. L'enseignant s'approche de Charlotte, regarde son travail, et tape sur la fiche de Charlotte sur son écran.
 * 4. La fiche s'agrandit pour montrer les 3 boutons colorés.
 * 5. Le travail est parfait. L'enseignant tape sur le gros bouton vert "Validé".
 * 6. RÉSULTAT : Le ticket de Charlotte disparaît car il est traité. Le point de compétence est enregistré pour son bilan.
 */
