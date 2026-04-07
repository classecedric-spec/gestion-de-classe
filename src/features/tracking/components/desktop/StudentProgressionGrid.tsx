/**
 * Nom du module/fichier : StudentProgressionGrid.tsx
 * 
 * Données en entrée : 
 *   - `students` : La liste des élèves du groupe sélectionné.
 *   - `onStudentSelect` : Fonction déclenchée quand un enseignant clique sur la photo d'un enfant.
 *   - `loading` : État indiquant si les photos sont en cours de chargement.
 * 
 * Données en sortie : 
 *   - Une grille intelligente de "bulles" (portraits) qui s'adapte automatiquement à la taille de l'écran. 
 * 
 * Objectif principal : Offrir le "Trombinoscope" de la classe. C'est l'écran par défaut du dashboard qui permet de choisir un élève pour voir ses progrès. Sa particularité est de calculer mathématiquement la taille idéale de chaque portrait pour qu'ils rentrent tous parfaitement dans l'espace disponible, qu'il y ait 5 ou 30 élèves.
 * 
 * Ce que ça affiche : Une série de ronds contenant soit la photo de l'élève, soit ses initiales si la photo n'est pas disponible.
 */

import React, { useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getInitials } from '../../../../lib/helpers/utils';
import { calculateBubbleSize } from '../../utils/progressionHelpers';
import { Student } from '../../../attendance/services/attendanceService';

interface StudentProgressionGridProps {
    students: Student[];
    onStudentSelect: (student: Student) => void;
    loading?: boolean;
}

/**
 * Grille adaptative de portraits d'élèves (Trombinoscope dynamique).
 */
const StudentProgressionGrid: React.FC<StudentProgressionGridProps> = ({
    students,
    onStudentSelect,
    loading
}) => {
    // RÉFÉRENCE : On a besoin de connaître la taille exacte de la zone d'affichage (le rectangle parent).
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    /** 
     * MESURE DYNAMIQUE : 
     * Cette fonction surveille la taille de la fenêtre. Si l'enseignant redimensionne ses colonnes, 
     * la grille se recalcule immédiatement pour que les bulles restent jolies.
     */
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                // On utilise requestAnimationFrame pour une fluidité parfaite sans saccades.
                window.requestAnimationFrame(() => {
                    const { width, height } = entry.contentRect;
                    if (width > 0 && height > 0) {
                        setDimensions({ width, height });
                    }
                });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    /** 
     * CALCUL DU LAYOUT : 
     * C'est le "Cerveau" du composant. Il utilise une formule mathématique pour répartir 
     * les élèves en colonnes et lignes en maximisant la taille des photos.
     */
    const layout = useMemo(() => {
        const gap = 8;
        const padding = 16;
        const availableWidth = Math.max(0, dimensions.width - padding);
        const availableHeight = Math.max(0, dimensions.height - padding);
        const sizingCount = (students || []).length;

        if (availableWidth <= 0 || availableHeight <= 0 || sizingCount === 0) {
            return { cols: 1, bubbleSize: 40, fontSize: 14, gap };
        }

        // On appelle un assistant externe pour faire le calcul géométrique.
        const { cols, bubbleSize } = calculateBubbleSize(availableWidth, availableHeight, sizingCount);
        const fontSize = Math.max(14, Math.min(Math.floor(bubbleSize * 0.35), 40));

        return {
            cols: isNaN(cols) ? 1 : Math.max(1, cols),
            bubbleSize: isNaN(bubbleSize) ? 40 : Math.max(20, bubbleSize),
            fontSize: isNaN(fontSize) ? 14 : fontSize,
            gap
        };
    }, [dimensions, students?.length]);

    const handleSelect = useCallback((student: Student) => {
        if (student && onStudentSelect) {
            onStudentSelect(student);
        }
    }, [onStudentSelect]);

    /** 
     * GÉNÉRATION DE LA GRILLE : 
     * Une fois les calculs faits, on dessine chaque bouton (bulle) avec ses propriétés.
     */
    const gridContent = useMemo(() => {
        if (dimensions.width <= 0 || dimensions.height <= 0 || !students || students.length === 0) return null;

        const { cols, bubbleSize, fontSize, gap } = layout;

        return (
            <div
                className="grid p-2 animate-in fade-in slide-in-from-left-4 duration-300 transition-all ease-out"
                style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, ${bubbleSize}px))`,
                    gap: `${gap}px`,
                    justifyContent: 'center',
                    alignContent: 'center',
                    width: '100%',
                    height: '100%'
                }}
            >
                {students.map(student => (
                    <button
                        key={student?.id || Math.random().toString()}
                        onClick={() => handleSelect(student)}
                        className="rounded-full flex items-center justify-center border border-white/10 hover:border-primary/50 hover:scale-105 transition-all relative group overflow-hidden bg-surface shadow-lg"
                        style={{ width: bubbleSize, height: bubbleSize }}
                        title={`${student?.prenom || ''} ${student?.nom || ''}`}
                        aria-label={`Élève : ${student?.prenom || ''} ${student?.nom || ''}`}
                    >
                        {/* Affichage Photo VS Initiales */}
                        {(student?.photo_url || (student as any)?.photo_base64) ? (
                            <img
                                src={student.photo_url || (student as any).photo_base64 || ''}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <span
                                className="font-bold text-primary"
                                style={{ fontSize: `${fontSize}px` }}
                            >
                                {getInitials(student)}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    }, [students, layout, handleSelect, dimensions.width, dimensions.height]);

    // Rendu en cas de chargement des données.
    if (loading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-primary" />
            </div>
        );
    }

    try {
        return (
            <div ref={containerRef} className="w-full h-full overflow-hidden min-h-[50px]">
                {gridContent}
            </div>
        );
    } catch (error) {
        console.error("CRASH in StudentProgressionGrid render:", error);
        return <div className="p-4 text-xs text-danger border border-danger/20 rounded-xl">Erreur d'affichage de la grille</div>;
    }
};

export default StudentProgressionGrid;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CHARGEMENT : L'enseignant ouvre son dashboard. Le composant reçoit la liste de 24 élèves.
 * 2. ANALYSE : Le composant mesure que l'écran fait 800 pixels de large.
 * 3. CALCUL : Il décide que pour 24 élèves, faire 6 colonnes de 4 élèves est le meilleur choix visuel.
 * 4. DESSIN : 24 petites "bulles" rondes avec les photos des enfants apparaissent au centre.
 * 5. ACTION : L'enseignant réduit la taille de sa fenêtre.
 * 6. RÉACTION : Immédiatement, le composant détecte le manque d'espace et repasse en 4 colonnes, en réduisant la taille des portraits pour que tout reste visible sans faire défiler la page (pas d'ascenseur).
 * 7. SÉLECTION : L'enseignant clique sur la photo de Thomas pour commencer son suivi.
 */
