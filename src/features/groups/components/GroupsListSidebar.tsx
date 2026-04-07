/**
 * Nom du module/fichier : GroupsListSidebar.tsx
 * 
 * Données en entrée : 
 *   - `groups` : La liste intégrale des groupes créés par le professeur.
 *   - `filteredGroups` : La liste des groupes qui correspondent à la recherche en cours.
 *   - `selectedGroup` : L'atelier que le professeur est en train de consulter.
 *   - `loading` : État de chargement (pour afficher un indicateur de patience).
 *   - `searchQuery` : Le texte tapé dans la barre de recherche.
 * 
 * Données en sortie : 
 *   - Une colonne de navigation interactive située à gauche de l'écran.
 *   - Des ordres de sélection, de modification ou de suppression transmis au reste de la page.
 *   - Un nouvel ordre de tri après un déplacement à la souris (Drag & Drop).
 * 
 * Objectif principal : Servir de "Sommaire Interactif" pour le module des groupes. Cette barre latérale permet à l'enseignant de circuler rapidement entre ses ateliers (ex: Soutien, Lecture, Challenge). Elle intègre une recherche en temps réel et un système de "glisser-déposer" pour organiser ses dossiers dans l'ordre qui lui convient le mieux (par exemple, mettre les groupes prioritaires en haut de liste).
 * 
 * Ce que ça affiche : Une barre verticale avec le titre "Groupes", un compteur, un champ de recherche et la liste des ateliers cliquables.
 */

import React from 'react';
import { Users, Plus, Layers } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SortableGroupItem } from './SortableGroupItem';
import { Badge, SearchBar, CardInfo, CardList, Avatar, EmptyState } from '../../../core';
import { Tables } from '../../../types/supabase';

interface GroupsListSidebarProps {
    groups: Tables<'Groupe'>[];
    filteredGroups: Tables<'Groupe'>[];
    selectedGroup: Tables<'Groupe'> | null;
    loading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    headerHeight?: number;
    headerRef: React.RefObject<HTMLDivElement | null>;
    onSelectGroup: (group: Tables<'Groupe'>) => void;
    onAddGroup: () => void;
    onEditGroup: (e: React.MouseEvent, group: Tables<'Groupe'>) => void;
    onDeleteGroup: (e: React.MouseEvent, group: Tables<'Groupe'>) => void;
    onDragEnd: (event: DragEndEvent) => void;
}

/**
 * Colonne latérale gauche permettant de naviguer et d'organiser les groupes d'ateliers.
 */
export const GroupsListSidebar: React.FC<GroupsListSidebarProps> = ({
    groups,
    filteredGroups,
    selectedGroup,
    loading,
    searchQuery,
    setSearchQuery,
    headerHeight,
    headerRef,
    onSelectGroup,
    onAddGroup,
    onEditGroup,
    onDeleteGroup,
    onDragEnd
}) => {
    /** 
     * CONFIGURATION DU DÉPLACEMENT : 
     * On définit comment la souris ou le clavier peut "attraper" un groupe pour le déplacer.
     * Activation constraint : le mouvement ne commence qu'après un petit déplacement de 5 pixels (évite les erreurs de clic).
     */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <div className="w-1/4 flex flex-col gap-6 h-full">
            
            {/* EN-TÊTE : Titre, compteur et recherche */}
            <CardInfo
                ref={headerRef}
                height={headerHeight}
                contentClassName="space-y-5"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                        <Users size={24} className="text-primary" />
                        Groupes
                    </h2>
                    <Badge variant="primary" size="xs">
                        {groups.length} au total
                    </Badge>
                </div>

                <div className="border-t border-white/10" />

                <div className="space-y-4">
                    <SearchBar
                        placeholder="Chercher un groupe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        iconColor="text-primary"
                    />
                </div>
            </CardInfo>

            {/* LISTE DES GROUPES : Affichage dynamique avec support du glisser-déposer */}
            <CardList
                actionLabel="Nouveau Groupe"
                onAction={onAddGroup}
                actionIcon={Plus}
            >
                {loading ? (
                    // État pendant le téléchargement des données
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                        <Avatar size="lg" loading initials="" />
                        <p className="text-grey-medium animate-pulse text-sm">Chargement des groupes...</p>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    // État si la liste est vide (soit aucun groupe, soit aucun résultat de recherche)
                    <EmptyState
                        icon={Layers}
                        title="Aucun groupe trouvé"
                        description={searchQuery ? "Aucun groupe ne porte ce nom." : "Commencez par créer votre premier atelier pour vos élèves."}
                        size="sm"
                    />
                ) : (
                    /** 
                     * ZONE DE RÉORGANISATION : 
                     * Permet de changer l'ordre des groupes à la volée.
                     */
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={onDragEnd}
                    >
                        <SortableContext
                            items={filteredGroups.map(g => g.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1 flex-1">
                                {filteredGroups.map((group, index) => (
                                    <SortableGroupItem
                                        key={group.id}
                                        index={index}
                                        group={group}
                                        selectedGroup={selectedGroup}
                                        onClick={() => onSelectGroup(group)}
                                        // On empile les actions d'édition et de suppression
                                        onEdit={(g) => onEditGroup({ stopPropagation: () => { } } as any, g)}
                                        onDelete={(g) => onDeleteGroup({ stopPropagation: () => { } } as any, g)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </CardList>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant accède au module Groupes. La barre latérale s'affiche à gauche.
 * 2. Si le professeur n'a pas encore de groupes :
 *    - Il voit le message "Commencez par créer votre premier atelier".
 * 3. Le professeur clique sur "Nouveau Groupe" en bas :
 *    - Une fenêtre surgit pour lui demander le nom et la couleur du nouveau groupe.
 * 4. Le professeur veut trouver le groupe "Soutien CP" parmi ses 12 groupes :
 *    - Il tape "Sou" dans le champ de recherche.
 *    - La liste se réduit immédiatement aux groupes correspondants.
 * 5. Le professeur veut que ses groupes de lecture apparaissent en premier :
 *    - Il "attrape" un groupe avec sa souris, le fait monter en haut de la liste et le relâche.
 *    - L'application enregistre ce nouvel ordre pour sa prochaine visite.
 * 6. Chaque clic sur un groupe met à jour le grand panneau de droite pour montrer les élèves inscrits.
 */
export default GroupsListSidebar;
