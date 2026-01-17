import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Layers, Plus, CheckCircle2, Info, X, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MandatoryActivitiesPanel = ({
    mandatoryGroups,
    onAddClick,
    onRemove
}) => {
    const [selectedInfo, setSelectedInfo] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);

    const handleDragStart = (e, levelId, moduleId) => {
        setDraggedItem({ levelId, moduleId });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetLevelId, targetModuleId) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.levelId !== targetLevelId) return;

        // Only allow reordering within the same level
        if (draggedItem.moduleId !== targetModuleId) {
            // For now we'll implement this later with proper reorder logic
            // Reorder logic
        }
        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 h-[60px]">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-light">Modules Obligatoires</span>
                </div>
                <button
                    onClick={onAddClick}
                    className="p-1 px-2.5 bg-primary/20 text-primary border border-primary/20 rounded-md hover:bg-primary/30 transition-all active:scale-95"
                    title="Ajouter des modules obligatoires"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Content with Responsive Flex Layout */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {mandatoryGroups.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-grey-medium opacity-30 gap-3 grayscale py-10">
                        <Layers size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">Aucun module obligatoire sélectionné</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-6 items-start">
                        {mandatoryGroups.map((group) => (
                            <div
                                key={group.levelId}
                                className="flex-1 min-w-[240px] max-w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                            >
                                <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
                                        Niveau : {group.levelName}
                                    </h3>
                                    <div className="h-px flex-1 bg-white/5" />
                                    <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full">
                                        {group.modules.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5">
                                    {group.modules.map((module) => {
                                        const displayDate = module.date_fin || module.created_at;
                                        const formattedDate = displayDate ? format(new Date(displayDate), 'dd/MM', { locale: fr }) : '';

                                        return (
                                            <div
                                                key={`${module.id}-${group.levelId}`}
                                                draggable={module.percent !== 100}
                                                onDragStart={(e) => handleDragStart(e, group.levelId, module.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, group.levelId, module.id)}
                                                onDragEnd={handleDragEnd}
                                                className={clsx(
                                                    "bg-surface/30 border border-white/5 rounded-xl p-3 flex flex-col gap-3 hover:bg-surface/50 transition-colors group relative cursor-grab active:cursor-grabbing",
                                                    draggedItem?.moduleId === module.id && draggedItem?.levelId === group.levelId && "opacity-50"
                                                )}
                                            >
                                                {/* Delete Button - Positioned absolutely */}
                                                <button
                                                    onClick={() => onRemove(group.levelId, module.id)}
                                                    className="absolute -top-2 -right-2 z-10 p-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                                    title="Retirer ce module"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>

                                                <div className="flex items-start gap-3">
                                                    {/* Drag Handle */}
                                                    {module.percent !== 100 && (
                                                        <div className="mt-0.5 shrink-0 cursor-move opacity-0 group-hover:opacity-100 transition-opacity text-grey-medium hover:text-primary">
                                                            <GripVertical size={16} />
                                                        </div>
                                                    )}

                                                    {/* Info Pill Style - Fixed width/height, inset look */}
                                                    <button
                                                        onClick={() => setSelectedInfo({
                                                            name: module.nom,
                                                            students: module.remainingStudents,
                                                            level: group.levelName
                                                        })}
                                                        className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-primary/70 hover:text-primary transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] active:scale-95"
                                                        title="Élèves restants"
                                                    >
                                                        <Info size={12} />
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[12px] font-bold text-white leading-tight">
                                                            {module.nom} {formattedDate && <span className="text-primary/70 font-black ml-1">({formattedDate})</span>}
                                                        </p>
                                                    </div>

                                                    <div className={clsx(
                                                        "shrink-0",
                                                        module.percent === 100 ? "text-success" : "text-primary"
                                                    )}>
                                                        {module.percent === 100 ? (
                                                            <CheckCircle2 size={18} />
                                                        ) : (
                                                            <span className="text-lg font-black leading-none drop-shadow-sm">
                                                                {module.percent}<span className="text-[10px] opacity-60 ml-0.5">%</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Progress bar Zone */}
                                                <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden shadow-inner border border-white/5">
                                                    <div
                                                        className={clsx(
                                                            "h-full transition-all duration-700 ease-out",
                                                            module.percent === 100 ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-primary shadow-[0_0_8px_rgba(30,174,219,0.5)]"
                                                        )}
                                                        style={{ width: `${module.percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Modal / Overlay for Remaining Students */}
            {selectedInfo && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-white/5">
                            <div className="flex flex-col">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                                    Niveau {selectedInfo.level}
                                </h4>
                                <h3 className="text-sm font-bold text-white truncate max-w-[240px]">
                                    {selectedInfo.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedInfo(null)}
                                className="p-1.5 text-grey-medium hover:text-white hover:bg-white/5 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-grey-medium">
                                <span>Élèves à terminer</span>
                                <span className="bg-white/5 px-2 py-0.5 rounded-full">{selectedInfo.students.length}</span>
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 gap-2">
                                {selectedInfo.students.length === 0 ? (
                                    <div className="py-8 text-center bg-success/5 border border-success/10 rounded-xl">
                                        <CheckCircle2 className="mx-auto text-success mb-2" size={24} />
                                        <p className="text-[11px] font-bold text-success uppercase tracking-wider">Tous les élèves ont terminé !</p>
                                    </div>
                                ) : (
                                    selectedInfo.students.map((student, idx) => (
                                        <div
                                            key={idx}
                                            className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[12px] font-medium text-grey-light flex items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                                <span className="truncate">{student.name}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-primary shrink-0">
                                                {student.completed}/{student.total}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedInfo(null)}
                            className="w-full mt-6 py-3.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-primary/20 transition-all active:scale-95"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

MandatoryActivitiesPanel.propTypes = {
    mandatoryGroups: PropTypes.arrayOf(PropTypes.shape({
        levelId: PropTypes.string.isRequired,
        levelName: PropTypes.string.isRequired,
        modules: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string.isRequired,
            nom: PropTypes.string.isRequired,
            percent: PropTypes.number.isRequired,
            date_fin: PropTypes.string,
            created_at: PropTypes.string,
            remainingStudents: PropTypes.arrayOf(PropTypes.shape({
                name: PropTypes.string.isRequired,
                prenom: PropTypes.string.isRequired,
                completed: PropTypes.number.isRequired,
                total: PropTypes.number.isRequired,
                percentage: PropTypes.number.isRequired
            })).isRequired
        })).isRequired
    })).isRequired,
    onAddClick: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired
};

export default MandatoryActivitiesPanel;
