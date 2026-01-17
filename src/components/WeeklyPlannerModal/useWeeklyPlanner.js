import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

// Helper: Get start of school year (Sept 1st)
const getSchoolYearStart = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    if (now.getMonth() >= 7) {
        return new Date(currentYear, 8, 1);
    } else {
        return new Date(currentYear - 1, 8, 1);
    }
};

// Helper: Format date to YYYY-MM-DD local
const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Helper: Get current week Monday
const getMonday = (d) => {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return formatDate(new Date(d.setDate(diff)));
};

// Helper: Get weeks list
const getWeeksList = () => {
    const start = new Date(getSchoolYearStart());
    const weeks = [];
    let current = new Date(start);
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

// Helper: Get relative week Monday
export const getRelativeWeekMonday = (offsetWeeks) => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + (offsetWeeks * 7);
    const target = new Date(d.setDate(diff));
    return formatDate(target);
};

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const PERIODS = [1, 2, 3, 4, 5, 6];

/**
 * useWeeklyPlanner
 * Hook principal pour la gestion du planning hebdomadaire
 */
export const useWeeklyPlanner = (isOpen) => {
    const [schedule, setSchedule] = useState([]);
    const [modules, setModules] = useState([]);
    const [dbError, setDbError] = useState(false);
    const [weeks, setWeeks] = useState([]);
    const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
    const [isExporting, setIsExporting] = useState(false);

    // Drag & Drop state
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [activeOver, setActiveOver] = useState(null);

    // Resize state
    const [resizingItem, setResizingItem] = useState(null);
    const [resizeTargetPeriod, setResizeTargetPeriod] = useState(null);

    // Setup weeks on mount
    useEffect(() => {
        setWeeks(getWeeksList());
    }, []);

    // Fetch data when modal open or week changes
    useEffect(() => {
        if (isOpen) {
            fetchData();
            fetchModules();
        }
    }, [isOpen, currentWeek]);

    const fetchData = useCallback(async () => {
        setDbError(false);
        try {
            const { data: planningData, error } = await supabase
                .from('weekly_planning')
                .select('*')
                .eq('week_start_date', currentWeek);

            if (error) throw error;
            if (planningData) setSchedule(planningData);
        } catch (err) {
            console.error("Database Error:", err);
            if (err.message?.includes('week_start_date')) {
                setDbError(true);
                const { data } = await supabase.from('weekly_planning').select('*');
                if (data) setSchedule(data);
            }
        }
    }, [currentWeek]);

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
            setModules(data || []);
        } catch (err) {
            console.error('Error fetching modules:', err);
        }
    }, []);

    // Derived data
    const dockItems = schedule.filter(s => s.day_of_week === 'DOCK');
    const plannerItems = schedule.filter(s => s.day_of_week !== 'DOCK');

    // Dock toggle
    const handleToggleDock = useCallback(async (module, isCurrentlyDocked) => {
        if (isCurrentlyDocked) {
            const itemToDelete = dockItems.find(i => i.activity_title === module.nom);
            if (itemToDelete) {
                await supabase.from('weekly_planning').delete().eq('id', itemToDelete.id);
                setSchedule(prev => prev.filter(p => p.id !== itemToDelete.id));
            }
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const newItem = {
                day_of_week: 'DOCK',
                period_index: 0,
                activity_title: module.nom,
                color_code: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                duration: 1,
                week_start_date: currentWeek,
                user_id: user?.id
            };
            const { data, error } = await supabase.from('weekly_planning').insert([newItem]).select();
            if (!error && data) {
                setSchedule(prev => [...prev, data[0]]);
            }
        }
    }, [currentWeek, dockItems]);

    // Drag handlers
    const handleDragStart = useCallback((event) => {
        setActiveDragItem(event.active.data.current.item);
    }, []);

    const handleDragOver = useCallback((event) => {
        const { over } = event;
        setActiveOver(over ? over.data.current : null);
    }, []);

    const handleDragEnd = useCallback(async (event) => {
        const { active, over } = event;
        setActiveDragItem(null);
        setActiveOver(null);

        if (!over) return;

        const item = active.data.current.item;
        const { day, period } = over.data.current;

        try {
            const targetItems = plannerItems.filter(p => p.day_of_week === day && p.period_index === period);
            const isSameSlot = item.day_of_week === day && item.period_index === period;

            if (!isSameSlot && targetItems.length >= 4) {
                toast.error("Maximum 4 activités par créneau !");
                return;
            }

            const { error } = await supabase
                .from('weekly_planning')
                .update({ day_of_week: day, period_index: period, duration: 1 })
                .eq('id', item.id);

            if (error) throw error;

            setSchedule(prev => prev.map(p =>
                p.id === item.id ? { ...p, day_of_week: day, period_index: period, duration: 1 } : p
            ));
        } catch (err) {
            console.error(err);
            fetchData();
        }
    }, [plannerItems, fetchData]);

    // Delete (return to dock)
    const handleDelete = useCallback(async (id) => {
        try {
            await supabase
                .from('weekly_planning')
                .update({ day_of_week: 'DOCK', period_index: 0, duration: 1 })
                .eq('id', id);

            setSchedule(prev => prev.map(s =>
                s.id === id ? { ...s, day_of_week: 'DOCK', period_index: 0, duration: 1 } : s
            ));
        } catch (err) {
            console.error("Error returning to dock:", err);
        }
    }, []);

    // Permanent delete
    const handlePermanentDelete = useCallback(async (id) => {
        try {
            await supabase.from('weekly_planning').delete().eq('id', id);
            setSchedule(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Error deleting permanently:", err);
        }
    }, []);

    // Extend duration
    const handleExtend = useCallback(async (item) => {
        const newDuration = (item.duration || 1) + 1;
        if (item.period_index + newDuration - 1 > 6) return;

        const targetPeriod = item.period_index + newDuration - 1;
        const conflict = plannerItems.find(p => p.day_of_week === item.day_of_week && p.period_index === targetPeriod);

        if (conflict) {
            await supabase.from('weekly_planning').delete().eq('id', conflict.id);
        }

        try {
            await supabase
                .from('weekly_planning')
                .update({ duration: newDuration })
                .eq('id', item.id);

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

    // Resize handlers
    const handleResizeStart = useCallback((e, item) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingItem(item);
        setResizeTargetPeriod(item.period_index + (item.duration - 1));
    }, []);

    const handleResizeMove = useCallback((e) => {
        if (!resizingItem) return;
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const slotWithAttr = elements.map(el => el.closest('[data-period]')).find(el => el !== null);

        if (slotWithAttr) {
            const p = parseInt(slotWithAttr.getAttribute('data-period'));
            if (p >= resizingItem.period_index) {
                setResizeTargetPeriod(p);
            }
        }
    }, [resizingItem]);

    const handleResizeUp = useCallback(async () => {
        if (!resizingItem) return;

        const newDuration = (resizeTargetPeriod - resizingItem.period_index) + 1;
        const finalDuration = Math.min(Math.max(1, newDuration), 6 - resizingItem.period_index + 1);

        try {
            await supabase
                .from('weekly_planning')
                .update({ duration: finalDuration })
                .eq('id', resizingItem.id);

            setSchedule(prev => prev.map(p =>
                p.id === resizingItem.id ? { ...p, duration: finalDuration } : p
            ));
        } catch (err) {
            console.error(err);
        }

        setResizingItem(null);
        setResizeTargetPeriod(null);
    }, [resizingItem, resizeTargetPeriod]);

    // Slot coverage check
    const isSlotCovered = useCallback((day, period) => {
        return plannerItems.some(item =>
            item.day_of_week === day &&
            item.period_index < period &&
            (item.period_index + (item.duration || 1)) > period
        );
    }, [plannerItems]);

    // Week navigation
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
        // Data
        schedule,
        modules,
        weeks,
        currentWeek,
        setCurrentWeek,
        currentWeekLabel,
        dockItems,
        plannerItems,
        dbError,
        isExporting,
        setIsExporting,

        // Drag & Drop
        activeDragItem,
        activeOver,
        handleDragStart,
        handleDragOver,
        handleDragEnd,

        // Resize
        resizingItem,
        resizeTargetPeriod,
        handleResizeStart,
        handleResizeMove,
        handleResizeUp,

        // Actions
        handleToggleDock,
        handleDelete,
        handlePermanentDelete,
        handleExtend,
        isSlotCovered,
        handlePrevWeek,
        handleNextWeek,
        fetchData
    };
};
