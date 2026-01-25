import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle, Download, Loader2, Plus, Briefcase } from 'lucide-react';
import { DndContext, DragOverlay, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { toast } from 'sonner';

import { useWeeklyPlanner, DAYS, PERIODS, getRelativeWeekMonday } from './useWeeklyPlanner';
import { DraggableDockItem, PlannerSlot } from './PlannerComponents';
import PreparationModal from './PreparationModal';
import { WeeklyPlannerPDF } from '../WeeklyPlannerPDF';

// Polyfill check for showSaveFilePicker, common in browser but not in standard TS lib.dom
declare global {
    interface Window {
        showSaveFilePicker?: (options?: any) => Promise<any>;
    }
}

interface WeeklyPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WeeklyPlannerModal: React.FC<WeeklyPlannerModalProps> = ({ isOpen, onClose }) => {
    const [isPrepMode, setIsPrepMode] = useState(false);

    const {
        schedule, modules, weeks, currentWeek, setCurrentWeek, currentWeekLabel,
        dockItems, plannerItems, dbError, isExporting, setIsExporting,
        activeDragItem, activeOver, handleDragStart, handleDragOver, handleDragEnd,
        resizingItem, resizeTargetPeriod, handleResizeStart, handleResizeMove, handleResizeUp,
        handleToggleDock, handleDelete, handlePermanentDelete, handleExtend, isSlotCovered,
        handlePrevWeek, handleNextWeek, fetchModules
    } = useWeeklyPlanner(isOpen);

    // Resize listeners
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeUp);
        };
    }, [isOpen, handleResizeMove, handleResizeUp]);

    const handleExportPDF = async () => {
        const start = new Date(currentWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 4);
        const filename = `Planning_${start.toISOString().split('T')[0]}_au_${end.toISOString().split('T')[0]}.pdf`;

        let fileHandle = null;
        if (window.showSaveFilePicker) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
                });
            } catch (err: any) {
                if (err.name === 'AbortError') return;
            }
        }

        setIsExporting(true);
        try {
            // Dynamic import PDF libraries
            const { pdf } = await import('@react-pdf/renderer');
            const { saveAs } = await import('file-saver');

            const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const label = `Semaine du ${start.toLocaleDateString('fr-FR', options)} au ${end.toLocaleDateString('fr-FR', options)}`;

            const blob = await pdf(
                <WeeklyPlannerPDF
                    schedule={schedule.filter(item => item.day_of_week !== 'DOCK')}
                    modules={modules}
                    weekLabel={label}
                    weekStartDate={currentWeek}
                />
            ).toBlob();

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                saveAs(blob, filename);
            }

            toast.success('PDF exporté avec succès !');
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.error("Erreur lors de l'export PDF");
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-surface border border-border rounded-3xl w-full max-w-7xl h-[95vh] overflow-hidden shadow-2xl flex flex-col relative">

                    {/* Header */}
                    <div className="p-5 border-b border-border flex justify-between items-center bg-surface z-20">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-text-main uppercase tracking-tight flex items-center gap-3">
                                📅 Semainier
                            </h2>

                            {/* Week Selector */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-input rounded-xl p-1 border border-border">
                                    <button onClick={handlePrevWeek} className="p-1 hover:bg-surface rounded-lg text-grey-medium hover:text-text-main transition-colors" title="Semaine précédente">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <select
                                        value={currentWeek}
                                        onChange={(e) => setCurrentWeek(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-text-main outline-none max-w-[150px] sm:max-w-[200px] cursor-pointer px-1"
                                    >
                                        {weeks.map(week => (
                                            <option key={week.value} value={week.value} className="text-black">{week.label}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleNextWeek} className="p-1 hover:bg-surface rounded-lg text-grey-medium hover:text-text-main transition-colors" title="Semaine suivante">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 bg-input rounded-xl p-1 border border-border">
                                    {[-1, 0, 1].map(offset => (
                                        <button
                                            key={offset}
                                            onClick={() => setCurrentWeek(getRelativeWeekMonday(offset))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${currentWeek === getRelativeWeekMonday(offset) ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main hover:bg-surface'}`}
                                        >
                                            {offset === -1 ? 'Semaine passée' : offset === 0 ? 'Semaine en cours' : 'Semaine prochaine'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {dbError && (
                                <span className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                    <AlertTriangle size={12} /> Mise à jour BDD requise
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Exporter en PDF"
                            >
                                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                <span className="hidden sm:inline">Exporter PDF</span>
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-grey-medium hover:text-text-main"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="flex-1 min-h-0 overflow-hidden p-4 custom-scrollbar bg-input/50 relative" onMouseLeave={() => resizingItem && handleResizeUp()}>
                        <div className="h-full grid grid-cols-6 gap-3 min-w-[1000px] grid-rows-[auto_repeat(6,minmax(0,1fr))]">
                            {/* Headers */}
                            <div className="p-2"></div>
                            {DAYS.map((d, i) => (
                                <div key={d} className="font-bold text-center text-grey-medium" style={{ gridColumn: i + 2, gridRow: 1 }}>
                                    {d}
                                </div>
                            ))}

                            {/* Period Labels */}
                            {PERIODS.map((p, i) => (
                                <div key={p} className="flex items-center justify-center font-mono text-xl font-bold text-grey-medium/50 select-none" style={{ gridColumn: 1, gridRow: i + 2 }}>
                                    {p}
                                </div>
                            ))}

                            {/* Slots */}
                            {DAYS.map((day, dIndex) => (
                                <div key={day} style={{ display: 'contents' }}>
                                    {PERIODS.map((period, pIndex) => {
                                        const items = plannerItems.filter(s => s.day_of_week === day && s.period_index === period);
                                        const covered = isSlotCovered(day, period);
                                        const isResizeTarget = resizingItem && resizingItem.day_of_week === day && period <= (resizeTargetPeriod || 0) && period > resizingItem.period_index;
                                        const isDisabledSlot = day === 'Mercredi' && period >= 5;

                                        return (
                                            <div key={`${day}-${period}`} style={{ display: 'contents' }}>
                                                <PlannerSlot
                                                    data-period={period}
                                                    dayIndex={dIndex}
                                                    periodIndex={pIndex}
                                                    items={items}
                                                    onDelete={handleDelete}
                                                    onResizeStart={handleResizeStart}
                                                    onExtend={handleExtend}
                                                    isPlaceholder={covered}
                                                    isDisabled={isDisabledSlot}
                                                    modules={modules}
                                                    isOver={activeOver && activeOver.day === day && activeOver.period === period}
                                                />
                                                {isResizeTarget && (
                                                    <div
                                                        className="rounded-xl border border-dashed border-primary/50 bg-primary/10 pointer-events-none z-20"
                                                        style={{ gridColumn: dIndex + 2, gridRow: pIndex + 2 }}
                                                    ></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dock */}
                    <div className="bg-surface border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10 relative shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xs font-bold text-grey-medium uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={14} /> DOCK
                            </h3>
                            <span className="text-[10px] bg-input px-2 py-0.5 rounded text-grey-medium">{dockItems.length} modules prêts</span>
                        </div>

                        <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[35vh] w-full items-start content-start custom-scrollbar pr-20">
                            {[...dockItems].sort((a, b) => {
                                const branchA = a.matiere_principale || 'Autre';
                                const branchB = b.matiere_principale || 'Autre';
                                if (branchA !== branchB) return branchA.localeCompare(branchB);
                                if (!a.date_fin) return 1;
                                if (!b.date_fin) return -1;
                                return new Date(a.date_fin!).getTime() - new Date(b.date_fin!).getTime();
                            }).map(item => (
                                <DraggableDockItem key={item.id} item={item} onDelete={handlePermanentDelete} variant="pill" />
                            ))}
                        </div>

                        <div
                            onClick={() => setIsPrepMode(true)}
                            className="absolute top-4 right-4 h-12 w-12 border-2 border-dashed border-yellow-500/30 rounded-full flex items-center justify-center text-yellow-600/50 cursor-pointer hover:border-yellow-400 hover:text-yellow-400 transition-all bg-yellow-400/5 hover:bg-yellow-400/10 z-20"
                            title="Ajouter des modules"
                        >
                            <Plus size={24} />
                        </div>
                    </div>

                    <PreparationModal
                        isOpen={isPrepMode}
                        onClose={() => setIsPrepMode(false)}
                        modules={modules}
                        dockedItems={dockItems}
                        onToggleDock={handleToggleDock}
                        currentWeekDate={currentWeek}
                        fetchModules={fetchModules}
                    />

                    <DragOverlay>
                        {activeDragItem ? (
                            <div className="p-3 bg-primary text-white rounded-xl shadow-2xl w-40 font-bold text-center scale-105 border-2 border-white/20">
                                {activeDragItem.activity_title}
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
            </div>
        </DndContext>
    );
};

export default WeeklyPlannerModal;
