/**
 * Nom du module/fichier : BranchDetails.tsx
 * 
 * Données en entrée : 
 *   - `selectedBranch` : La matière principale choisie (ex: 'Mathématiques').
 *   - `subBranches` : Liste des spécialités liées (ex: 'Calcul', 'Géométrie').
 * 
 * Données en sortie : 
 *   - Un panneau d'affichage détaillé avec des onglets.
 *   - Action de réorganisation des sous-matières (`onReorderSub`).
 * 
 * Objectif principal : Présenter toutes les informations d'une matière et permettre de gérer ses sous-divisions. C'est le "zoom" sur une branche. L'enseignant peut y voir le logo en grand et organiser l'ordre de ses sous-matières par glisser-déposer.
 * 
 * Ce que ça affiche : 
 *   - Un en-tête avec le logo et le nom.
 *   - Un système d'onglets pour basculer entre la liste des sous-matières (Sous-branches) et les infos générales.
 */

import React, { useState } from 'react';
import { GitBranch, ListTree, Info } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableSubBranchItem from './SortableSubBranchItem';
import type { Database } from '../../../types/supabase';
import { Avatar, EmptyState, Badge, CardInfo, CardTabs } from '../../../core';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];

interface BranchDetailsProps {
    selectedBranch: BrancheRow | null;
    subBranches: SousBrancheRow[];
    onReorderSub: (subBranches: SousBrancheRow[]) => void;
    rightContentRef: React.RefObject<HTMLDivElement | null>;
    headerHeight?: number;
}

/**
 * Composant affichant le détail complet d'une branche sélectionnée.
 */
const BranchDetails: React.FC<BranchDetailsProps> = ({
    selectedBranch,
    subBranches,
    onReorderSub,
    rightContentRef,
    headerHeight
}) => {
    // État local pour savoir quel onglet est actif (Sous-matières ou Infos)
    const [activeTab, setActiveTab] = useState('subbranches');

    // --- CONFIGURATION DU GLISSER-DÉPOSER ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /**
     * FIN DU DÉPLACEMENT : Quand l'enseignant lâche une sous-matière à une nouvelle place.
     */
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = subBranches.findIndex((item) => item.id === active.id);
            const newIndex = subBranches.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(subBranches, oldIndex, newIndex);
            onReorderSub(newItems);
        }
    };

    // Si aucune matière n'est sélectionnée, on affiche un message d'invitation sympathique
    if (!selectedBranch) {
        return (
            <div className="flex-1 card-flat overflow-hidden">
                <EmptyState
                    icon={GitBranch}
                    title="Sélectionnez une branche"
                    description="Choisissez une branche dans la liste pour voir ses détails et les sous-branches associées."
                    size="md"
                />
            </div>
        );
    }

    const photo = selectedBranch.photo_url || (selectedBranch as any).photo_base64;

    return (
        <>
            {/* -- PARTIE HAUTE : RÉSUMÉ DE LA BRANCHE -- */}
            <CardInfo
                ref={rightContentRef}
                height={headerHeight}
            >
                <div className="flex gap-5 items-center">
                    <Avatar
                        size="lg"
                        src={photo}
                        icon={GitBranch}
                        className="bg-surface border-4 border-background"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-cq-xl font-bold text-text-main truncate">
                            {selectedBranch.nom}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge variant="primary" size="xs">Branche Pédagogique</Badge>
                            <Badge variant="secondary" size="xs" className="bg-white/5">
                                {subBranches.length} Sous-branches
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardInfo>

            {/* -- PARTIE BASSE : CONTENU DÉTAILLÉ (ONGLETS) -- */}
            <CardTabs
                tabs={[
                    { id: 'subbranches', label: 'Sous-branches', icon: ListTree },
                    { id: 'infos', label: 'Informations', icon: Info }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            >
                {/* ONGLET 1 : LA LISTE DES SOUS-MATIÈRES */}
                {activeTab === 'subbranches' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {subBranches.length === 0 ? (
                            <EmptyState
                                icon={GitBranch}
                                title="Aucune sous-branche"
                                description="Aucune sous-branche liée à cette branche."
                                size="md"
                                className="border-2 border-dashed border-white/5 rounded-xl"
                            />
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={subBranches.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2">
                                        {subBranches.map((sub) => (
                                            <SortableSubBranchItem key={sub.id} sub={sub} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                )}

                {/* ONGLET 2 : INFOS GÉNÉRALES (Vide pour l'instant) */}
                {activeTab === 'infos' && (
                    <div className="p-8 text-center text-grey-medium italic opacity-60 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        Aucune information supplémentaire disponible pour cette branche.
                    </div>
                )}
            </CardTabs>
        </>
    );
};

export default React.memo(BranchDetails);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur la matière "Mathématiques" dans la liste de gauche.
 * 2. Le composant `BranchDetails` reçoit les informations de la branche.
 * 3. Il affiche le logo et le nom en haut de la page.
 * 4. Il va chercher toutes les sous-branches (ex: Géométrie, Calcul, Mesures) pour les lister dans le premier onglet.
 * 5. L'enseignant peut alors réorganiser ces sous-matières par glisser-déposer.
 * 6. S'il change d'onglet pour "Informations", le tableau des sous-matières disparaît au profit d'un texte informatif.
 */
