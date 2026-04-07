/**
 * Nom du module/fichier : GroupSelector.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Booléen qui commande l'affichage ou le masquage de la fenêtre.
 *   - `groups` : Liste des groupes (classes ou ateliers) enregistrés par l'enseignant.
 *   - `onSelect` : Fonction déclenchée quand l'enseignant clique sur le groupe voulu.
 * 
 * Données en sortie : 
 *   - Une fenêtre modale interactive qui recouvre tout l'écran. 
 * 
 * Objectif principal : Permettre de changer instantanément de contexte de travail. Un enseignant peut avoir plusieurs classes ou plusieurs groupes de niveaux. Cet écran lui permet de dire au logiciel : "Affiche-moi le tableau de bord de tel groupe".
 * 
 * Ce que ça affiche : Une boîte centrale élégante avec de gros boutons faciles à viser pour chaque groupe disponible.
 */

import React from 'react';
import { Users } from 'lucide-react';

interface Group {
    id: string;
    nom: string;
}

interface GroupSelectorProps {
    isOpen: boolean;
    groups: Group[];
    onSelect: (groupId: string) => void;
}

/**
 * Sélecteur de groupe utilisé pour basculer d'une classe/groupe à l'autre dans le dashboard.
 */
const GroupSelector = React.memo<GroupSelectorProps>(({ isOpen, groups, onSelect }) => {
    // Si la fenêtre n'est pas censée être ouverte, on ne renvoie rien (elle est invisible).
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full text-center space-y-6 animate-in zoom-in-95">
                {/* Titre d'instruction invitant l'enseignant à faire un choix */}
                <h2 className="text-2xl font-bold text-white">Sélectionner un Groupe</h2>
                
                <div className="grid grid-cols-1 gap-3">
                    {/* Message de secours si aucun groupe n'a été créé */}
                    {groups.length === 0 ? (
                        <p className="text-grey-medium">Aucun groupe trouvé.</p>
                    ) : (
                        // Liste de boutons pour chaque groupe
                        groups.map(g => (
                            <button
                                key={g.id}
                                onClick={() => onSelect(g.id)}
                                className="p-4 bg-background/50 hover:bg-primary/20 hover:border-primary border border-white/10 rounded-xl transition-all text-lg font-bold text-white flex items-center justify-center gap-2 group"
                            >
                                <Users className="group-hover:text-primary transition-colors" /> {g.nom}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
});

// Optimisation : React.memo évite de recalculer l'affichage si la liste n'a pas changé.
GroupSelector.displayName = 'GroupSelector';

export default GroupSelector;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. DÉCLENCHEMENT : L'enseignant clique sur le bouton "Utilisateurs" (en bas à droite du dashboard).
 * 2. APPARITION : L'écran devient sombre et flouté en arrière-plan, et cette fenêtre `GroupSelector` surgit au centre.
 * 3. ANALYSE : Le logiciel regarde tous les groupes que cet enseignant a le droit de voir (ex: CM1-A, CM1-B, Groupe de Remédiation).
 * 4. INTERACTION : L'enseignant clique sur "CM1-A".
 * 5. RÉACTION : La fenêtre se ferme (`isOpen` devient faux), et le tableau de bord se recharge instantanément avec les photos et les progrès des élèves du CM1-A.
 */
