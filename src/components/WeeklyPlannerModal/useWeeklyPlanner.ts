/**
 * Nom du module/fichier : WeeklyPlannerModal/useWeeklyPlanner.ts
 * 
 * Données en entrée : 
 *   - `isOpen` : Indique si le semainier est ouvert.
 * 
 * Données en sortie : 
 *   - État complet du planning (cours, modules, activités perso).
 *   - Fonctions pour naviguer entre les semaines.
 *   - Logique de Glisser-Déposer (Drag & Drop).
 *   - Logique de redimensionnement des créneaux.
 * 
 * Objectif principal : Centraliser toute l'intelligence du semainier. Ce fichier calcule les dates de début de semaine (Lundi), gère le chargement des données depuis la base, et traite les actions complexes comme le déplacement d'un cours d'un jour à l'autre ou le changement de sa durée.
 * 
 * Ce que ça gère : 
 *   - Le calendrier scolaire (début en Septembre).
 *   - La synchronisation avec Supabase.
 *   - Les "conflits" (pas plus de 4 activités par heure).
 *   - L'extension visuelle d'un créneau (étirer vers le bas).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/database';
import { toast } from 'sonner';
import { Active, Over } from '@dnd-kit/core';
import { Tables } from '../../types/supabase';
import { plannerService } from '../../features/planner/services/plannerService';
import { WeeklyPlanningItem } from '../../features/planner/repositories/IPlannerRepository';
import { SupabaseActivityRepository } from '../../features/activities/repositories/SupabaseActivityRepository';

const activityRepository = new SupabaseActivityRepository();

/**
 * CALCUL : Trouve la date de rentrée (1er septembre) pour générer la liste des semaines.
 */
const getSchoolYearStart = (): Date => {
    const now = new Date();
    const currentYear = now.getFullYear();
    if (now.getMonth() >= 7) { // Si on est en Août ou après
        return new Date(currentYear, 8, 1);
    } else {
        return new Date(currentYear - 1, 8, 1);
    }
};

/**
 * FORMATAGE : Transforme une date en texte "AAAA-MM-JJ" pour la BDD.
 */
const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * RÉFÉRENCE : Trouve le lundi de la semaine d'une date donnée.
 */
const getMonday = (d: Date | string): string => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const newDate = new Date(date.setDate(diff));
    return formatDate(newDate);
};

/**
 * GÉNÉRATION : Crée la liste des 45 semaines de l'année scolaire pour le menu déroulant.
 */
const getWeeksList = () => {
    const start = new Date(getSchoolYearStart());
    const weeks: { label: string; value: string; index: number }[] = [];
    const current = new Date(start);

    // Ajustement au lundi de la rentrée
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);

    for (let i = 0; i < 45; i++) {
        const end = new Date(current);
        end.setDate(current.getDate() + 6);
        const label = `Semaine ${i + 1} (${current.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })})`;
        const value = formatDate(current);
        weeks.push({ label, value, index: i });
        current.setDate(current.getDate() + 7);
    }
    return weeks;
};

/**
 * UTILITAIRE : Trouve le lundi d'une semaine relative (ex: offset=1 pour la semaine prochaine).
 */
export const getRelativeWeekMonday = (offsetWeeks: number): string => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + (offsetWeeks * 7);
    const target = new Date(d.setDate(diff));
    return formatDate(target);
};

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const PERIODS = [1, 2, 3, 4, 5, 6];

export type { WeeklyPlanningItem };

export interface ModuleWithDetails extends Tables<'Module'> {
    SousBranche?: {
        nom: string;
        branche_id: string;
        Branche?: {
            id: string;
            nom: string;
            ordre: number;
        } | null;
    } | null;
    Activite?: {
        id: string;
        ActiviteNiveau?: {
            niveau_id: string;
            Niveau?: { nom: string } | null;
        }[] | null;
    }[] | null;
}

/**
 * HOOK PRINCIPAL : Gère toute la mécanique du Semainier.
 */
export const useWeeklyPlanner = (isOpen: boolean) => {
    const [schedule, setSchedule] = useState<WeeklyPlanningItem[]>([]);
    const [modules, setModules] = useState<ModuleWithDetails[]>([]);
    const [dbError, setDbError] = useState(false);
    const [weeks, setWeeks] = useState<{ label: string; value: string; index: number }[]>([]);
    const [currentWeek, setCurrentWeek] = useState<string>(getMonday(new Date()));
    const [isExporting, setIsExporting] = useState(false);
    const [customActivities, setCustomActivities] = useState<Tables<'custom_activities'>[]>([]);

    // États du Glisser-Déposer
    const [activeDragItem, setActiveDragItem] = useState<any | null>(null);
    const [activeOver, setActiveOver] = useState<{ day: string; period: number } | null>(null);

    // États du redimensionnement (étirer un cours)
    const [resizingItem, setResizingItem] = useState<WeeklyPlanningItem | null>(null);
    const [resizeTargetPeriod, setResizeTargetPeriod] = useState<number | null>(null);

    // Initialisation : Liste des semaines
    useEffect(() => {
        setWeeks(getWeeksList());
    }, []);

    // Chargement : Dès que la fenêtre s'ouvre ou que la semaine change
    useEffect(() => {
        if (isOpen) {
            fetchData();
            fetchModules();
            fetchCustomActivities();
        }
    }, [isOpen, currentWeek]);

    /**
     * CHARGEMENT : Récupère les créneaux déjà enregistrés.
     */
    const fetchData = useCallback(async () => {
        setDbError(false);
        try {
            const data = await plannerService.getPlanningForWeek(currentWeek);
            if (data) {
                setSchedule(data);
            }
        } catch (err: any) {
            console.error("Database Error:", err);
        }
    }, [currentWeek]);

    /**
     * BIBLIOTHÈQUE : Récupère tous les modules disponibles pour les glisser dans le planning.
     */
    const fetchModules = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('Module')
                .select(`
                    *,
                    SousBranche:sous_branche_id (
                        nom,
                        branche_id,
                        Branche:branche_id (id, nom, ordre)
                    ),
                    Activite (
                       id,
                       ActiviteNiveau (niveau_id, Niveau (nom))
                    )
                `)
                .order('nom');
            if (error) throw error;
            setModules((data as any) || []);
        } catch (err) {
            console.error('Error fetching modules:', err);
        }
    }, []);

    /**
     * ACTIVITÉS PERSO : Récupère les libellés créés par l'enseignant (ex: "Cantine").
     */
    const fetchCustomActivities = useCallback(async () => {
        try {
            const data = await activityRepository.getCustomActivities();
            setCustomActivities(data);
        } catch (err) {
            console.error('Error fetching custom activities:', err);
        }
    }, []);

    const handleCreateCustomActivity = useCallback(async (title: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const newActivity = await activityRepository.createCustomActivity(title, user.id);
            if (newActivity) {
                setCustomActivities(prev => [newActivity, ...prev]);
                return newActivity;
            }
        } catch (err) {
            console.error('Error creating custom activity:', err);
        }
        return null;
    }, []);

    const handleDeleteCustomActivity = useCallback(async (id: string) => {
        try {
            await activityRepository.deleteCustomActivity(id);
            setCustomActivities(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting custom activity:', err);
        }
    }, []);

    // Liste filtrée des éléments réellement présents dans la grille
    const plannerItems = schedule.filter(s => s.day_of_week !== 'DOCK');

    /**
     * DROP (DÉPÔT) : Enregistre un nouveau module dans la grille.
     */
    const handleDropFromLibrary = useCallback(async (module: ModuleWithDetails, day: string, period: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newItem = {
            day_of_week: day,
            period_index: period,
            activity_title: module.nom,
            color_code: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            duration: 1,
            week_start_date: currentWeek,
            user_id: user.id
        };

        const data = await plannerService.createPlanningItem(newItem);
        if (data) {
            setSchedule(prev => [...prev, data]);
        }
    }, [currentWeek]);

    const handleDropFromCustom = useCallback(async (activity: Tables<'custom_activities'>, day: string, period: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newItem = {
            day_of_week: day,
            period_index: period,
            activity_title: activity.title,
            color_code: 'bg-green-500/20 text-green-300 border-green-500/30',
            duration: 1,
            week_start_date: currentWeek,
            user_id: user.id
        };

        const data = await plannerService.createPlanningItem(newItem);
        if (data) {
            setSchedule(prev => [...prev, data]);
        }
    }, [currentWeek]);

    // GESTIONNAIRES DE DRAG & DROP
    const handleDragStart = useCallback((event: { active: Active }) => {
        const data = event.active.data.current;
        if (data?.type === 'libraryItem') {
            setActiveDragItem({ activity_title: data.module.nom, ...data.module });
        } else if (data?.type === 'customItem') {
            setActiveDragItem({ activity_title: data.activity.title, ...data.activity });
        } else {
            setActiveDragItem(data?.item || null);
        }
    }, []);

    const handleDragOver = useCallback((event: { over: Over | null }) => {
        const { over } = event;
        setActiveOver(over && over.data.current ? {
            day: over.data.current.day,
            period: over.data.current.period
        } : null);
    }, []);

    const handleDragEnd = useCallback(async (event: { active: Active; over: Over | null }) => {
        const { active, over } = event;
        setActiveDragItem(null);
        setActiveOver(null);

        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current as { day: string; period: number };

        if (!activeData || !overData) return;

        const { day, period } = overData;

        try {
            // Vérification de la place disponible
            const targetItems = plannerItems.filter(p => p.day_of_week === day && p.period_index === period);
            if (targetItems.length >= 4) {
                toast.error("Maximum 4 activités par créneau !");
                return;
            }

            // Cas 1 : Nouvel élément venant des modules
            if (active.data.current?.type === 'libraryItem') {
                const module = active.data.current.module as ModuleWithDetails;
                handleDropFromLibrary(module, day, period);
                return;
            }

            // Cas 2 : Nouvel élément venant des activités perso
            if (active.data.current?.type === 'customItem') {
                const activity = active.data.current.activity as Tables<'custom_activities'>;
                handleDropFromCustom(activity, day, period);
                return;
            }

            // Cas 3 : Déplacement d'un élément déjà dans l'agenda
            const item = activeData.item as WeeklyPlanningItem;
            const isSameSlot = item.day_of_week === day && item.period_index === period;

            if (!isSameSlot) {
                await plannerService.updatePlanningItem(item.id, { day_of_week: day, period_index: period, duration: 1 });
                setSchedule(prev => prev.map(p =>
                    p.id === item.id ? { ...p, day_of_week: day, period_index: period, duration: 1 } : p
                ));
            }
        } catch (err) {
            console.error(err);
            fetchData();
        }
    }, [plannerItems, fetchData, handleDropFromLibrary, handleDropFromCustom]);

    /**
     * SUPPRESSION : Retire un créneau de l'agenda.
     */
    const handleDelete = useCallback(async (id: string) => {
        try {
            await plannerService.deletePlanningItem(id);
            setSchedule(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
        }
    }, []);

    /**
     * EXTENSION : Allonge le cours d'une case vers le bas.
     */
    const handleExtend = useCallback(async (item: WeeklyPlanningItem) => {
        const newDuration = (item.duration || 1) + 1;
        if (item.period_index + newDuration - 1 > 6) return; // Pas plus de 6 périodes par jour

        const targetPeriod = item.period_index + newDuration - 1;
        const conflict = plannerItems.find(p => p.day_of_week === item.day_of_week && p.period_index === targetPeriod);

        // Si une activité bouchait le passage, on la supprime pour faire de la place
        if (conflict) {
            await plannerService.deletePlanningItem(conflict.id);
        }

        try {
            await plannerService.updatePlanningItem(item.id, { duration: newDuration });
            setSchedule(prev => {
                const withoutConflict = prev.filter(p => !conflict || p.id !== conflict.id);
                return withoutConflict.map(p =>
                    p.id === item.id ? { ...p, duration: newDuration } : p
                );
            });
            setResizingItem(null);
            setResizeTargetPeriod(null);
        } catch (err) {
            console.error(err);
        }
    }, [plannerItems]);

    // GESTIONNAIRES DE REDIMENSIONNEMENT À LA SOURIS
    const handleResizeStart = useCallback((e: React.MouseEvent, item: WeeklyPlanningItem) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingItem(item);
        setResizeTargetPeriod(item.period_index + (item.duration - 1));
    }, []);

    const handleResizeMove = useCallback((e: any) => {
        if (!resizingItem) return;
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const slotWithAttr = elements.map(el => el.closest('[data-period]')).find(el => el !== null);

        if (slotWithAttr) {
            const p = parseInt(slotWithAttr.getAttribute('data-period') || '0');
            if (p >= resizingItem.period_index) {
                setResizeTargetPeriod(p);
            }
        }
    }, [resizingItem]);

    const handleResizeUp = useCallback(async () => {
        if (!resizingItem || resizeTargetPeriod === null) return;
        const newDuration = (resizeTargetPeriod - resizingItem.period_index) + 1;
        const finalDuration = Math.min(Math.max(1, newDuration), 6 - resizingItem.period_index + 1);

        try {
            await plannerService.updatePlanningItem(resizingItem.id, { duration: finalDuration });
            setSchedule(prev => prev.map(p =>
                p.id === resizingItem.id ? { ...p, duration: finalDuration } : p
            ));
        } catch (err) {
            console.error(err);
        }
        setResizingItem(null);
        setResizeTargetPeriod(null);
    }, [resizingItem, resizeTargetPeriod]);

    /**
     * RÉDUCTION : Rentre le haut du cours d'une case (le fait commencer plus tard).
     */
    const handleShrinkFromTop = useCallback(async (item: WeeklyPlanningItem) => {
        if ((item.duration || 1) <= 1) return;
        const newPeriod = item.period_index + 1;
        const newDuration = (item.duration || 1) - 1;

        try {
            setSchedule(prev => prev.map(p =>
                p.id === item.id ? { ...p, period_index: newPeriod, duration: newDuration } : p
            ));
            await plannerService.updatePlanningItem(item.id, {
                period_index: newPeriod,
                duration: newDuration
            });
        } catch (err) {
            console.error("Error shrinking item:", err);
            fetchData();
        }
    }, [fetchData]);

    /**
     * VÉRIFICATION : Est-ce qu'un cours plus haut s'étend sur cette case ?
     */
    const isSlotCovered = useCallback((day: string, period: number): boolean => {
        return plannerItems.some(item =>
            item.day_of_week === day &&
            item.period_index < period &&
            (item.period_index + (item.duration || 1)) > period
        );
    }, [plannerItems]);

    // NAVIGATION SEMAINE
    const handlePrevWeek = useCallback(() => {
        const currentIdx = weeks.findIndex(w => w.value === currentWeek);
        if (currentIdx > 0) setCurrentWeek(weeks[currentIdx - 1].value);
    }, [weeks, currentWeek]);

    const handleNextWeek = useCallback(() => {
        const currentIdx = weeks.findIndex(w => w.value === currentWeek);
        if (currentIdx < weeks.length - 1) setCurrentWeek(weeks[currentIdx + 1].value);
    }, [weeks, currentWeek]);

    const currentWeekLabel = weeks.find(w => w.value === currentWeek)?.label || 'Semaine...';

    return {
        // Données brutes
        schedule,
        modules,
        weeks,
        currentWeek,
        setCurrentWeek,
        currentWeekLabel,
        plannerItems,
        customActivities,
        dbError,
        isExporting,
        setIsExporting,

        // Glisser-Déposer
        activeDragItem,
        activeOver,
        handleDragStart,
        handleDragOver,
        handleDragEnd,

        // Activités
        fetchCustomActivities,
        handleCreateCustomActivity,
        handleDeleteCustomActivity,

        // Redimensionnement
        resizingItem,
        resizeTargetPeriod,
        handleResizeStart,
        handleResizeMove,
        handleResizeUp,
        handleShrinkFromTop,

        // Actions CRUD
        handleDelete,
        handleExtend,
        isSlotCovered,
        handlePrevWeek,
        handleNextWeek,
        fetchModules: fetchModules
    };
};

/**
 * LOGIGRAMME DE RÉFLEXION DU HOOK :
 * 
 * 1. ÉVÈNEMENT -> L'utilisateur dépose un module sur Mardi Période 3.
 * 2. ANALYSE -> `handleDragEnd` regarde : Y a-t-il déjà 4 choses là ? Non.
 * 3. SAUVEGARDE -> Création d'un objet `WeeklyPlanningItem` et envoi vers `plannerService.createPlanningItem`.
 * 4. SYNCHRO -> Dès que la BDD confirme, la liste locale `schedule` est mise à jour.
 * 5. RENDU -> L'agenda se redessine avec le nouveau module affiché.
 */
