import React from 'react';
import clsx from 'clsx';

export type Orientation = 'vertical' | 'horizontal';

interface ColumnResizeHandleProps {
    orientation?: Orientation;
    onMouseDown: (event: React.MouseEvent) => void;
    isEditMode: boolean;
}

/**
 * ColumnResizeHandle
 * Draggable handle for resizing columns or rows
 */
const ColumnResizeHandle = React.memo<ColumnResizeHandleProps>(({
    orientation = 'vertical',
    onMouseDown,
    isEditMode
}) => {
    const isVertical = orientation === 'vertical';

    return (
        <div
            onMouseDown={onMouseDown}
            className={clsx(
                "transition-all duration-300 shrink-0 group flex items-center justify-center relative z-50",
                isVertical
                    ? "w-4 -mx-1.5 h-full cursor-col-resize hover:bg-primary/10" // 16px wide, -12px margin = 4px layout space
                    : "w-full h-4 -my-1.5 cursor-row-resize hover:bg-primary/10", // 16px high, -12px margin = 4px layout space
                !isEditMode && "opacity-0 pointer-events-none"
            )}
            title="Glisser pour redimensionner"
        >
            <div className={clsx(
                "bg-white/20 group-hover:bg-primary rounded-full transition-colors",
                isVertical ? "w-1 h-8" : "w-12 h-1" // Slightly thicker visual line
            )} />
        </div>
    );
});

ColumnResizeHandle.displayName = 'ColumnResizeHandle';

export default ColumnResizeHandle;
