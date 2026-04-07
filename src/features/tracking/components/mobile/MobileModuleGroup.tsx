/**
 * Nom du module/fichier : MobileModuleGroup.tsx
 * 
 * Données en entrée : 
 *   - `studentName` : Le nom/prénom de l'élève.
 *   - `requests` : La liste des exercices de cet élève demandant une attention (aide ou validation).
 *   - `expandedRequestId` : L'identifiant du ticket d'aide actuellement ouvert pour voir les tuteurs.
 *   - `helpersCache` : Liste des camarades experts pouvant aider.
 *   - `onStatusUpdate`, `onClear` : Actions pour valider ou retirer une demande.
 * 
 * Données en sortie : 
 *   - Un bloc accordéon (dépliable) regroupant toutes les alertes de travail d'un seul élève.
 * 
 * Objectif principal : Désencombrer l'affichage mobile. Si un élève a 5 exercices à faire vérifier, on ne veut pas qu'ils prennent tout l'écran d'un coup. Ce composant regroupe tout sous le nom de l'élève. L'enseignant clique sur le nom pour "déplier" les détails et traiter les alertes une par une.
 * 
 * Ce que ça affiche : 
 *   - Une barre d'en-tête avec l'avatar et le nom de l'élève, ainsi qu'un badge indiquant le nombre d'alertes.
 *   - Une zone dépliable contenant une liste de `MobileRequestCard` (les fiches individuelles).
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import MobileRequestCard from './MobileRequestCard';
import { ProgressionWithDetails, StudentBasicInfo } from '../../services/trackingService';

interface MobileModuleGroupProps {
    studentId: string;
    studentName: string;
    requests: ProgressionWithDetails[];
    expandedRequestId: string | null;
    helpersCache: Record<string, StudentBasicInfo[]>;
    onExpandHelp: (requestId: string, activityId: string | undefined) => void;
    onStatusUpdate: (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => void;
    onClear: (req: ProgressionWithDetails) => void;
}

/**
 * Groupeur de demandes d'aide par élève pour l'interface mobile.
 */
const MobileModuleGroup: React.FC<MobileModuleGroupProps> = ({
    studentName,
    requests,
    expandedRequestId,
    helpersCache,
    onExpandHelp,
    onStatusUpdate,
    onClear
}) => {
    // ÉTAT : On mémorise si la liste de cet élève est ouverte ou fermée.
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-surface/50 border border-white/5 rounded-xl overflow-hidden mb-3">
            {/* LIGNE DE RÉSUMÉ : Cliquer ici pour voir les travaux de cet élève */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-surface hover:bg-surface-light transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User size={16} />
                    </div>
                    <span className="font-bold text-sm text-white">{studentName}</span>
                    {/* Badge rouge indiquant le nombre de tâches en attente */}
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-grey-light">
                        {requests.length}
                    </span>
                </div>
                {/* Icône de flèche qui tourne selon l'état d'ouverture */}
                {isExpanded ? <ChevronDown size={20} className="text-grey-medium" /> : <ChevronRight size={20} className="text-grey-medium" />}
            </button>

            {/* ZONE DÉPLIÉE : La liste des exercices en attente */}
            {isExpanded && (
                <div className="p-3 space-y-3 bg-black/20 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                    {requests.map(req => (
                        <MobileRequestCard
                            key={req.id}
                            req={req}
                            isExpanded={expandedRequestId === req.id}
                            helpers={helpersCache[req.id]}
                            onExpand={onExpandHelp}
                            onStatusUpdate={onStatusUpdate}
                            onClear={onClear}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MobileModuleGroup;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant voit que Lucas a "3" alertes sur son mobile.
 * 2. ÉTAT INITIAL : Lucas est une simple ligne grise fermée pour économiser de la place.
 * 3. APPUYÉ : L'enseignant tape sur le nom de Lucas.
 * 4. RÉACTION : La zone glisse vers le bas et révèle les 3 fiches (ex: Lecture, Calcul, Écriture).
 * 5. TRAITEMENT : L'enseignant valide la Lecture. Le compteur de Lucas passe à 2.
 * 6. FERMETURE : L'enseignant re-clique sur Lucas pour cacher les 2 alertes restantes et passer à l'élève suivant.
 * 7. GAIN DE PLACE : Cet affichage permet de gérer 30 élèves sans avoir à faire défiler l'écran indéfiniment.
 */
