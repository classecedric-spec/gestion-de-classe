import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { GripVertical } from 'lucide-react';
import { Student } from '../services/attendanceService';

interface AttendanceStudentCardProps {
    student: Student;
    currentStatus?: { status: string };
    isOverlay?: boolean;
    disabled?: boolean;
}

const AttendanceStudentCard: React.FC<AttendanceStudentCardProps> = ({ student, currentStatus, isOverlay = false, disabled = false }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: student.id,
        data: { student, source: currentStatus ? 'category' : 'unassigned' },
        disabled: disabled, // Disable drag if prop is true
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging || isOverlay ? 50 : undefined,
        opacity: isDragging ? 0.5 : (disabled ? 0.8 : 1), // Slight transparency if locked
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "relative flex items-center gap-3 p-2 rounded-xl border border-white/5 transition-all outline-none",
                disabled ? "bg-black/10 cursor-not-allowed border-transparent" : "bg-surface hover:bg-white/5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing",
                (isDragging || isOverlay) && "border-primary border-dashed bg-surface/80 backdrop-blur-sm",
                currentStatus?.status === 'present' && !isDragging && !isOverlay && "border-l-4" // Visual indicator if needed
            )}
        >
            {/* Avatar */}
            <div className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-inner overflow-hidden shrink-0",
                (student.photo_url || student.photo_base64) ? "bg-[#D9B981]" : "bg-background text-primary",
                disabled && "grayscale opacity-70"
            )}>
                {(student.photo_url || student.photo_base64) ? (
                    <img src={student.photo_url || student.photo_base64 || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                    <>{student.prenom[0]}</>
                )}
            </div>

            {/* Name */}
            <p className={clsx(
                "font-bold text-sm text-text-main truncate max-w-[100px] pointer-events-none select-none",
                disabled && "text-grey-medium"
            )}>
                {student.prenom}
            </p>

            {/* Grip Icon for affordance (Optional) */}
            {!disabled && (
                <div className="ml-auto text-grey-dark/50">
                    <GripVertical size={14} />
                </div>
            )}
        </div>
    );
};

export default React.memo(AttendanceStudentCard);
