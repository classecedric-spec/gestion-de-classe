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

const AttendanceColumn: React.FC<AttendanceColumnProps> = ({ id, title, color, count, children, isUnassigned = false }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { isColumn: true, id }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex flex-col h-full rounded-2xl overflow-hidden border transition-colors",
                isUnassigned
                    ? "bg-surface/30 border-white/5"
                    : "bg-surface/50 border-white/10",
                isOver && "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
            )}
        >
            {/* Header */}
            <div
                className={clsx(
                    "p-4 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md",
                    isUnassigned ? "border-white/5 bg-surface/50" : "border-white/10"
                )}
                style={{ backgroundColor: !isUnassigned ? `${color}15` : undefined }} // 15 hex = ~10% opacity
            >
                <div className="flex items-center gap-2">
                    {!isUnassigned && <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />}
                    <h3 className={clsx("font-bold text-sm", isUnassigned ? "text-grey-light" : "text-text-main")}>
                        {title}
                    </h3>
                </div>
                <span className={clsx(
                    "px-2 py-0.5 rounded text-xs font-bold",
                    isUnassigned ? "bg-white/5 text-grey-medium" : "bg-white/10"
                )} style={{ color: !isUnassigned ? color : undefined }}>
                    {count}
                </span>
            </div>

            {/* Content Area (Scrollable) */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2">
                    {children}
                </div>
                {count === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-grey-dark/30 min-h-[100px]">
                        <p className="text-xs italic">Vide</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(AttendanceColumn);
