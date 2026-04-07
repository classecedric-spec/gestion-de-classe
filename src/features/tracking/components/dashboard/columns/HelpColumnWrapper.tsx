/**
 * Nom du module/fichier : HelpColumnWrapper.tsx
 * 
 * Données en entrée : 
 *   - `helpRequests` : Liste des élèves ayant levé la main numériquement ou ayant un statut "À vérifier".
 *   - `expandedRequestId` : Identifiant de la demande d'aide actuellement ouverte pour voir les détails.
 *   - `helpersCache` : Informations sur les élèves "tuteurs" qui peuvent aider leur camarade.
 *   - `onExpand`, `onStatusClick`, `onSetItemToDelete` : Actions pour gérer les demandes (déplier, valider, retirer).
 * 
 * Données en sortie : 
 *   - Une colonne dynamique (la n°2 du dashboard) listant les urgences de la classe.
 * 
 * Objectif principal : Centraliser les demandes d'attention. L'enseignant voit en un coup d'œil qui est bloqué, sur quel exercice, et depuis combien de temps. C'est l'outil qui permet de ne laisser aucun élève sans réponse pendant la séance d'ateliers.
 * 
 * Ce que ça affiche : Une liste de "tickets" d'aide avec le nom de l'élève, l'exercice concerné, et un petit voyant clignotant.
 */

import React from 'react';
import HelpRequestsPanel from '../../desktop/HelpRequestsPanel';

interface HelpColumnWrapperProps {
    helpRequests: any[];
    expandedRequestId: string | null;
    helpersCache: any;
    onExpand: (id: string | null) => void;
    onStatusClick: (activityId: string, status: string, currentStatus?: string, studentId?: string) => void;
    onSetItemToDelete: (item: any) => void;
}

/**
 * Conteneur pour la colonne des demandes d'aide et du suivi personnalisé.
 */
export const HelpColumnWrapper: React.FC<HelpColumnWrapperProps> = ({
    helpRequests,
    expandedRequestId,
    helpersCache,
    onExpand,
    onStatusClick,
    onSetItemToDelete
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* EN-TÊTE : Titre de la colonne avec compteur de demandes en cours */}
            <div className="p-4 border-b border-white/5 h-[60px] flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Suivi Personnalisé</span>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {helpRequests.length}
                </span>
            </div>

            {/* ZONE DE LISTE : On délègue l'affichage des fiches au composant HelpRequestsPanel */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <HelpRequestsPanel
                    helpRequests={helpRequests}
                    expandedRequestId={expandedRequestId}
                    helpersCache={helpersCache}
                    onExpand={onExpand}
                    onStatusClick={onStatusClick}
                    onSetItemToDelete={onSetItemToDelete}
                />
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION ÉLÈVE : Lucas est bloqué sur son exercice de lecture. Il appuie sur "Besoin d'aide" sur sa tablette.
 * 2. RÉCEPTION : Le signal arrive instantanément sur l'ordinateur de l'enseignant.
 * 3. APPARITION : Un nouveau ticket "Lucas - Lecture" apparaît dans cette colonne. Le compteur passe à 1.
 * 4. INTERVENTION : L'enseignant (ou un tutorélève) voit la demande et va aider Lucas.
 * 5. RÉSOLUTION : Une fois Lucas débloqué :
 *    - Soit l'enseignant valide l'exercice (clic sur Validé) : Lucas passe en mode "Terminé" et son ticket disparaît.
 *    - Soit l'enseignant retire simplement la demande d'aide pour libérer de la place.
 * 6. VOYANT : Le petit point bleu clignote tant qu'une demande n'a pas été traitée pour attirer l'attention de l'adulte.
 */
export default HelpColumnWrapper;
