/**
 * Nom du module/fichier : WeeklyPlannerModal/PlannerComponents.tsx
 * 
 * Données en entrée : 
 *   - `PlannerSlot` : Coordonnées (jour/heure), liste des cours dans cette case, fonctions d'action (supprimer, étendre).
 *   - `DraggableLibraryItem` : Données du module à afficher dans la bibliothèque.
 *   - `DraggableCustomItem` : Données de l'activité personnalisée.
 * 
 * Données en sortie : 
 *   - Rendu visuel d'un créneau (avec sa couleur et ses infos).
 *   - Rendu visuel des éléments déplaçables.
 * 
 * Objectif principal : Fournir les "briques" visuelles qui composent la grille du semainier. Ce fichier gère l'apparence des cours dans l'agenda, leur mode "carousel" (si plusieurs activités sont à la même heure), et les poignées interactives pour étirer ou réduire la durée d'un cours.
 * 
 * Ce que ça gère : 
 *   - L'affichage des branches (Français, Math, etc.) avec des couleurs spécifiques.
 *   - Le système de "poignée" (handle) en haut et en bas pour changer la durée.
 *   - Les boutons de navigation si une case contient plusieurs activités.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DAYS, PERIODS, WeeklyPlanningItem, ModuleWithDetails } from './useWeeklyPlanner';
import { Tables } from '../../types/supabase';
import clsx from 'clsx';

/**
 * COMPOSANT : Case de planning (Slot)
 * C'est l'élément dans la grille qui reçoit les éléments déposés.
 */
interface PlannerSlotProps {
    dayIndex: number;
    periodIndex: number;
    items: WeeklyPlanningItem[];
    onDelete: (id: string) => void;
    onResizeStart: (e: React.MouseEvent, item: WeeklyPlanningItem) => void;
    onExtend: (item: WeeklyPlanningItem) => void;
    onShrink: (item: WeeklyPlanningItem) => void;
    isPlaceholder?: boolean; // Vrai si cette case est "cachée" par un cours qui déborde au-dessus
    isOver?: boolean;       // Vrai si on est en train de survoler la case avec un objet
    isDisabled?: boolean;   // Vrai pour le mercredi après-midi par exemple
    modules?: ModuleWithDetails[];
}

export const PlannerSlot: React.FC<PlannerSlotProps & React.HTMLAttributes<HTMLDivElement>> = ({
    dayIndex,
    periodIndex,
    items,
    onDelete,
    onResizeStart,
    onExtend,
    onShrink,
    isPlaceholder,
    isOver,
    isDisabled,
    modules,
    ...props
}) => {
    // Configuration de la zone de dépôt (Drop Zone)
    const { setNodeRef } = useDroppable({
        id: `${DAYS[dayIndex]}-${PERIODS[periodIndex]}`,
        data: { day: DAYS[dayIndex], period: PERIODS[periodIndex] },
        disabled: isDisabled
    });

    // Gestion du carousel si plusieurs objets sont dans le même créneau
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFilling, setIsFilling] = useState(false);
    const [isShrinking, setIsShrinking] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const shrinkTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Réinitialise l'index si la liste d'objets change
    useEffect(() => {
        if (!items || items.length === 0) setCurrentIndex(0);
        else if (currentIndex >= items.length) setCurrentIndex(0);
    }, [items?.length]);

    const currentItem = items && items[currentIndex];
    const moduleInfo = currentItem ? modules?.find(m => m.nom === currentItem.activity_title) : null;
    const branchInfo = moduleInfo?.SousBranche?.Branche?.nom;
    const subBranchInfo = moduleInfo?.SousBranche?.nom;
    const duration = currentItem ? (currentItem.duration || 1) : 1;

    /**
     * EXTENSION (BAS) : Logique de clic long sur la poignée du bas.
     */
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!currentItem) return;
        onResizeStart(e, currentItem);
        setIsFilling(true);
        timerRef.current = setTimeout(() => {
            onExtend(currentItem);
            setIsFilling(false);
        }, 500);
    };

    const clearTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsFilling(false);
    };

    /**
     * RÉDUCTION (HAUT) : Logique de clic long sur la poignée du haut.
     */
    const handleTopMouseDown = (e: React.MouseEvent) => {
        if (!currentItem || duration <= 1) return;
        e.stopPropagation(); // Empêche de commencer un glissement par erreur
        setIsShrinking(true);
        shrinkTimerRef.current = setTimeout(() => {
            onShrink(currentItem);
            setIsShrinking(false);
        }, 500);
    };

    const clearTopTimer = () => {
        if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
        setIsShrinking(false);
    };

    const nextItem = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % items.length); };
    const prevItem = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + items.length) % items.length); };

    // Style de placement dans la grille CSS Parent
    const gridStyle: React.CSSProperties = {
        gridColumn: dayIndex + 2,
        gridRow: `${periodIndex + 2} / span ${duration}`,
    };

    if (isPlaceholder) return null;

    return (
        <div
            ref={setNodeRef}
            {...{ style: gridStyle }}
            {...props}
            className={`
                relative rounded-xl border transition-all flex flex-col items-start justify-start text-left p-2.5 group
                ${isOver ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_35%,transparent)] z-10' : ''}
                ${isDisabled ? 'bg-black/80 border-white/5 opacity-50 cursor-not-allowed' : (currentItem ? `${currentItem.color_code || ''} border-white/10` : 'border-border bg-surface/50 h-full min-h-0')}
                ${items && items.length > 1 ? '!border-purple-accent !border-[3px] shadow-[0_0_10px_color-mix(in_srgb,var(--purple-accent)_45%,transparent)]' : ''}
            `}
        >
            {/* Cas d'une cellule désactivée (ex: vacances ou mercredi PM) */}
            {isDisabled && !currentItem && (
                <div className="flex flex-col items-center gap-1 w-full h-full justify-center">
                    <Calendar size={18} className="text-white/20" />
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">OFF</span>
                </div>
            )}

            {/* Contenu de l'activité déposée */}
            {currentItem ? (
                <>
                    {/* Contrôles du carousel si plusieurs activités */}
                    {items.length > 1 && (
                        <div className="absolute top-1 right-8 flex items-center gap-1 z-30">
                            <button onClick={prevItem} className="p-0.5 hover:bg-black/20 rounded text-white/80" title="Activité précédente"><ChevronLeft size={10} /></button>
                            <span className="text-[9px] font-bold text-white/90">{currentIndex + 1}/{items.length}</span>
                            <button onClick={nextItem} className="p-0.5 hover:bg-black/20 rounded text-white/80" title="Activité suivante"><ChevronRight size={10} /></button>
                        </div>
                    )}

                    <div className="flex flex-col gap-0.5 w-full mt-1">
                        <span className="font-bold text-sm line-clamp-2 text-white leading-tight text-left pr-6">{currentItem.activity_title}</span>
                        {(branchInfo || subBranchInfo) && (
                            <span className="text-[9px] text-white/70 line-clamp-1 italic font-medium text-left">
                                {branchInfo}{subBranchInfo ? ` > ${subBranchInfo}` : ''}
                            </span>
                        )}
                    </div>

                    {/* Bouton de suppression rapide */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(currentItem.id); }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-black/30 rounded text-white/70 hover:text-red-400 transition-all z-30"
                        title="Supprimer ce créneau"
                    >
                        <Trash2 size={12} />
                    </button>

                    {/* POIGNÉE DU HAUT : Pour réduire le cours (si durée > 1) */}
                    {duration > 1 && (
                        <div
                            onMouseDown={handleTopMouseDown}
                            onMouseUp={clearTopTimer}
                            onMouseLeave={clearTopTimer}
                            className={`absolute top-0 inset-x-0 h-4 cursor-n-resize flex items-start justify-center pt-1 opacity-0 group-hover:opacity-100 transition-all rounded-t-xl z-20 overflow-hidden ${isShrinking ? 'bg-red-500/20 !opacity-100' : 'hover:bg-red-500/10'}`}
                        >
                            <div className={`h-1 rounded-full transition-all ease-out ${isShrinking ? 'w-[80%] bg-red-400 duration-[500ms]' : 'w-8 bg-white/30 duration-300'}`}></div>
                        </div>
                    )}

                    {!isShrinking && <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white/50"></div>}

                    {/* POIGNÉE DU BAS : Pour étendre la durée du cours */}
                    <div
                        onMouseDown={handleMouseDown}
                        onMouseUp={clearTimer}
                        onMouseLeave={clearTimer}
                        className={`absolute bottom-0 inset-x-0 h-4 cursor-s-resize flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-all rounded-b-xl z-20 overflow-hidden ${isFilling ? 'bg-black/20 !opacity-100' : 'hover:bg-black/10'}`}
                    >
                        <div className={`h-1 rounded-full transition-all ease-out ${isFilling ? 'w-[80%] bg-emerald-400 duration-[500ms]' : 'w-8 bg-white/30 duration-300'}`}></div>
                    </div>
                </>
            ) : (
                /* État vide invitant à déposer */
                <div className="opacity-0 group-hover:opacity-100 text-xs text-grey-medium uppercase font-bold tracking-widest scale-90 duration-300 w-full h-full flex items-center justify-center">
                    Déposer
                </div>
            )}
        </div>
    );
};

/**
 * COMPOSANT : Élément déplaçable de la bibliothèque (Module)
 */
interface DraggableLibraryItemProps {
    module: ModuleWithDetails;
}

export const DraggableLibraryItem: React.FC<DraggableLibraryItemProps> = ({ module }) => {
    // Rend l'élément manipulable à la souris
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `lib-${module.id}`,
        data: { type: 'libraryItem', module }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: 0.5,
        zIndex: 100,
    } : undefined;

    // Détermination de la couleur selon la branche
    const branchName = module.SousBranche?.Branche?.nom;
    const branchColor = branchName === 'Français' ? 'text-blue-400 bg-blue-500/10' :
                        branchName === 'Mathématiques' ? 'text-red-400 bg-red-500/10' :
                        branchName === 'Eveil' ? 'text-emerald-400 bg-emerald-500/10' :
                        'text-grey-medium bg-white/5';

    return (
        <div
            ref={setNodeRef}
            {...{ style }}
            {...listeners}
            {...attributes}
            className="group relative bg-surface-dark/40 hover:bg-input border border-white/5 hover:border-primary/50 p-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-sm hover:shadow-md select-none"
        >
            <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[11px] text-text-main line-clamp-2 leading-tight">
                    {module.nom}
                </span>
                {module.SousBranche && (
                    <div className={clsx("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md w-fit", branchColor)}>
                        {module.SousBranche.nom}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * COMPOSANT : Activité personnalisée déplaçable (ex: "Conseil")
 */
interface DraggableCustomItemProps {
    activity: Tables<'custom_activities'>;
    onDelete: (id: string) => void;
}

export const DraggableCustomItem: React.FC<DraggableCustomItemProps> = ({ activity, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `custom-${activity.id}`,
        data: { 
            type: 'libraryItem', // On triche en disant que c'est un libraryItem pour simplifier la logique de drop
            module: { nom: activity.title, isCustom: true } 
        }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: 0.5,
        zIndex: 100,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            {...{ style }}
            {...listeners}
            {...attributes}
            className="group relative bg-surface-dark/40 hover:bg-input border border-white/5 hover:border-primary/50 p-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-sm hover:shadow-md select-none flex items-center justify-between"
        >
            <div className="flex flex-col gap-1 pr-6">
                <span className="font-bold text-[11px] text-text-main line-clamp-2 leading-tight">
                    {activity.title}
                </span>
                <div className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md w-fit text-amber-400 bg-amber-500/10">
                    Perso
                </div>
            </div>
            
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-danger/10 rounded-lg text-grey-medium hover:text-danger transition-all"
                title="Supprimer définitivement"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
};

/**
 * COMPOSANT : Champ pour créer une nouvelle activité de texte
 */
interface AddCustomActivityInputProps {
    onAdd: (title: string) => void;
}

export const AddCustomActivityInput: React.FC<AddCustomActivityInputProps> = ({ onAdd }) => {
    const [text, setText] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = () => {
        if (text.trim()) {
            onAdd(text.trim());
            setText('');
            setIsAdding(false);
        }
    };

    if (!isAdding) {
        return (
            <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 hover:border-primary/50 text-grey-medium hover:text-primary transition-all text-xs font-bold uppercase tracking-wider"
            >
                <Plus size={14} /> Ajouter une activité
            </button>
        );
    }

    return (
        <div className="space-y-2 p-3 bg-white/5 rounded-xl border border-primary/30 animate-in fade-in slide-in-from-top-2 duration-200">
            <input
                autoFocus
                type="text"
                placeholder="Ex: Échecs, Réunion..."
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                    if (e.key === 'Escape') setIsAdding(false);
                }}
            />
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setIsAdding(false)}
                    className="px-2 py-1 text-[10px] text-grey-medium hover:text-text-main uppercase font-bold"
                >
                    Annuler
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!text.trim()}
                    className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded-lg text-[10px] font-bold uppercase disabled:opacity-50"
                >
                    Créer
                </button>
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME VISUEL :
 * 
 * 1. RENDU -> Chaque `PlannerSlot` demande à `useDroppable` d'être une zone de réception.
 * 2. INTERACTION -> Quand l'utilisateur glisse un `DraggableLibraryItem` dessus, `isOver` devient vrai (effet visuel).
 * 3. ÉTENSION -> Un appui long (MouseDown) sur la poignée du bas lance un timer de 500ms avant d'étendre la durée.
 * 4. MULTIPLES -> Si le Slot a plusieurs `items`, il affiche des flèches pour swaper l'affichage entre eux.
 */
