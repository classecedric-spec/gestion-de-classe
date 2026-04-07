/**
 * Nom du module/fichier : useLayoutPreferences.ts
 * 
 * Données en entrée : 
 *   - `selectedGroupId` : L'identifiant de la classe actuelle.
 *   - `showPendingOnly` : Filtre d'affichage des exercices.
 * 
 * Données en sortie : 
 *   - `columnWidths` / `rowHeights` : Les dimensions personnalisées des colonnes et lignes du Dashboard.
 *   - `isEditMode` : Est-ce qu'on est en train de redimensionner les colonnes ?
 *   - `actions` : Fonctions pour attraper et déplacer les bords des colonnes.
 * 
 * Objectif principal : Mémoriser "l'Atelier sur-mesure" de l'enseignant. Chaque enseignant a ses habitudes : certains veulent une grande colonne pour les aides, d'autres préfèrent voir tout le monde en petit. Ce hook permet de redimensionner chaque zone de l'écran à la souris et enregistre automatiquement ces réglages dans la base de données. Ainsi, quand l'enseignant change d'ordinateur ou de tablette, il retrouve son bureau exactement comme il l'avait laissé.
 * 
 * Ce que ça contient : 
 *   - La détection du mouvement de la souris (Drag & Drop) pour les bordures.
 *   - La conversion des pixels en pourcentages (pour que l'affichage reste beau sur tous les écrans).
 *   - La sauvegarde automatique et silencieuse des réglages (Debounce).
 *   - La gestion du mode "Édition" pour déplacer les séparateurs.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/database';
import { trackingService } from '../services/trackingService';

export interface LayoutValue {
    columnWidths: number[];
    rowHeights: number[];
    selectedGroupId: string | null;
    showPendingOnly: boolean;
}

/**
 * Hook de personnalisation de l'affichage du Dashboard.
 */
export function useLayoutPreferences(selectedGroupId: string | null, showPendingOnly: boolean) {
    // RÉFÉRENCES : Pour mesurer la taille réelle de l'écran.
    const containerRef = useRef<HTMLDivElement>(null);
    const columnRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

    // ÉTATS : Dimensions en POURCENTAGES (pour être adaptable).
    const [columnWidths, setColumnWidths] = useState<number[]>([25, 25, 25]);
    const [rowHeights, setRowHeights] = useState<number[]>([50, 50, 50, 50]);

    const activeColumnResize = useRef<number | null>(null);
    const activeRowResize = useRef<number | null>(null);

    // ÉTATS : Interface
    const [isEditMode, setIsEditMode] = useState(false);
    const [showConfigBtn, setShowConfigBtn] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false);
    const [showSyncSuccess, setShowSyncSuccess] = useState(false);

    /** 
     * ERGONOMIE : 
     * On cache le bouton de config après 5 secondes pour libérer de l'espace visuel.
     */
    useEffect(() => {
        const timer = setTimeout(() => { setShowConfigBtn(false); }, 5000);
        return () => clearTimeout(timer);
    }, []);

    /** 
     * FEEDBACK : 
     * On affiche une petite confirmation quand les réglages sont bien synchronisés.
     */
    useEffect(() => {
        if (!isEditMode && isPreferencesLoaded) {
            const timer = setTimeout(() => setShowSyncSuccess(true), 0);
            const hideTimer = setTimeout(() => setShowSyncSuccess(false), 3000);
            return () => { clearTimeout(timer); clearTimeout(hideTimer); };
        }
    }, [isEditMode, isPreferencesLoaded]);

    /** 
     * ACTIONS : Détection du clic sur une bordure.
     */
    const handleColumnMouseDown = (columnIndex: number) => () => {
        activeColumnResize.current = columnIndex;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const handleRowMouseDown = (columnIndex: number) => () => {
        activeRowResize.current = columnIndex;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    };

    /** 
     * LE MOTEUR DU REDIMENSIONNEMENT : 
     * Calcule en temps réel la nouvelle largeur en fonction de la souris.
     */
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // REDIMENSIONNEMENT DES COLONNES :
            if (activeColumnResize.current !== null && containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                const totalWidth = containerRect.width;
                const colIndex = activeColumnResize.current;

                let previousWidthPercent = 0;
                for (let i = 0; i < colIndex; i++) { previousWidthPercent += columnWidths[i]; }

                const mousePercent = ((e.clientX - containerRect.left) / totalWidth) * 100;
                let newWidth = mousePercent - previousWidthPercent;

                // On empêche de réduire une colonne à moins de 10%.
                setColumnWidths(prev => {
                    const updated = [...prev];
                    updated[colIndex] = Math.max(10, Math.min(80, newWidth));
                    return updated;
                });
            }

            // REDIMENSIONNEMENT DES LIGNES :
            if (activeRowResize.current !== null) {
                const colIndex = activeRowResize.current;
                const colRef = columnRefs.current[colIndex];
                if (colRef) {
                    const colRect = colRef.getBoundingClientRect();
                    const newHeightPercent = ((e.clientY - colRect.top) / colRect.height) * 100;
                    setRowHeights(prev => {
                        const updated = [...prev];
                        updated[colIndex] = Math.max(10, Math.min(90, newHeightPercent));
                        return updated;
                    });
                }
            }
        };

        const handleMouseUp = () => {
            activeColumnResize.current = null;
            activeRowResize.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }, [columnWidths, rowHeights]);

    /** 
     * CHARGEMENT : 
     * Récupère les préférences enregistrées sur le compte Supabase.
     */
    const loadLayoutPreferences = async (): Promise<string | false> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const value = await trackingService.loadUserPreference(user.id, 'suivi_pedagogique_layout');
        let foundGroup: string | false = false;

        if (value) {
            const val = value as any;
            // On vérifie si ce sont de vieux réglages (pixels) pour les convertir ou les ignorer.
            const isLegacy = (val.columnWidths?.some((w: number) => w > 100)) || (val.rowHeights?.some((h: number) => h > 100));
            if (isLegacy) {
                setColumnWidths([25, 25, 25]);
                setRowHeights([50, 50, 50, 50]);
            } else {
                if (val.columnWidths) setColumnWidths(val.columnWidths);
                if (val.rowHeights) setRowHeights(val.rowHeights);
            }
            if (val.selectedGroupId) foundGroup = val.selectedGroupId;
        }

        setIsPreferencesLoaded(true);
        return foundGroup;
    };

    /** 
     * SAUVEGARDE AUTOMATIQUE : 
     * On attend 3 secondes sans bouger la souris avant d'envoyer la nouvelle taille au serveur.
     * C'est transparent pour l'utilisateur.
     */
    useEffect(() => {
        if (!isPreferencesLoaded) return;
        const timer = setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setIsSaving(true);
            try {
                await trackingService.saveUserPreference(user.id, 'suivi_pedagogique_layout', { columnWidths, rowHeights, selectedGroupId, showPendingOnly });
                setLastSaved(new Date());
                setTimeout(() => setIsSaving(false), 2000);
            } catch (error) { setIsSaving(false); }
        }, 3000);
        return () => clearTimeout(timer);
    }, [columnWidths, rowHeights, selectedGroupId, showPendingOnly, isPreferencesLoaded]);

    return {
        states: { columnWidths, rowHeights, isEditMode, showConfigBtn, isSaving, lastSaved, isPreferencesLoaded, showSyncSuccess, containerRef, columnRefs },
        actions: { setIsEditMode, handleColumnMouseDown, handleRowMouseDown, loadLayoutPreferences }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant veut voir plus d'élèves à la fois.
 * 2. ÉDITION : Il active le mode édition. Les séparateurs entre les colonnes apparaissent.
 * 3. MOUVEMENT : Il fait glisser la bordure de la colonne "Élèves" vers la droite.
 * 4. MISE À JOUR : Le hook recalcule les pourcentages (ex: 25% devient 40%). L'écran s'étire en temps réel.
 * 5. MÉMOIRE : Il lâche la souris. Trois secondes plus tard, le logiciel sauvegarde : "Ok, son bureau fait maintenant 40% de largeur pour les élèves".
 * 6. RETOUR : Demain, en ouvrant son PC, l'enseignant retrouve ses colonnes exactement à 40%.
 */
