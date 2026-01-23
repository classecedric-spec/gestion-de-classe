import React, { useLayoutEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getInitials } from '../../../../lib/helpers';
import { calculateBubbleSize } from '../../utils/progressionHelpers';
import { Student } from '../../attendance/services/attendanceService';

interface StudentProgressionGridProps {
    students: Student[];
    onStudentSelect: (student: Student) => void;
    loading?: boolean;
}

/**
 * StudentProgressionGrid
 * Displays grid of student bubbles with optimal sizing
 */
const StudentProgressionGrid: React.FC<StudentProgressionGridProps> = ({
    students,
    onStudentSelect,
    loading
}) => {
    // Ref for the container to measure
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Measure container size
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-primary" />
            </div>
        );
    }

    const gap = 8;
    const padding = 16;
    // We already subtracted header height in parent row logic, but here we are measuring the grid container itself.
    // The grid container is the scrollable area.
    // Let's assume available space is the measured dimensions minus padding.
    const availableWidth = dimensions.width - padding;
    const availableHeight = dimensions.height - padding;

    // Use total student count to ensure everyone fits
    const sizingCount = students.length;

    const { cols, bubbleSize } = (dimensions.width > 0 && dimensions.height > 0 && students.length > 0)
        ? calculateBubbleSize(availableWidth, availableHeight, sizingCount)
        : { cols: 1, bubbleSize: 30 };

    const fontSize = Math.max(14, Math.min(Math.floor(bubbleSize * 0.35), 40));

    // Calculate grid content
    const gridContent = (dimensions.width > 0 && dimensions.height > 0) ? (
        <div
            className="grid p-2 animate-in fade-in slide-in-from-left-4 duration-300 transition-all ease-out"
            style={{
                gridTemplateColumns: `repeat(${cols}, ${bubbleSize}px)`,
                gap: `${gap}px`,
                justifyContent: 'center',
                alignContent: 'center',
                width: '100%',
                height: '100%'
            }}
        >
            {students.map(student => (
                <button
                    key={student.id}
                    onClick={() => onStudentSelect(student)}
                    className="rounded-full flex items-center justify-center border border-white/10 hover:border-primary/50 hover:scale-105 transition-all relative group overflow-hidden bg-surface shadow-lg"
                    style={{ width: bubbleSize, height: bubbleSize }}
                    title={`${student.prenom} ${student.nom}`}
                >
                    {(student.photo_url || student.photo_base64) ? (
                        <img src={student.photo_url || student.photo_base64 || ''} alt="" className="w-full h-full object-cover" />
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
    ) : null;

    return (
        <div ref={containerRef} className="w-full h-full overflow-hidden min-h-[50px]">
            {gridContent}
        </div>
    );
};

export default StudentProgressionGrid;
