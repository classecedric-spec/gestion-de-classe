import React, { useState, useEffect, useRef } from 'react';
import { X, Search, GripVertical, Plus, Trash2, Settings, Briefcase, ChevronDown, ChevronLeft, ChevronRight, Calendar, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { WeeklyPlannerPDF } from './WeeklyPlannerPDF';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const PERIODS = [1, 2, 3, 4, 5, 6];

// Helper: Get start of school year (Sept 1st)
const getSchoolYearStart = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    // If we are past mid-August, use this year, else last year
    if (now.getMonth() >= 7) { // 7 is August
        return new Date(currentYear, 8, 1); // Sept 1st
    } else {
        return new Date(currentYear - 1, 8, 1);
    }
};

// Helper: Format date to YYYY-MM-DD local
const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Helper: Get current week Monday
const getMonday = (d) => {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return formatDate(new Date(d.setDate(diff)));
};

// Helper: Get weeks list
const getWeeksList = () => {
    const start = new Date(getSchoolYearStart());
    const weeks = [];
    let current = new Date(start);
    // Find first Monday
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);

    // Generate ~40 weeks
    for (let i = 0; i < 45; i++) {
        const end = new Date(current);
        end.setDate(current.getDate() + 6);

        const label = `Semaine ${i + 1} (${current.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })})`;
        const value = formatDate(current);

        weeks.push({ label, value, index: i });
        current.setDate(current.getDate() + 7);
    }
    return weeks;
};

// Helper: Get current week Monday
const getCurrentWeekMonday = () => {
    return getMonday(new Date());
};

// Helper: Get relative week Monday
const getRelativeWeekMonday = (offsetWeeks) => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + (offsetWeeks * 7);
    const target = new Date(d.setDate(diff));
    return formatDate(target);
};

// --- Draggable Dock Item ---
const DraggableDockItem = ({ item, onDelete, variant }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `dock-${item.id}`,
        data: { type: 'dockItem', item }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: 0.5,
    } : undefined;

    // Helper to format date DD/MM
    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
    };

    if (variant === 'pill') {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={`
                    relative group flex flex-col items-center justify-center text-center
                    bg-surface hover:bg-surface-hover border border-border hover:border-primary/50
                    rounded-xl p-[5px] w-[140px] h-auto min-h-[50px] cursor-grab active:cursor-grabbing transition-all
                    shadow-sm hover:shadow-md flex-shrink-0
                `}
            >
                {/* Title + Date */}
                <div className="flex-1 flex flex-col items-center justify-center w-full overflow-hidden">
                    <span className="font-bold text-[11px] md:text-xs text-text-main line-clamp-3 leading-tight w-full break-words">
                        {item.activity_title}
                    </span>
                    {item.date_fin && (
                        <span className="text-[9px] text-grey-medium mt-1 font-normal block">
                            ({formatDateShort(item.date_fin)})
                        </span>
                    )}
                </div>

                {/* Levels */}
                {(item.niveaux && item.niveaux.length > 0) && (
                    <div className="w-full flex justify-center border-t border-border/50 pt-1 mt-1 shrink-0">
                        <span className="text-[9px] text-primary font-medium uppercase tracking-wide">
                            {item.niveaux.join(', ')}
                        </span>
                    </div>
                )}

                {/* Delete Button (Absolute, visible on hover) */}
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="absolute -top-1 -right-1 p-1 bg-surface border border-border rounded-full hover:text-danger hover:border-danger opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                    <X size={10} />
                </button>
            </div>
        );
    }

    // Default Card Style (Fallback)
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                p-2 min-w-[120px] max-w-[160px] h-20 rounded-xl cursor-grab active:cursor-grabbing 
                bg-surface border border-border hover:border-primary/50 hover:bg-white/5 
                flex flex-col relative group transition-all flex-shrink-0
            `}
        >
            <span className="font-bold text-xs text-text-main line-clamp-2 leading-tight mb-1">{item.activity_title}</span>

            <div className="mt-auto flex justify-between items-end">
                <div className="opacity-50 text-text-main">
                    <GripVertical size={14} />
                </div>
                <button
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag interaction
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="p-1.5 hover:bg-danger/10 rounded-lg text-grey-medium hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};

// --- Planner Slot (With Resize Handle) ---
// --- Planner Slot (With Carousel for Multiple Items) ---
const PlannerSlot = ({ dayIndex, periodIndex, items, onDelete, onResizeStart, onExtend, isPlaceholder, isOver, isDisabled, modules, ...props }) => {
    // If we have items, use the first one for drag/drop context, but we actually display one at a time
    const activeItem = items && items.length > 0 ? items[0] : null;

    const { setNodeRef } = useDroppable({
        id: `${DAYS[dayIndex]}-${PERIODS[periodIndex]}`,
        data: { day: DAYS[dayIndex], period: PERIODS[periodIndex] },
        disabled: isDisabled
    });

    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset index if items change significantly (e.g. cleared)
    useEffect(() => {
        if (!items || items.length === 0) setCurrentIndex(0);
        else if (currentIndex >= items.length) setCurrentIndex(0);
    }, [items?.length]);

    const currentItem = items && items[currentIndex];

    // Info for current item
    const moduleInfo = currentItem ? modules?.find(m => m.nom === currentItem.activity_title) : null;
    const branchInfo = moduleInfo?.SousBranche?.Branche?.nom;
    const subBranchInfo = moduleInfo?.SousBranche?.nom;

    const [isFilling, setIsFilling] = useState(false);
    const timerRef = useRef(null);

    const handleMouseDown = (e) => {
        if (!currentItem) return;
        onResizeStart(e, currentItem);
        setIsFilling(true);
        timerRef.current = setTimeout(() => {
            onExtend(currentItem);
            setIsFilling(false);
        }, 1000);
    };

    const clearTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsFilling(false);
    };

    const nextItem = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev + 1) % items.length);
    };

    const prevItem = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
    };

    // Grid Positioning: Use the longest duration among items to determine span?
    // Or just use the current item's duration?
    // Plan: "If multiple items... Stack them... Flexbox".
    // But here we are grid. If items have different durations, it gets complex.
    // For MVP, user said "same cell". Let's assume they occupy the same slot.
    // Use the maximum duration? Or just the current one?
    // Let's use the currentItem's duration for the grid span.
    const duration = currentItem ? (currentItem.duration || 1) : 1;

    const gridStyle = {
        gridColumn: dayIndex + 2,
        gridRow: `${periodIndex + 2} / span ${duration}`,
    };

    if (isPlaceholder) return null;

    return (
        <div
            ref={setNodeRef}
            style={gridStyle}
            {...props}
            className={`
                relative rounded-xl border transition-all flex flex-col items-start justify-start text-left p-2.5 group
                ${isOver ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_15px_rgba(var(--primary),0.3)] z-10' : ''}
                ${isDisabled ? 'bg-black/80 border-white/5 opacity-50 cursor-not-allowed' : (currentItem ? `${currentItem.color_code} border-white/10` : 'border-border bg-surface/50 h-full min-h-0')}
                ${items && items.length > 1 ? '!border-purple-500 !border-[3px] shadow-[0_0_10px_rgba(168,85,247,0.5)]' : ''}
            `}
        >
            {isDisabled && !currentItem && (
                <div className="flex flex-col items-center gap-1 w-full h-full justify-center">
                    <Calendar size={18} className="text-white/20" />
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">OFF</span>
                </div>
            )}

            {currentItem ? (
                <>
                    {/* Carousel Controls */}
                    {items.length > 1 && (
                        <div className="absolute top-1 right-8 flex items-center gap-1 z-30">
                            <button onClick={prevItem} className="p-0.5 hover:bg-black/20 rounded text-white/80"><ChevronLeft size={10} /></button>
                            <span className="text-[9px] font-bold text-white/90">{currentIndex + 1}/{items.length}</span>
                            <button onClick={nextItem} className="p-0.5 hover:bg-black/20 rounded text-white/80"><ChevronRight size={10} /></button>
                        </div>
                    )}

                    <div className="flex flex-col gap-0.5 w-full">
                        <span className="font-bold text-sm line-clamp-2 text-white leading-tight text-left pr-6">{currentItem.activity_title}</span>
                        {(branchInfo || subBranchInfo) && (
                            <span className="text-[9px] text-white/70 line-clamp-1 italic font-medium text-left">
                                {branchInfo}{subBranchInfo ? ` > ${subBranchInfo}` : ''}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(currentItem.id); }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-black/30 rounded text-white/70 hover:text-red-400 transition-all z-30"
                    >
                        <Trash2 size={12} />
                    </button>

                    {/* Visual hint */}
                    <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white/50"></div>

                    {/* Resize Handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        onMouseUp={clearTimer}
                        onMouseLeave={clearTimer}
                        className={`
                            absolute bottom-0 inset-x-0 h-4 cursor-s-resize flex items-end justify-center pb-1 
                            opacity-0 group-hover:opacity-100 transition-all rounded-b-xl z-20 overflow-hidden
                            ${isFilling ? 'bg-black/20 !opacity-100' : 'hover:bg-black/10'}
                        `}
                    >
                        <div className={`
                            h-1 rounded-full transition-all ease-out
                            ${isFilling ? 'w-[80%] bg-emerald-400 duration-[1000ms]' : 'w-8 bg-white/30 duration-300'}
                        `}></div>
                    </div>
                </>
            ) : (
                <div className="opacity-0 group-hover:opacity-100 text-xs text-grey-medium uppercase font-bold tracking-widest scale-90 duration-300 w-full h-full flex items-center justify-center">
                    Déposer
                </div>
            )}
        </div>
    );
};

// --- Preparation Modal ---
const PreparationModal = ({ isOpen, onClose, modules, dockedItems, onToggleDock, currentWeekDate }) => {
    const [activeTab, setActiveTab] = useState('modules'); // 'modules' | 'custom'
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('en_cours');
    const [customText, setCustomText] = useState('');
    const [savedCustom, setSavedCustom] = useState([]);
    const [customSearch, setCustomSearch] = useState(''); // New search state
    const [showAddInput, setShowAddInput] = useState(false); // New toggle state

    useEffect(() => {
        if (isOpen) {
            fetchSavedCustom();
        }
    }, [isOpen]);

    const fetchSavedCustom = async () => {
        const { data } = await supabase.from('custom_activities').select('*').order('created_at', { ascending: false });
        if (data) setSavedCustom(data);
    };

    const filteredModules = modules.filter(m => {
        const matchesSearch = m.nom.toLowerCase().includes(search.toLowerCase());
        if (search.length > 0) return matchesSearch;
        const matchesFilter = filter === 'all' || (m.statut === filter);
        return matchesFilter;
    });

    const filteredCustom = savedCustom.filter(s =>
        s.title.toLowerCase().includes(customSearch.toLowerCase())
    );

    const handleAddCustom = async (textToUse = null) => {
        const text = textToUse || customText;
        if (!text.trim()) return;

        // Add to Dock
        onToggleDock({ nom: text, isCustom: true }, false);

        // If it's a new one (typed in input), save to DB
        if (!textToUse) {
            setCustomText('');
            // Check if already exists locally to avoid DB duplicate error logic
            if (!savedCustom.some(s => s.title.toLowerCase() === text.toLowerCase())) {
                const { data: { user } } = await supabase.auth.getUser();
                const { data, error } = await supabase.from('custom_activities').insert([{ title: text, user_id: user?.id }]).select();
                if (data) setSavedCustom(prev => [data[0], ...prev]);
            }
        }
    };

    const handleDeleteSaved = async (id, e) => {
        e.stopPropagation();
        await supabase.from('custom_activities').delete().eq('id', id);
        setSavedCustom(prev => prev.filter(s => s.id !== id));
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
                <div>
                    <h3 className="text-xl font-black text-text-main uppercase flex items-center gap-3">
                        <Briefcase className="text-primary" /> Préparation du DOCK
                    </h3>
                    <p className="text-grey-medium text-sm mt-1">Sélectionnez les modules ou créez vos activités.</p>
                </div>
                <button onClick={onClose} className="px-6 py-2 bg-text-main text-background font-bold rounded-lg hover:bg-grey-light transition-colors">
                    Terminer
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 flex gap-4 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('modules')}
                    className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'modules' ? 'text-primary border-primary' : 'text-grey-medium border-transparent hover:text-text-main'}`}
                >
                    Modules Existants
                </button>
                <button
                    onClick={() => setActiveTab('custom')}
                    className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'custom' ? 'text-primary border-primary' : 'text-grey-medium border-transparent hover:text-text-main'}`}
                >
                    Activités Perso
                </button>
            </div>

            {/* Content: Modules */}
            {activeTab === 'modules' && (
                <>
                    <div className="p-4 border-b border-border bg-surface/50">
                        <div className="max-w-4xl mx-auto flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un module..."
                                    className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-input p-1 rounded-xl gap-1">
                                <button onClick={() => setFilter('en_cours')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filter === 'en_cours' ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main'}`}>En cours</button>
                                <button onClick={() => setFilter('en_preparation')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filter === 'en_preparation' ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main'}`}>Prepa</button>
                                <button onClick={() => setFilter('archive')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filter === 'archive' ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main'}`}>Archivé</button>
                                <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filter === 'all' ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main'}`}>Tout</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredModules.map(module => {
                                const isDocked = dockedItems.some(item => item.activity_title === module.nom);
                                return (
                                    <div
                                        key={module.id}
                                        onClick={() => onToggleDock(module, isDocked)}
                                        className={`
                                            p-[5px] rounded-xl border cursor-pointer transition-all flex items-center justify-start text-left group h-[2.5rem]
                                            ${isDocked
                                                ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                                : 'bg-surface hover:bg-input border-border'}
                                        `}
                                    >
                                        <span className={`font-bold text-xs line-clamp-2 leading-tight px-1 ${isDocked ? 'text-white' : 'text-text-main'}`}>{module.nom}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Content: Custom */}
            {activeTab === 'custom' && (
                <>
                    <div className="p-4 border-b border-border bg-surface/50">
                        <div className="max-w-4xl mx-auto flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher une activité perso..."
                                    className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary"
                                    value={customSearch}
                                    onChange={e => setCustomSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-4xl mx-auto flex flex-col gap-6">

                            {/* Saved List */}
                            {savedCustom.length > 0 ? (
                                <div>
                                    <h4 className="text-xs font-bold text-grey-medium uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Briefcase size={12} /> Activités Mémorisées
                                    </h4>

                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {filteredCustom.map(saved => {
                                            const isDocked = dockedItems.some(item => item.activity_title === saved.title);
                                            return (
                                                <div
                                                    key={saved.id}
                                                    onClick={() => onToggleDock({ nom: saved.title, isCustom: true }, isDocked)}
                                                    className={`
                                                        group relative border rounded-xl p-[5px] cursor-pointer transition-all active:scale-95 flex items-center justify-between h-[2.5rem]
                                                        ${isDocked
                                                            ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                                            : 'bg-surface hover:bg-input border-border'}
                                                    `}
                                                >
                                                    <span className={`font-bold text-xs line-clamp-2 leading-tight ${isDocked ? 'text-white' : 'text-text-main'}`}>{saved.title}</span>
                                                    <button
                                                        onClick={(e) => handleDeleteSaved(saved.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/20 hover:text-danger text-grey-medium rounded-md transition-all ml-1"
                                                        title="Supprimer définitivement"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-b border-border mb-4">
                                    <p className="text-grey-medium text-sm">Aucune activité mémorisée pour l'instant.</p>
                                </div>
                            )}

                            {/* Input Section (Toggleable) */}
                            {!showAddInput ? (
                                <div className="flex justify-center py-4">
                                    <button
                                        onClick={() => setShowAddInput(true)}
                                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 group"
                                    >
                                        <Plus size={16} className="group-hover:scale-110 transition-transform" />
                                        Ajouter une activité
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-4 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <label className="text-sm font-bold text-grey-medium uppercase tracking-wide">Nouvelle activité</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Ex: Échecs, Réunion..."
                                            className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-lg text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            value={customText}
                                            onChange={e => setCustomText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddCustom(null);
                                                    setShowAddInput(false); // Close on submit
                                                }
                                            }}
                                            onBlur={() => !customText && setShowAddInput(false)}
                                        />
                                        <button
                                            onClick={() => {
                                                handleAddCustom(null);
                                                setShowAddInput(false);
                                            }}
                                            disabled={!customText.trim()}
                                            className="px-6 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-grey-medium text-xs">
                                            Sera ajoutée au DOC et mémorisée.
                                        </p>
                                        <button
                                            onClick={() => setShowAddInput(false)}
                                            className="text-xs text-grey-medium hover:text-text-main underline"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};




// --- Main Component ---
const WeeklyPlannerModal = ({ isOpen, onClose }) => {
    const [schedule, setSchedule] = useState([]);
    const [modules, setModules] = useState([]);
    const [isPrepMode, setIsPrepMode] = useState(false);
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [activeOver, setActiveOver] = useState(null);
    const [dbError, setDbError] = useState(false); // Track DB capability

    // Week Selection State
    const [weeks, setWeeks] = useState([]);
    const [currentWeek, setCurrentWeek] = useState(getMonday(new Date()));
    const [isExporting, setIsExporting] = useState(false);

    // Resizing State
    const [resizingItem, setResizingItem] = useState(null);
    const [resizeTargetPeriod, setResizeTargetPeriod] = useState(null);

    // Initial Setup
    useEffect(() => {
        setWeeks(getWeeksList());
    }, []);

    // Fetch when week changes (or modal opens)
    useEffect(() => {
        if (isOpen) {
            fetchData();
            fetchModules(); // Call the new fetchModules
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeUp);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentWeek]);

    const fetchData = async () => {
        setDbError(false);
        try {
            // Try fetching with week filter
            const { data: planningData, error } = await supabase
                .from('weekly_planning')
                .select('*')
                .eq('week_start_date', currentWeek);

            if (error) throw error;
            if (planningData) setSchedule(planningData);

        } catch (err) {
            console.error("Database Error (week filter):", err);
            // Fallback: Check if column exists error (code 42703 usually for undefined column postgrest? or just message)
            // If it fails, maybe try fetching ALL to at least show something?
            if (err.message?.includes('week_start_date')) {
                setDbError(true);
                // Fallback fetch
                const { data } = await supabase.from('weekly_planning').select('*');
                if (data) setSchedule(data); // Shows mixed data but better than empty
            }
        }
    };

    const dockItems = schedule.filter(s => s.day_of_week === 'DOCK');
    const plannerItems = schedule.filter(s => s.day_of_week !== 'DOCK');

    // --- Dock Logic ---
    const handleToggleDock = async (module, isCurrentlyDocked) => {
        if (isCurrentlyDocked) {
            const itemToDelete = dockItems.find(i => i.activity_title === module.nom);
            if (itemToDelete) {
                await supabase.from('weekly_planning').delete().eq('id', itemToDelete.id);
                setSchedule(prev => prev.filter(p => p.id !== itemToDelete.id));
            }
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const newItem = {
                day_of_week: 'DOCK',
                period_index: 0,
                activity_title: module.nom,
                color_code: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                duration: 1,
                week_start_date: currentWeek,
                user_id: user?.id
            };
            const { data, error } = await supabase.from('weekly_planning').insert([newItem]).select();
            if (!error && data) {
                setSchedule(prev => [...prev, data[0]]);
            }
        }
    };

    // --- Drag & Drop Logic ---
    const handleDragStart = (event) => {
        setActiveDragItem(event.active.data.current.item);
    };

    const handleDragOver = (event) => {
        const { over } = event;
        if (over) {
            setActiveOver(over.data.current);
        } else {
            setActiveOver(null);
        }
    }

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragItem(null);
        setActiveOver(null);

        if (!over) return;

        const item = active.data.current.item;
        const { day, period } = over.data.current;

        try {
            // Updated Logic: Check limit (Max 4 items)
            const targetItems = plannerItems.filter(p => p.day_of_week === day && p.period_index === period);
            // If dragging valid item into a *different* slot that is full, block it.
            // If dragging into same slot (no change), it's fine.
            const isSameSlot = item.day_of_week === day && item.period_index === period;

            if (!isSameSlot && targetItems.length >= 4) {
                toast.error("Maximum 4 activités par créneau !");
                return;
            }

            // Update dragged item
            // Note: We don't change week_start_date on move, it stays in the week it was created/fetched
            const { error } = await supabase
                .from('weekly_planning')
                .update({ day_of_week: day, period_index: period, duration: 1 })
                .eq('id', item.id);

            if (error) throw error;

            setSchedule(prev => {
                // Return updated list without filtering conflict
                return prev.map(p =>
                    p.id === item.id ? { ...p, day_of_week: day, period_index: period, duration: 1 } : p
                );
            });

        } catch (err) {
            console.error(err);
            fetchData();
        }
    };

    // --- Resize Logic ---
    const handleResizeStart = (e, item) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingItem(item);
        setResizeTargetPeriod(item.period_index + (item.duration - 1));
    };

    const handleResizeMove = (e) => {
        if (!resizingItem) return;
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const slotWithAttr = elements.map(el => el.closest('[data-period]')).find(el => el !== null);

        if (slotWithAttr) {
            const p = parseInt(slotWithAttr.getAttribute('data-period'));
            if (p >= resizingItem.period_index) {
                setResizeTargetPeriod(p);
            }
        }
    };

    const handleResizeUp = async () => {
        if (!resizingItem) return;

        const newDuration = (resizeTargetPeriod - resizingItem.period_index) + 1;
        const finalDuration = Math.min(Math.max(1, newDuration), 6 - resizingItem.period_index + 1);

        try {
            await supabase
                .from('weekly_planning')
                .update({ duration: finalDuration })
                .eq('id', resizingItem.id);

            setSchedule(prev => prev.map(p =>
                p.id === resizingItem.id ? { ...p, duration: finalDuration } : p
            ));
        } catch (err) {
            console.error(err);
        }

        setResizingItem(null);
        setResizeTargetPeriod(null);
    };

    const handleDelete = async (id) => {
        try {
            // Return to DOCK
            await supabase
                .from('weekly_planning')
                .update({ day_of_week: 'DOCK', period_index: 0, duration: 1 })
                .eq('id', id);

            setSchedule(prev => prev.map(s =>
                s.id === id ? { ...s, day_of_week: 'DOCK', period_index: 0, duration: 1 } : s
            ));
        } catch (err) {
            console.error("Error returning to dock:", err);
        }
    };

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
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        setIsExporting(true);
        try {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
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

    const fetchModules = async () => {
        try {
            const { data, error } = await supabase
                .from('Module')
                .select(`
                    *,
                    SousBranche:sous_branche_id (
                        nom,
                        branche_id,
                        Branche:branche_id (
                            id,
                            nom,
                            ordre
                        )
                    ),
                    Activite (
                       id,
                       ActiviteNiveau (
                           niveau_id,
                           Niveau (nom)
                       )
                    )
                `)
                .order('nom');

            if (error) throw error;
            setModules(data || []);
        } catch (err) {
            console.error('Error fetching modules:', err);
        }
    };

    const handlePermanentDelete = async (id) => {
        try {
            await supabase.from('weekly_planning').delete().eq('id', id);
            setSchedule(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Error deleting permanently:", err);
        }
    };

    const handleExtend = async (item) => {
        const newDuration = (item.duration || 1) + 1;
        if (item.period_index + newDuration - 1 > 6) return;

        const targetPeriod = item.period_index + newDuration - 1;
        const conflict = plannerItems.find(p => p.day_of_week === item.day_of_week && p.period_index === targetPeriod);

        if (conflict) {
            await supabase.from('weekly_planning').delete().eq('id', conflict.id);
        }

        try {
            await supabase
                .from('weekly_planning')
                .update({ duration: newDuration })
                .eq('id', item.id);

            setSchedule(prev => {
                const withoutConflict = prev.filter(p => !conflict || p.id !== conflict.id);
                return withoutConflict.map(p =>
                    p.id === item.id ? { ...p, duration: newDuration } : p
                );
            });

            setResizingItem(null);
            setResizeTargetPeriod(null);

        } catch (err) {
            console.error(err);
        }
    };

    const isSlotCovered = (day, period) => {
        return plannerItems.some(item =>
            item.day_of_week === day &&
            item.period_index < period &&
            (item.period_index + (item.duration || 1)) > period
        );
    };

    // Week Navigation
    const handlePrevWeek = () => {
        const currentIdx = weeks.findIndex(w => w.value === currentWeek);
        if (currentIdx > 0) setCurrentWeek(weeks[currentIdx - 1].value);
    };

    const handleNextWeek = () => {
        const currentIdx = weeks.findIndex(w => w.value === currentWeek);
        if (currentIdx < weeks.length - 1) setCurrentWeek(weeks[currentIdx + 1].value);
    };

    const handleWeekChange = (newWeekDate) => {
        setCurrentWeek(newWeekDate);
    };

    const currentWeekLabel = weeks.find(w => w.value === currentWeek)?.label || 'Semaine...';

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
                                    <button
                                        onClick={handlePrevWeek}
                                        className="p-1 hover:bg-surface rounded-lg text-grey-medium hover:text-text-main transition-colors"
                                        title="Semaine précédente"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <select
                                        value={currentWeek}
                                        onChange={(e) => handleWeekChange(e.target.value)}
                                        className="bg-transparent text-sm font-bold text-text-main outline-none max-w-[150px] sm:max-w-[200px] cursor-pointer px-1"
                                    >
                                        {weeks.map(week => (
                                            <option key={week.value} value={week.value} className="text-black">{week.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleNextWeek}
                                        className="p-1 hover:bg-surface rounded-lg text-grey-medium hover:text-text-main transition-colors"
                                        title="Semaine suivante"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 bg-input rounded-xl p-1 border border-border">
                                    <button
                                        onClick={() => setCurrentWeek(getRelativeWeekMonday(-1))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${currentWeek === getRelativeWeekMonday(-1) ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main hover:bg-surface'}`}
                                    >
                                        Semaine passée
                                    </button>
                                    <button
                                        onClick={() => setCurrentWeek(getRelativeWeekMonday(0))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${currentWeek === getRelativeWeekMonday(0) ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main hover:bg-surface'}`}
                                    >
                                        Semaine en cours
                                    </button>
                                    <button
                                        onClick={() => setCurrentWeek(getRelativeWeekMonday(1))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${currentWeek === getRelativeWeekMonday(1) ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main hover:bg-surface'}`}
                                    >
                                        Semaine prochaine
                                    </button>
                                </div>
                            </div>

                            {dbError && (
                                <span className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                    <AlertTriangle size={12} />
                                    Mise à jour BDD requise
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

                    {/* Main Grid Area */}
                    <div className="flex-1 min-h-0 overflow-hidden p-4 custom-scrollbar bg-input/50 relative"
                        onMouseLeave={() => resizingItem && handleResizeUp()}
                    >
                        <div className="h-full grid grid-cols-6 gap-3 min-w-[1000px] grid-rows-[auto_repeat(6,minmax(0,1fr))]">
                            {/* Explicit Grid Logic */}

                            {/* Row 1: Headers */}
                            <div className="p-2"></div>
                            {DAYS.map((d, i) => (
                                <div key={d} className="font-bold text-center text-grey-medium" style={{ gridColumn: i + 2, gridRow: 1 }}>
                                    {d}
                                </div>
                            ))}

                            {/* Column 1: Period Labels */}
                            {PERIODS.map((p, i) => (
                                <div key={p} className="flex items-center justify-center font-mono text-xl font-bold text-grey-medium/50 select-none" style={{ gridColumn: 1, gridRow: i + 2 }}>
                                    {p}
                                </div>
                            ))}

                            {/* Slots */}
                            {DAYS.map((day, dIndex) => (
                                <div key={day} style={{ display: 'contents' }}>
                                    {/* Day Headers (Sticky) */}
                                    {/* (Already rendered above in separate loops, structure is complex here.
                                        Wait, the loop structure is periods inside days or days inside periods?
                                        The headers are outside. This map is effectively the columns content)
                                    */}
                                    {PERIODS.map((period, pIndex) => {
                                        // Find ALL items for this slot
                                        const items = plannerItems.filter(s => s.day_of_week === day && s.period_index === period);
                                        const covered = isSlotCovered(day, period);
                                        // Resize target check (based on *any* item resizing?)
                                        // If we have multiple items, which one is resizing?
                                        // resizingItem is global state. match.
                                        const isResizeTarget = resizingItem && resizingItem.day_of_week === day && period <= resizeTargetPeriod && period > resizingItem.period_index;
                                        // Fix: Wednesday is OFF only for periods 5 and 6. Period is 1-based (1..6).
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

                    {/* Le DOCK */}
                    <div className="bg-surface border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10 relative shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xs font-bold text-grey-medium uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={14} /> DOCK
                            </h3>
                            <span className="text-[10px] bg-input px-2 py-0.5 rounded text-grey-medium">{dockItems.length} modules prêts</span>
                        </div>

                        {/* Scrollable Area */}
                        <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[35vh] w-full items-start content-start custom-scrollbar pr-20">
                            {/* Flattened List Sorted by Branch then items */}
                            {(() => {
                                const sortedItems = [...dockItems].sort((a, b) => {
                                    // 1. Sort by Branch
                                    const branchA = a.matiere_principale || 'Autre';
                                    const branchB = b.matiere_principale || 'Autre';
                                    if (branchA !== branchB) return branchA.localeCompare(branchB);

                                    // 2. Sort by Date
                                    if (!a.date_fin) return 1;
                                    if (!b.date_fin) return -1;
                                    return new Date(a.date_fin) - new Date(b.date_fin);
                                });

                                return sortedItems.map(item => (
                                    <DraggableDockItem
                                        key={item.id}
                                        item={item}
                                        onDelete={handlePermanentDelete}
                                        variant="pill"
                                    />
                                ));
                            })()}
                        </div>

                        {/* Persistent Add Button (Anchored Top-Right of Dock Panel) */}
                        <div
                            onClick={() => setIsPrepMode(true)}
                            className="absolute top-4 right-4 h-12 w-12 border-2 border-dashed border-yellow-500/30 rounded-full flex items-center justify-center text-yellow-600/50 cursor-pointer hover:border-yellow-400 hover:text-yellow-400 transition-all bg-yellow-400/5 hover:bg-yellow-400/10 z-20"
                            title="Ajouter des modules"
                        >
                            <Plus size={24} />
                        </div>
                    </div>

                    {/* Preparation Modal Overlay */}
                    <PreparationModal
                        isOpen={isPrepMode}
                        onClose={() => setIsPrepMode(false)}
                        modules={modules}
                        dockedItems={dockItems}
                        onToggleDock={handleToggleDock}
                        currentWeekDate={currentWeek}
                    />

                    {/* Drag Overlay */}
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
