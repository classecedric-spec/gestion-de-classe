import { useState, useEffect, useRef, MutableRefObject } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export interface LayoutValue {
    columnWidths: number[];
    rowHeights: number[];
    selectedGroupId: string | null;
    showPendingOnly: boolean;
}

/**
 * useLayoutPreferences
 * Manages resizable layout preferences, edit mode, and auto-save
 * 
 * @param {string | null} selectedGroupId - Currently selected group ID for saving preferences
 * @param {boolean} showPendingOnly - Filter state to save
 * @returns {object} Layout state and actions
 */
export function useLayoutPreferences(selectedGroupId: string | null, showPendingOnly: boolean) {
    // Container and column refs
    const containerRef = useRef<HTMLDivElement>(null);
    const columnRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

    // Resize state (PERCENTAGES)
    // Columns: Width of first 3 columns in %. 4th column is flex-1.
    const [columnWidths, setColumnWidths] = useState<number[]>([25, 25, 25]);
    // Rows: Height of TOP section in %. Bottom section is flex-1.
    const [rowHeights, setRowHeights] = useState<number[]>([50, 50, 50, 50]);

    const activeColumnResize = useRef<number | null>(null);
    const activeRowResize = useRef<number | null>(null);

    // UI state
    const [isEditMode, setIsEditMode] = useState(false);
    const [showConfigBtn, setShowConfigBtn] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false);
    const [showSyncSuccess, setShowSyncSuccess] = useState(false);

    // Hide config button after 5s
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowConfigBtn(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Show sync success when leaving edit mode
    useEffect(() => {
        if (!isEditMode && isPreferencesLoaded) {
            // Avoid immediate state update to prevent sync issues or cascading renders
            const timer = setTimeout(() => setShowSyncSuccess(true), 0);
            const hideTimer = setTimeout(() => setShowSyncSuccess(false), 3000);
            return () => {
                clearTimeout(timer);
                clearTimeout(hideTimer);
            };
        }
    }, [isEditMode, isPreferencesLoaded]);


    // Mouse handlers for resize
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

    // Mouse move/up listeners
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Column resize (PERCENTAGE)
            if (activeColumnResize.current !== null && containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                const totalWidth = containerRect.width;
                const colIndex = activeColumnResize.current;

                // Previous columns width in %
                let previousWidthPercent = 0;
                for (let i = 0; i < colIndex; i++) {
                    previousWidthPercent += columnWidths[i];
                }

                // Calculate mouse position relative to container left
                const mouseRawX = e.clientX - containerRect.left;

                // Convert mouse position to overall percentage 
                const mousePercent = (mouseRawX / totalWidth) * 100;

                // New width for this column is Mouse% - Previous%
                let newLabelWidth = mousePercent - previousWidthPercent;

                // Constraints (min 10%, max 80% to imply some flex constraints)
                const minWidth = 10;
                const maxWidth = 80;

                setColumnWidths(prev => {
                    const updated = [...prev];
                    updated[colIndex] = Math.max(minWidth, Math.min(maxWidth, newLabelWidth));
                    return updated;
                });
            }

            // Row resize (PERCENTAGE)
            if (activeRowResize.current !== null) {
                const colIndex = activeRowResize.current;
                const colRef = columnRefs.current[colIndex];

                if (colRef) {
                    const colRect = colRef.getBoundingClientRect();
                    const totalHeight = colRect.height;

                    // Mouse relative to column top
                    const mouseRawY = e.clientY - colRect.top;

                    // Convert to percentage
                    const newHeightPercent = (mouseRawY / totalHeight) * 100;

                    // Constraints (min 10%, max 90%)
                    const minHeight = 10;
                    const maxHeight = 90;

                    setRowHeights(prev => {
                        const updated = [...prev];
                        updated[colIndex] = Math.max(minHeight, Math.min(maxHeight, newHeightPercent));
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

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [columnWidths, rowHeights, isEditMode]);

    // Load preferences from Supabase
    const loadLayoutPreferences = async (): Promise<string | false> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'suivi_pedagogique_layout')
            .maybeSingle();

        let foundGroup: string | false = false;

        if (data?.value) {
            const val = data.value as any;

            // Check for legacy pixel values (if any width > 100, it's pixels)
            const isLegacy = (val.columnWidths && val.columnWidths.some((w: number) => w > 100)) ||
                (val.rowHeights && val.rowHeights.some((h: number) => h > 100));

            if (isLegacy) {
                // RESET defaults if legacy
                setColumnWidths([25, 25, 25]);
                setRowHeights([50, 50, 50, 50]);
            } else {
                if (val.columnWidths) setColumnWidths(val.columnWidths);
                if (val.rowHeights) setRowHeights(val.rowHeights);
            }

            if (val.selectedGroupId) {
                foundGroup = val.selectedGroupId;
            }
        }

        setIsPreferencesLoaded(true);
        return foundGroup; // Return group ID if found
    };

    // Save preferences (debounced)
    useEffect(() => {
        if (!isPreferencesLoaded) return;

        const timer = setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setIsSaving(true);
            const { error } = await supabase.from('UserPreference').upsert({
                user_id: user.id,
                key: 'suivi_pedagogique_layout',
                value: {
                    columnWidths,
                    rowHeights,
                    selectedGroupId,
                    showPendingOnly
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });

            if (!error) {
                setLastSaved(new Date());
                setTimeout(() => setIsSaving(false), 2000);
            } else {
                setIsSaving(false);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [columnWidths, rowHeights, selectedGroupId, showPendingOnly, isPreferencesLoaded]);

    return {
        states: {
            columnWidths,
            rowHeights,
            isEditMode,
            showConfigBtn,
            isSaving,
            lastSaved,
            isPreferencesLoaded,
            showSyncSuccess,
            containerRef,
            columnRefs
        },
        actions: {
            setIsEditMode,
            handleColumnMouseDown,
            handleRowMouseDown,
            loadLayoutPreferences
        }
    };
}
