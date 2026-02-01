import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { Tables } from '../../../types/supabase';

// Helper type for Activity with extra fields if needed
type Activity = Tables<'Activite'> & { ActiviteNiveau?: any[] };

// Sortable Activity Item Component
interface SortableItemProps {
    activity: Activity;
    index: number;
    onEdit: (activity: Activity) => void;
    onDelete?: (activity: Activity) => void;
}

const SortableActivityItem: React.FC<SortableItemProps> = ({ activity, index, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: activity.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            // eslint-disable-next-line
            style={style}
            onClick={() => onEdit(activity)}
            className={clsx(
                "flex items-center gap-3 p-2 bg-surface/40 hover:bg-surface/60 transition-colors rounded-lg border border-white/5 group cursor-pointer pr-14 relative",
                isDragging ? "z-10 opacity-50 border-primary dashed" : "z-0"
            )}
        >
            {/* Index / Order */}
            <div className="text-sm font-black text-grey-dark w-6 text-center shrink-0">
                {index + 1}
            </div>

            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-grey-dark hover:text-white transition-colors p-1"
            >
                <GripVertical size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-lg select-none truncate">{activity.titre}</h3>

                    {/* Requirements Badges */}
                    <div className="flex flex-wrap gap-1.5">
                        {activity.ActiviteNiveau?.map((req: any) => (
                            <div key={req.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/5 rounded text-[10px] font-bold text-primary border border-primary/10 whitespace-nowrap">
                                <span className="opacity-70 uppercase tracking-tighter">{req.Niveau?.nom}</span>
                                <span>{req.nombre_exercices || 0}</span>
                                <span className="opacity-30">/</span>
                                <span className="text-danger/70">{req.nombre_erreurs || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {activity.description && <p className="text-grey-medium text-sm truncate select-none">{activity.description}</p>}
            </div>

            {/* Delete Button - Positioned absolutely to ensure it's clickable and doesn't interfere with layout */}
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(activity);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-danger/10 text-grey-medium hover:text-danger rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                    title="Supprimer l'activité"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
};

/**
 * ActivitiesTab
 * Displays sortable activities list with drag-drop
 */
interface ActivitiesTabProps {
    activities: Activity[];
    onDragEnd: (event: DragEndEvent) => void;
    onEditActivity: (activity: Activity) => void;
    onDelete?: (activity: Activity) => void;
}

const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ activities, onDragEnd, onEditActivity, onDelete }) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    if (!activities || activities.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
                <p className="text-grey-medium italic">Aucune activité dans ce module.</p>
            </div>
        );
    }

    return (
        <div className="space-y-1 animate-in fade-in duration-300">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
            >
                <SortableContext
                    items={activities.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {activities.map((activity, index) => (
                        <SortableActivityItem
                            key={activity.id}
                            index={index}
                            activity={activity}
                            onEdit={onEditActivity}
                            onDelete={onDelete}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default ActivitiesTab;
