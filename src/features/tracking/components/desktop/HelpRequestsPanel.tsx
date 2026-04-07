/**
 * Nom du module/fichier : HelpRequestsPanel.tsx
 * 
 * Données en entrée : 
 *   - `helpRequests` : Liste des élèves ayant une demande d'aide ou un suivi spécifique.
 *   - `expandedRequestId` : Identifiant de la demande d'aide que l'on souhaite "déplier" pour voir les tuteurs possibles.
 *   - `helpersCache` : Liste des élèves "experts" (ceux qui ont déjà fini l'exercice) pouvant aider leur camarade.
 *   - `onExpand` : Action pour déplier une demande d'aide.
 *   - `onStatusClick`, `onSetItemToDelete` : Actions de validation et de nettoyage.
 * 
 * Données en sortie : 
 *   - Liste verticale de "Tickets de suivi" cliquables.
 * 
 * Objectif principal : Gérer la file d'attente des besoins d'aide. Ce composant ne se contente pas d'afficher "Qui a besoin d'aide", il suggère aussi automatiquement des élèves tuteurs (Camarades experts) pour favoriser l'entraide en autonomie dans la classe.
 * 
 * Ce que ça affiche : 
 *   - Des cartes avec le nom de l'élève, l'exercice concerné et l'urgence (badge de couleur).
 *   - En dépliant, une liste de petits avatars d'élèves capables d'apporter leur aide.
 */

import React from 'react';
import { Check, Users, Loader2, X } from 'lucide-react';
import { getInitials } from '../../../../lib/helpers';
import clsx from 'clsx';
import { getStatusShortLabel } from '../../../../lib/helpers/statusHelpers';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HelpRequest, Helper } from '../../hooks/useHelpRequests';
import { ProgressionStatus } from './ProgressionCell';

interface HelpRequestsPanelProps {
    helpRequests: HelpRequest[];
    expandedRequestId: string | null;
    helpersCache: Record<string, Helper[]>;
    onExpand: (requestId: string, activityId: string) => void;
    onStatusClick: (activityId: string, status: ProgressionStatus, currentStatus: string, studentId?: string) => void;
    onSetItemToDelete: (item: any) => void;
}

/**
 * Panneau listant les demandes d'attention (Aide, À vérifier, Ajustement).
 */
const HelpRequestsPanel: React.FC<HelpRequestsPanelProps> = ({
    helpRequests,
    expandedRequestId,
    helpersCache,
    onExpand,
    onStatusClick,
    onSetItemToDelete
}) => {
    return (
        <>
            <div
                className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar [container-type:inline-size]"
            >
                {/* Message si tout est calme dans la classe */}
                {helpRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-grey-medium opacity-50 space-y-2">
                        <Check size={24} />
                        <p className="text-xs">Aucun suivi en cours</p>
                    </div>
                ) : (
                    // On boucle sur chaque demande renvoyée par le module de suivi
                    helpRequests.map(req => (
                        <div key={req.id} className="relative group/card">
                            {/* Bouton de retrait (Croix rouge) - permet de nettoyer la liste manuellement */}
                            {req.etat !== 'a_verifier' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (req.is_suivi) {
                                            onSetItemToDelete(req);
                                        } else {
                                            if (req.activite && req.eleve) {
                                                onStatusClick(req.activite.id, 'a_commencer', req.etat, req.eleve.id);
                                            }
                                            toast("Retiré de la liste");
                                        }
                                    }}
                                    className="absolute -top-2 -right-2 z-10 p-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-100 sm:opacity-0 group-hover/card:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Retirer"
                                    aria-label="Retirer"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}

                            <div
                                onClick={() => !req.is_suivi && req.etat === 'besoin_d_aide' && req.activite && onExpand(req.id, req.activite.id)}
                                className={clsx(
                                    "px-1.5 py-1.5 bg-surface rounded-xl border border-white/5 shadow-sm transition-all animate-in slide-in-from-bottom-2 group select-none hover:bg-surface/60",
                                    (!req.is_suivi && req.etat === 'besoin_d_aide') ? "cursor-pointer hover:border-white/20" : "cursor-default",
                                    expandedRequestId === req.id && "bg-surface-light border-primary/20 ring-1 ring-primary/10"
                                )}
                            >
                                <div className="flex w-full">
                                    {/* ZONE TEXTE : Informations sur l'élève et l'exercice */}
                                    <div className="w-[80%] flex flex-col justify-center px-3 relative shrink-0">
                                        <div className="flex items-center justify-between w-full">
                                            <h4 className="font-bold text-white truncate max-w-[70%] text-[clamp(12px,4.5cqw,24px)] flex items-center gap-2">
                                                <span>{req.eleve?.prenom} {req.eleve?.nom?.charAt(0).toUpperCase()}</span>
                                                {/* % d'importance de suivi (pour les élèves prioritaires PPRE/PAP) */}
                                                {req.eleve?.importance_suivi !== undefined && req.eleve?.importance_suivi !== null && (
                                                    <span className="text-[0.8em] font-medium text-grey-medium tabular-nums">
                                                        ({req.eleve.importance_suivi}%)
                                                    </span>
                                                )}
                                            </h4>

                                            {/* Date limite du module pour voir si on est pressés */}
                                            {req.activite?.Module?.date_fin && (
                                                <span className="text-primary font-black shrink-0 text-[clamp(10px,3cqw,18px)]">
                                                    {format(new Date(req.activite.Module.date_fin), 'dd/MM', { locale: fr })}
                                                </span>
                                            )}
                                        </div>

                                        <p className="font-medium text-primary/80 truncate w-full text-[clamp(10px,3.5cqw,20px)]">
                                            <span className="text-primary/90 font-bold">{req.activite?.Module?.nom || 'Module'}</span>
                                            <span className="mx-2 text-white/20">•</span>
                                            <span className="text-grey-light">{req.activite?.titre || 'Activité'}</span>
                                        </p>
                                    </div>

                                    {/* ZONE ACTION : Le "badge" de statut de couleur */}
                                    <div className="w-[20%] flex items-center justify-end pr-[5px] shrink-0">
                                        <div
                                            className={clsx(
                                                "px-2 py-1 rounded-md font-black uppercase tracking-wider transition-colors shadow-sm whitespace-nowrap text-[clamp(8px,2.5cqw,16px)]",
                                                req.is_suivi
                                                    ? "bg-primary text-black border border-primary"
                                                    : req.etat === 'a_verifier'
                                                        ? "bg-[#8B5CF6] text-white border border-[#8B5CF6]"
                                                        : req.etat === 'ajustement'
                                                            ? "bg-[#F59E0B] text-black border border-[#F59E0B]"
                                                            : "bg-[#A0A8AD] text-white border border-[#A0A8AD]"
                                            )}
                                        >
                                            {req.is_suivi ? 'Suivi' : getStatusShortLabel(req.etat)}
                                        </div>
                                    </div>
                                </div>

                                {/* EXTENSION TUTORELÈVES (Seulement si l'enseignant a cliqué sur la carte d'aide) */}
                                {expandedRequestId === req.id && (
                                    <div className="mt-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users size={10} className="text-primary" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">Camarades experts :</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {helpersCache[req.id] ? (
                                                helpersCache[req.id].length > 0 ? (
                                                    // On affiche les élèves qui ont déjà fini ce même exercice
                                                    helpersCache[req.id].map(helper => (
                                                        <div key={helper.id} className="flex items-center gap-1.5 bg-white/5 px-1.5 py-1 rounded-lg border border-white/5">
                                                            <div className="w-5 h-5 rounded-md overflow-hidden border border-white/10 shrink-0">
                                                                {(helper as any).photo_base64 ? (
                                                                    <img src={(helper as any).photo_base64} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-surface-light flex items-center justify-center text-[7px] font-bold text-primary">
                                                                        {getInitials(helper)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-medium text-grey-light truncate max-w-[100px]">
                                                                {helper.prenom} {helper.nom}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[9px] text-grey-dark italic">Aucun camarade n'a encore validé.</p>
                                                )
                                            ) : (
                                                // Petit chargement pendant qu'on interroge la base de données
                                                <div className="flex items-center gap-2">
                                                    <Loader2 size={10} className="animate-spin text-primary" />
                                                    <span className="text-[9px] font-bold text-grey-medium uppercase tracking-widest">Recherche...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

export default HelpRequestsPanel;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Charlotte est bloquée sur "Grammaire - Adjectif". Elle l'indique sur sa tablette.
 * 2. Un nouveau ticket clignotant apparait dans cette liste pour l'enseignant.
 * 3. L'enseignant a déjà 3 élèves à gérer, il clique sur le ticket de Charlotte pour voir qui peut l'aider.
 * 4. L'application scanne instantanément toute la classe pour trouver qui a déjà fini "Grammaire - Adjectif".
 * 5. Elle affiche : "Experts : Bastien, Sarah".
 * 6. L'enseignant, depuis sa chaise, dit : "Bastien, peux-tu aller aider Charlotte sur les adjectifs s'il te plaît ?".
 * 7. Bastien va voir Charlotte. Charlotte comprend et valide son exercice. Son ticket disparait de la liste de l'enseignant.
 * 8. RÉSULTAT : Le climat de classe est plus zen car l'entraide est fluide et visible.
 */
