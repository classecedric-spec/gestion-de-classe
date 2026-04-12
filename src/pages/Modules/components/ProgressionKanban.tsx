import React from 'react';
import { TrendingUp, Clock, AlertCircle, Trophy, Home, ShieldCheck, Loader2 } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import type { Tables } from '../../../types/supabase';

// Progression Card Component
interface ProgressionCardProps {
    progression: Tables<'Progression'> & { Eleve?: Tables<'Eleve'> };
}

const ProgressionCard: React.FC<ProgressionCardProps> = ({ progression }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: progression.id,
        data: {
            type: 'student',
            progression
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-white/5 hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group shadow-sm mb-2"
        >
            <div className="w-6 h-6 rounded bg-surface flex items-center justify-center text-primary font-bold overflow-hidden border border-white/10 shrink-0">
                {(progression.Eleve?.photo_url || progression.Eleve?.photo_base64) ? (
                    <img src={progression.Eleve?.photo_url || progression.Eleve?.photo_base64 || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[9px]">{progression.Eleve?.prenom?.[0]}{progression.Eleve?.nom?.[0]}</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-text-main truncate group-hover:text-primary transition-colors">
                    {progression.Eleve?.prenom} {progression.Eleve?.nom}
                </p>
            </div>
        </div>
    );
};

// Progression Column Component
interface ProgressionColumnProps {
    id: string;
    label: string;
    icon: React.ElementType | null;
    color: string;
    bg: string;
    children: React.ReactNode;
    count: number;
}

const ProgressionColumn: React.FC<ProgressionColumnProps> = ({ id, label, icon: Icon, color, bg, children, count }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: {
            type: 'column',
            status: id
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex-1 flex flex-col min-w-[250px] rounded-2xl border transition-all duration-200",
                isOver ? "bg-white/5 border-primary/50 scale-[1.01]" : "bg-surface/20 border-white/5"
            )}
        >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface/10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    {Icon && (
                        <div className={clsx("p-1.5 rounded-lg shadow-inner", bg, color)}>
                            <Icon size={14} />
                        </div>
                    )}
                    <h4 className={clsx("text-[10px] font-black uppercase tracking-[0.15em]", color)}>
                        {label}
                    </h4>
                </div>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-grey-medium font-bold tabular-nums">
                    {count}
                </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar min-h-[200px] grid grid-cols-2 gap-2 content-start">
                {children}
            </div>
        </div>
    );
};

/**
 * ProgressionKanban
 * 5-column Kanban board with drag-drop for progressions
 */
interface ProgressionKanbanProps {
    activities: any[];
    selectedActivity: any;
    onSelectActivity: (act: any) => void;
    progressions: any[];
    stats: Record<string, any>;
    loading?: boolean;
    onDragEnd: (event: DragEndEvent) => void;
}

const ProgressionKanban: React.FC<ProgressionKanbanProps> = ({
    activities,
    selectedActivity,
    onSelectActivity,
    progressions,
    stats,
    loading = false,
    onDragEnd
}) => {
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

    const columns = [
        { id: 'a_commencer', label: 'À commencer', icon: null, color: 'text-grey-medium', bg: 'bg-white/5' },
        { id: 'besoin_d_aide', label: 'Besoin d\'aide', icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10' },
        { id: 'a_verifier', label: 'À Vérifier', icon: ShieldCheck, color: 'text-purple-accent', bg: 'bg-purple-accent/10' },
        { id: 'a_domicile', label: 'À domicile', icon: Home, color: 'text-danger', bg: 'bg-danger/10' },
        { id: 'termine', label: 'Terminé', icon: Trophy, color: 'text-success', bg: 'bg-success/10' }
    ];

    return (
        <div className="flex gap-8 h-full min-h-[500px] animate-in slide-in-from-right-2 duration-300">
            {/* Left: Activity Selector */}
            <div className="w-56 flex flex-col gap-2 border-r border-white/5 pr-6">
                <h4 className="text-[10px] uppercase font-bold text-grey-medium tracking-widest mb-2 px-2">Activités</h4>
                <div className="space-y-1 overflow-y-auto custom-scrollbar pr-2">
                    {activities.map(act => (
                        <button
                            key={act.id}
                            onClick={() => onSelectActivity(act)}
                            className={clsx(
                                "w-full text-left p-2.5 rounded-xl transition-all border flex flex-col gap-1 group",
                                selectedActivity?.id === act.id
                                    ? "bg-primary border-primary shadow-lg shadow-primary/10"
                                    : "bg-surface/30 border-white/5 hover:border-white/10"
                            )}
                        >
                            <div className="flex items-center gap-1 w-full">
                                <span className={clsx("text-[11px] font-bold truncate leading-tight", selectedActivity?.id === act.id ? "text-text-dark" : "text-text-main")}>
                                    {act.titre}
                                </span>
                                {act.ActiviteMateriel && act.ActiviteMateriel.length > 0 && (
                                    <span className={clsx("shrink-0 text-[10px] font-normal opacity-80", selectedActivity?.id === act.id ? "text-text-dark" : "text-grey-medium")}>
                                        [{act.ActiviteMateriel.map((am: any) => am.TypeMateriel?.acronyme).filter(Boolean).join(', ')}]
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-full h-1 rounded-full bg-black/20 overflow-hidden">
                                    <div
                                        className="h-full bg-success transition-all duration-500 ease-out"
                                        style={{ width: `${stats[act.id]?.percent || 0}%` }}
                                    />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Kanban Board */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedActivity ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-grey-medium text-center">
                        <TrendingUp size={48} className="mb-4 opacity-20" />
                        <p className="font-medium text-sm">Sélectionnez une activité pour voir l'avancement.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-6">
                        <div className="space-y-8 overflow-y-auto custom-scrollbar pr-4 pb-12">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 size={32} className="animate-spin text-primary opacity-50" />
                                    <p className="text-xs text-grey-medium animate-pulse">Chargement du suivi...</p>
                                </div>
                            ) : progressions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center bg-surface/10 rounded-3xl border border-dashed border-white/5">
                                    <Clock size={48} className="mb-4 text-grey-dark opacity-30" />
                                    <p className="text-grey-medium italic">Le module n'a pas encore été démarré pour cette activité.</p>
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={onDragEnd}
                                >
                                    <div className="grid grid-cols-2 gap-4 pb-4 custom-scrollbar flex-1 min-h-0">
                                        {columns.map(column => {
                                            const columnProgressions = progressions.filter(p => p.etat === column.id);
                                            return (
                                                <ProgressionColumn
                                                    key={column.id}
                                                    id={column.id}
                                                    label={column.label}
                                                    icon={column.icon}
                                                    color={column.color}
                                                    bg={column.bg}
                                                    count={columnProgressions.length}
                                                >
                                                    <SortableContext
                                                        items={columnProgressions.map(p => p.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {columnProgressions.map(p => (
                                                            <ProgressionCard key={p.id} progression={p} />
                                                        ))}
                                                    </SortableContext>
                                                </ProgressionColumn>
                                            );
                                        })}
                                    </div>
                                </DndContext>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressionKanban;
