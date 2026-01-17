import React from 'react';
import PropTypes from 'prop-types';
import { Plus, GripVertical, Sparkles } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

// Sortable Activity Item Component
const SortableActivityItem = ({ activity, onEdit }) => {
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
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onEdit(activity)}
            className={clsx(
                "flex items-center gap-3 p-2 bg-surface/40 hover:bg-surface/60 transition-colors rounded-lg border border-white/5 group cursor-pointer",
                isDragging && "opacity-50 border-primary dashed"
            )}
        >
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
                        {activity.ActiviteNiveau?.map(req => (
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
        </div>
    );
};

/**
 * ActivitiesTab
 * Displays sortable activities list with drag-drop
 */
const ActivitiesTab = ({ activities, onDragEnd, onEditActivity, onAddActivity, onCreateSeries }) => {
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
            <div className="space-y-1 animate-in fade-in duration-300">
                <div className="pt-4 space-y-3">
                    <button
                        onClick={onAddActivity}
                        className="w-full h-12 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Ajouter une activité</span>
                    </button>

                    <button
                        onClick={onCreateSeries}
                        className="w-full h-10 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-white rounded-xl border border-dashed border-yellow-500/30 hover:border-yellow-500 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Sparkles size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-sm">Créer une série</span>
                    </button>
                </div>
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
                    {activities.map((activity) => (
                        <SortableActivityItem
                            key={activity.id}
                            activity={activity}
                            onEdit={onEditActivity}
                        />
                    ))}
                </SortableContext>

                {/* Bottom Buttons */}
                <div className="pt-4 space-y-3">
                    <button
                        onClick={onAddActivity}
                        className="w-full h-12 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Ajouter une activité</span>
                    </button>

                    <button
                        onClick={onCreateSeries}
                        className="w-full h-10 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-white rounded-xl border border-dashed border-yellow-500/30 hover:border-yellow-500 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Sparkles size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-sm">Créer une série</span>
                    </button>
                </div>
            </DndContext>
        </div>
    );
};

ActivitiesTab.propTypes = {
    activities: PropTypes.array.isRequired,
    onDragEnd: PropTypes.func.isRequired,
    onEditActivity: PropTypes.func.isRequired,
    onAddActivity: PropTypes.func.isRequired,
    onCreateSeries: PropTypes.func.isRequired
};

export default ActivitiesTab;
