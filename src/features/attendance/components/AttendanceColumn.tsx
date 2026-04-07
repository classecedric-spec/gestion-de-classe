/**
 * Nom du module/fichier : AttendanceColumn.tsx
 * 
 * Données en entrée : 
 *   - id : Identifiant de la colonne (correspond souvent à l'ID d'une catégorie de présence).
 *   - title : Le nom affiché en haut de la colonne (ex: "Présents", "Absents").
 *   - color : La couleur thématique de la colonne (en format Hexadécimal).
 *   - count : Le nombre d'élèves actuellement dans cette colonne.
 *   - children : Les cartes d'élèves (`AttendanceStudentCard`) à afficher à l'intérieur.
 * 
 * Données en sortie : Une zone visuelle "réceptrice" (droppable) pour le glisser-déposer.
 * 
 * Objectif principal : Créer les colonnes verticales de l'interface d'appel. Chaque colonne représente un statut de présence. Elle est capable de détecter si une carte élève est survolée au-dessus d'elle pour changer son apparence et confirmer à l'enseignant qu'il peut "déposer" l'élève ici.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';

interface AttendanceColumnProps {
    id: string;
    title: string;
    color?: string;
    count: number;
    children: React.ReactNode;
    isUnassigned?: boolean;
}

/**
 * Composant représentant une colonne de destination pour l'appel (ex: Colonne "Cantine").
 */
const AttendanceColumn: React.FC<AttendanceColumnProps> = ({ id, title, color, count, children, isUnassigned = false }) => {
    // Intégration du système de "Déposer" (Droppable)
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { isColumn: true, id }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex flex-col h-full rounded-2xl overflow-hidden border transition-colors",
                // Style de fond différent pour la colonne de départ (Non assignés) et les colonnes de destination
                isUnassigned
                    ? "bg-surface/30 border-white/5"
                    : "bg-surface/50 border-white/10",
                // Si une carte élève survole cette colonne, on l'illumine en bleu (primary)
                isOver && "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
            )}
        >
            {/* --- EN-TÊTE DE LA COLONNE --- */}
            <div
                className={clsx(
                    "p-4 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md",
                    isUnassigned ? "border-white/5 bg-surface/50" : "border-white/10"
                )}
                // Petit rappel visuel de la couleur du statut en fond d'en-tête (opacité 10%)
                style={{ backgroundColor: !isUnassigned ? `${color}15` : undefined }} 
            >
                <div className="flex items-center gap-2">
                    {/* Pastille de couleur (sauf pour la colonne des non-assignés) */}
                    {!isUnassigned && <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />}
                    <h3 className={clsx("font-bold text-sm", isUnassigned ? "text-grey-light" : "text-text-main")}>
                        {title}
                    </h3>
                </div>
                {/* Compteur d'élèves présents dans cette colonne */}
                <span className={clsx(
                    "px-2 py-0.5 rounded text-xs font-bold",
                    isUnassigned ? "bg-white/5 text-grey-medium" : "bg-white/10"
                )} style={{ color: !isUnassigned ? color : undefined }}>
                    {count}
                </span>
            </div>

            {/* --- ZONE DE CONTENU (Grille d'élèves) --- */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2">
                    {children}
                </div>
                
                {/* Message si la colonne est vide (ex: personne n'est absent) */}
                {count === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-grey-dark/30 min-h-[100px]">
                        <p className="text-xs italic">Vide</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// React.memo permet d'éviter de recalculer le rendu si les propriétés ne changent pas
export default React.memo(AttendanceColumn);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'interface d'appel affiche plusieurs `AttendanceColumn` côte à côte.
 * 2. L'enseignant fait glisser l'élève 'Théo' vers la colonne 'Absent'.
 * 3. Le système `dnd-kit` détecte que Théo est au-dessus de la colonne 'Absent'.
 * 4. La colonne change de couleur (`isOver` devient vrai) pour signaler qu'elle est prête à recevoir Théo.
 * 5. L'enseignant lâche la souris.
 * 6. L'interface déplace l'élément visuel Théo de la colonne précédente vers celle-ci.
 * 7. Le compteur en haut de la colonne s'incrémente automatiquement (`count + 1`).
 */
