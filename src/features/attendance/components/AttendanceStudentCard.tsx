/**
 * Nom du module/fichier : AttendanceStudentCard.tsx
 * 
 * Données en entrée : 
 *   - student : Les informations de l'élève (nom, prénom, photo).
 *   - currentStatus : Le statut de présence actuel (s'il y en a un).
 *   - disabled : Si vrai, empêche de déplacer la carte (ex: quand l'appel est verrouillé).
 * 
 * Données en sortie : Un élément visuel "glissable" (draggable) représentant l'élève.
 * 
 * Objectif principal : Créer une carte interactive pour chaque élève. Dans l'interface d'appel, l'enseignant peut "attraper" cette carte et la faire glisser dans une colonne (Présent, Absent, etc.). C'est l'élément de base de l'appel visuel.
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { GripVertical } from 'lucide-react';
import { Student } from '../services/attendanceService';
import { Avatar } from '../../../core';

interface AttendanceStudentCardProps {
    student: Student;
    currentStatus?: { status: string };
    isOverlay?: boolean;
    disabled?: boolean;
}

/**
 * Composant représentant une "étiquette" élève déplaçable durant l'appel.
 */
const AttendanceStudentCard: React.FC<AttendanceStudentCardProps> = ({ student, currentStatus, isOverlay = false, disabled = false }) => {
    // Intégration du système de "Drag and Drop" (Glisser-Déposer)
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: student.id,
        data: { student, source: currentStatus ? 'category' : 'unassigned' },
        disabled: disabled, // On désactive le déplacement si l'appel est verrouillé
    });

    // Calcul de la position visuelle durant le déplacement
    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging || isOverlay ? 50 : undefined,
        opacity: isDragging ? 0.5 : (disabled ? 0.8 : 1), // Légère transparence si désactivé ou en cours de déplacement
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "relative flex items-center gap-3 p-2 rounded-xl border border-white/5 transition-all outline-none",
                // Style différent si la carte est verrouillée ou active
                disabled 
                    ? "bg-black/10 cursor-not-allowed border-transparent" 
                    : "bg-surface hover:bg-white/5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing",
                // Effet visuel durant le déplacement
                (isDragging || isOverlay) && "border-primary border-dashed bg-surface/80 backdrop-blur-sm",
                // Petit repère visuel si présent
                currentStatus?.status === 'present' && !isDragging && !isOverlay && "border-l-4 border-l-success"
            )}
        >
            {/* Photo ou initiales de l'élève */}
            <Avatar
                size="sm"
                src={student.photo_url || student.photo_base64 || undefined}
                initials={student.prenom[0]}
                className={clsx(
                    "rounded-lg shadow-inner",
                    disabled && "grayscale opacity-70"
                )}
            />

            {/* Prénom de l'élève */}
            <p className={clsx(
                "font-bold text-sm text-text-main truncate max-w-[100px] pointer-events-none select-none",
                disabled && "text-grey-medium"
            )}>
                {student.prenom}
            </p>

            {/* Petite icône de "poignée" pour indiquer que c'est déplaçable */}
            {!disabled && (
                <div className="ml-auto text-grey-dark/50">
                    <GripVertical size={14} />
                </div>
            )}
        </div>
    );
};

// Utilisation de React.memo pour éviter de redessiner la carte inutilement et gagner en performance
export default React.memo(AttendanceStudentCard);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant voit la liste des élèves "Non assignés".
 * 2. Il survole la carte de 'Lucie'.
 * 3. Il maintient le clic : la carte devient à moitié transparente (`opacity: 0.5`).
 * 4. Il déplace la souris vers la colonne "Cantine".
 * 5. Le système `dnd-kit` suit le mouvement via la propriété `transform`.
 * 6. Au moment où il relâche : l'élève est assigné au nouveau statut et la carte se fixe dans la colonne.
 */
