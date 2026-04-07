/**
 * ============================================================
 * Nom du module/fichier : SortableGroupItem.tsx
 *
 * Données en entrée : Un groupe (son nom, son acronyme, sa photo), son numéro
 *   de position dans la liste, et le groupe actuellement sélectionné à l'écran.
 *
 * Données en sortie : L'affichage d'une ligne de groupe dans la barre latérale,
 *   avec un numéro, une icône de "poignée" pour glisser-déposer, et des boutons
 *   d'édition et de suppression.
 *
 * Objectif principal : Être la "carte individuelle" de chaque groupe dans la liste
 *   de navigation. Son super-pouvoir est sa poignée de glissement : l'enseignant
 *   peut attraper cette icône (≡) et déplacer le groupe vers le haut ou vers le bas
 *   pour changer l'ordre d'affichage.
 *
 * Ce que ça affiche : Une ligne dans la colonne de gauche, ressemblant à un item
 *   de liste avec un numéro de position, un avatar du groupe, et ses boutons
 *   d'action (modifier/supprimer).
 * ============================================================
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { Tables } from '../../../types/supabase';
import { ListItem } from '../../../core';

interface SortableGroupItemProps {
    group: Tables<'Groupe'>;
    index: number;
    selectedGroup: Tables<'Groupe'> | null;
    onClick: (group: Tables<'Groupe'>) => void;
    onEdit: (group: Tables<'Groupe'>) => void;
    onDelete: (group: Tables<'Groupe'>) => void;
}

export function SortableGroupItem({ group, index, selectedGroup, onClick, onEdit, onDelete }: SortableGroupItemProps) {
    // On demande à la bibliothèque de glisser-déposer (dnd-kit) de "surveiller" cet
    // élément. Elle lui donne des pouvoirs magiques : savoir s'il est en train d'être
    // déplacé (isDragging), calculer sa nouvelle position (transform), etc.
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id });

    // On traduit les calculs mathématiques de déplacement en un style CSS que
    // le navigateur peut comprendre et animer visuellement.
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        // La boîte conteneur qui "sait" qu'elle peut être déplacée.
        // Quand on la fait glisser, elle passe au premier plan (z-50) pour
        // s'afficher par-dessus les autres items de la liste.
        <div
            ref={setNodeRef}
            style={style}
            className={clsx("relative", isDragging ? "z-50" : "z-auto")}
        >
            {/* Le composant ListItem est notre "brique Lego" réutilisable qui
                affiche joliment n'importe quel élément de liste avec photo, titre,
                sous-titre et boutons d'action. On lui passe les informations du groupe. */}
            <ListItem
                id={group.id}
                title={group.nom}
                subtitle={group.acronyme || 'Pas d\'acronyme'}
                isSelected={selectedGroup?.id === group.id}
                onClick={() => onClick(group)}
                onEdit={() => onEdit(group)}
                onDelete={() => onDelete(group)}
                deleteTitle="Supprimer le groupe"
                // Quand on fait glisser cet item, on le rend semi-transparent et
                // on lui ajoute une ombre pour montrer qu'il "vole" au-dessus des autres.
                className={clsx(isDragging && "opacity-50 bg-background/50 border-primary/50 shadow-lg")}
                avatar={{
                    src: group.photo_url,
                    initials: group.acronyme || (group.nom && group.nom[0]),
                    className: group.photo_url ? "bg-[#D9B981]" : "bg-background"
                }}
                // On injecte à gauche de la carte : le numéro de position ET la poignée
                // de glissement. La poignée (GripVertical) est la zone "draggable" :
                // c'est elle qui écoute les clics de souris ou les gestes tactiles.
                left={
                    <div className="flex items-center">
                        {/* Le numéro de position de l'item dans la liste (ex: 1, 2, 3...) */}
                        <span className="text-[10px] font-bold text-grey-medium w-4 text-center select-none opacity-50">
                            {index + 1}
                        </span>
                        {/* La poignée magique : l'icône "≡" (trois lignes parallèles).
                            Les "listeners" et "attributes" lui donnent ses pouvoirs
                            de glissement (écoute du début du glissement, etc.) */}
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-2 text-grey-dark hover:text-white cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-colors"
                            title="Déplacer"
                        >
                            <GripVertical size={16} />
                        </div>
                    </div>
                }
            />
        </div>
    );
}

/**
 * ============================================================
 * LOGIGRAMME — Flux logique de SortableGroupItem.tsx
 * ============================================================
 * 1. La barre latérale (`GroupsListSidebar`) crée autant d'instances de ce composant
 *    qu'il y a de groupes (ex: 5 groupes → 5 cartes).
 *
 * 2. Chaque carte reçoit ses informations en entrée : son groupe, son numéro dans
 *    la liste, et la référence du groupe activement sélectionné.
 *
 * 3. La bibliothèque dnd-kit "prend en charge" la carte avec `useSortable`.
 *    Elle lui donne une identité unique (l'ID du groupe) pour la reconnaître
 *    lors des déplacements.
 *
 * 4. À l'écran, la carte affiche son numéro de position, son icône-poignée (≡),
 *    et les infos du groupe (photo, nom, acronyme).
 *
 * 5. Si l'enseignant clique sur la carte → l'action `onClick` est déclenchée,
 *    et le groupe passe en mode "sélectionné" (surligné visuellement).
 *
 * 6. Si l'enseignant attrape la poignée (≡) et fait glisser → la carte suit
 *    le curseur, devient semi-transparente, et dnd-kit calcule la nouvelle position.
 *
 * 7. En lâchant la souris, l'événement remonte vers le parent (`GroupsListSidebar`)
 *    qui déclenche la sauvegarde du nouvel ordre en base de données.
 * ============================================================
 */
