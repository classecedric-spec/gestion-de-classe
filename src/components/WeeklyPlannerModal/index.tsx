import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle, Download, Loader2, Search } from 'lucide-react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { toast } from 'sonner';
import clsx from 'clsx';

import { useWeeklyPlanner, DAYS, PERIODS, getRelativeWeekMonday } from './useWeeklyPlanner';
import { PlannerSlot, DraggableLibraryItem, DraggableCustomItem, AddCustomActivityInput } from './PlannerComponents';
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
    const {
        schedule, modules, weeks, currentWeek, setCurrentWeek,
        plannerItems, customActivities, dbError, isExporting, setIsExporting,
        activeDragItem, activeOver, handleDragStart, handleDragOver, handleDragEnd,
        resizingItem, resizeTargetPeriod, handleResizeStart, handleResizeMove, handleResizeUp,
        handleDelete, handleExtend, isSlotCovered,
        handlePrevWeek, handleNextWeek, handleShrinkFromTop,
        handleCreateCustomActivity, handleDeleteCustomActivity
    } = useWeeklyPlanner(isOpen);

    const [searchTerm, setSearchTerm] = useState('');
    const [libraryTab, setLibraryTab] = useState<'modules' | 'perso'>('modules');
    const [filterStatus, setFilterStatus] = useState<'en_cours' | 'en_preparation' | 'archive' | 'all'>('en_cours');

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

                    {/* Main Content Area */}
                    <div className="flex-1 flex min-h-0 overflow-hidden bg-input/20 h-full relative" onMouseLeave={() => resizingItem && handleResizeUp()}>
                        {/* Grid */}
                        <div className="flex-1 overflow-auto p-4 custom-scrollbar relative">
                            <div className="grid grid-cols-6 gap-3 min-w-[900px] grid-rows-[auto_repeat(6,minmax(0,1fr))]" style={{ minHeight: '100%' }}>
                                {/* Headers */}
                                <div className="p-2 sticky top-0 bg-surface/80 backdrop-blur z-20"></div>
                                {DAYS.map((d, i) => (
                                    <div key={d} className="font-bold text-center text-grey-medium sticky top-0 bg-surface/80 backdrop-blur z-20 py-2" style={{ gridColumn: i + 2, gridRow: 1 }}>
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
                                                        onShrink={handleShrinkFromTop}
                                                        isPlaceholder={covered}
                                                        isDisabled={isDisabledSlot}
                                                        modules={modules}
                                                        isOver={!!(activeOver && activeOver.day === day && activeOver.period === period)}
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

                        {/* Library Sidebar */}
                        <div className="w-80 border-l border-border bg-surface flex flex-col shrink-0 overflow-hidden">
                            <div className="p-4 border-b border-border space-y-4">
                                <div className="flex bg-input p-1 rounded-xl gap-1">
                                    <button
                                        onClick={() => setLibraryTab('modules')}
                                        className={clsx(
                                            "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                            libraryTab === 'modules' ? "bg-primary text-white shadow-sm" : "text-grey-medium hover:text-text-main"
                                        )}
                                    >
                                        Modules
                                    </button>
                                    <button
                                        onClick={() => setLibraryTab('perso')}
                                        className={clsx(
                                            "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                            libraryTab === 'perso' ? "bg-primary text-white shadow-sm" : "text-grey-medium hover:text-text-main"
                                        )}
                                    >
                                        Perso
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={14} />
                                        <input
                                            type="text"
                                            placeholder={libraryTab === 'modules' ? "Rechercher un module..." : "Rechercher une activité..."}
                                            className="w-full bg-input border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    
                                    {libraryTab === 'modules' && (
                                        <div className="flex bg-input/50 p-1 rounded-lg gap-1">
                                            {(['en_cours', 'en_preparation', 'archive', 'all'] as const).map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setFilterStatus(f)}
                                                    className={clsx(
                                                        "flex-1 px-2 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all",
                                                        filterStatus === f ? "bg-surface-dark text-primary shadow-sm" : "text-grey-medium hover:text-text-main"
                                                    )}
                                                >
                                                    {f === 'en_cours' ? 'Cours' : f === 'en_preparation' ? 'Prep' : f === 'archive' ? 'Arch' : 'Tout'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="space-y-2">
                                    {libraryTab === 'modules' ? (
                                        modules.length > 0 ? (
                                            modules.filter(m => {
                                                const matchesSearch = m.nom.toLowerCase().includes(searchTerm.toLowerCase());
                                                const matchesFilter = filterStatus === 'all' || m.statut === filterStatus;
                                                return matchesSearch && matchesFilter;
                                            }).map(module => (
                                                <DraggableLibraryItem key={module.id} module={module} />
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <Loader2 className="animate-spin text-primary mx-auto mb-2" size={20} />
                                                <p className="text-[10px] text-grey-medium">Chargement...</p>
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            <AddCustomActivityInput onAdd={handleCreateCustomActivity} />
                                            <div className="pt-2 space-y-2">
                                                {customActivities.filter(a => 
                                                    a.title.toLowerCase().includes(searchTerm.toLowerCase())
                                                ).sort((a, b) => a.title.localeCompare(b.title)).map(activity => (
                                                    <DraggableCustomItem 
                                                        key={activity.id} 
                                                        activity={activity} 
                                                        onDelete={handleDeleteCustomActivity}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

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
