import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Layers, Plus, Edit, Trash2, Loader2, GripVertical, Check, X, Search, GraduationCap, ChevronRight, User } from 'lucide-react';
import clsx from 'clsx';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddNiveauModal from '../components/AddNiveauModal';

const SortableNiveauItem = ({ niveau, index, isSelected, onClick, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: niveau.id });

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
            onClick={() => onClick(niveau)}
            className={clsx(
                "group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:z-50",
                isSelected
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface",
                isDragging ? "opacity-50 border-primary dashed" : ""
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className={clsx(
                    "cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors outline-none",
                    isSelected
                        ? "text-text-dark/50 hover:text-text-dark hover:bg-text-dark/10"
                        : "text-grey-medium hover:text-white hover:bg-white/5"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={16} />
            </div>

            {/* Index Badge */}
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors shadow-inner",
                isSelected
                    ? "bg-white/20 text-text-dark"
                    : "bg-background text-primary group-hover:bg-white/10 group-hover:text-white"
            )}>
                {index + 1}
            </div>

            <div className="flex-1 min-w-0">
                <h3 className={clsx(
                    "font-bold text-sm truncate transition-colors",
                    isSelected ? "text-text-dark" : "text-text-main"
                )}>
                    {niveau.nom}
                </h3>
            </div>

            <div className={clsx(
                "flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(niveau); }}
                    className={clsx(
                        "p-1.5 rounded-lg transition-colors",
                        isSelected
                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                            : "text-grey-medium hover:text-white hover:bg-white/10"
                    )}
                    title="Modifier"
                >
                    <Edit size={14} />
                </button>
            </div>

            <ChevronRight size={16} className={clsx(
                "transition-transform ml-2",
                isSelected ? "text-text-dark translate-x-0" : "text-grey-dark group-hover:text-white"
            )} />

            {/* Absolute Delete Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(niveau); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer le niveau"
            >
                <X size={14} strokeWidth={3} />
            </button>
        </div>
    );
};

const Niveaux = () => {
    const [niveaux, setNiveaux] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [niveauToEdit, setNiveauToEdit] = useState(null);
    const [niveauToDelete, setNiveauToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNiveau, setSelectedNiveau] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        fetchNiveaux();
    }, []);

    useEffect(() => {
        if (selectedNiveau) {
            fetchStudents(selectedNiveau.id);
        } else {
            setStudents([]);
        }
    }, [selectedNiveau]);

    const fetchNiveaux = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Niveau')
                .select('*, Eleve(count)')
                .order('ordre', { ascending: true });

            if (error) throw error;
            setNiveaux(data || []);
            if (data && data.length > 0 && !selectedNiveau) {
                setSelectedNiveau(data[0]);
            }
        } catch (error) {
            console.error('Error fetching niveaux:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (niveauId) => {
        setLoadingStudents(true);
        try {
            const { data, error } = await supabase
                .from('Eleve')
                .select('*')
                .eq('niveau_id', niveauId)
                .order('nom', { ascending: true });

            if (error) throw error;
            setStudents(data || []);
        } catch (err) {
            console.error("Error fetching students for level:", err);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleDelete = async () => {
        const targetNiveau = niveauToDelete;
        if (!targetNiveau) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('Niveau')
                .delete()
                .eq('id', targetNiveau.id);
            if (error) throw error;

            const newNiveaux = niveaux.filter(n => n.id !== targetNiveau.id);
            setNiveaux(newNiveaux);

            if (selectedNiveau && selectedNiveau.id === targetNiveau.id) {
                setSelectedNiveau(newNiveaux.length > 0 ? newNiveaux[0] : null);
            }
            setNiveauToDelete(null);
        } catch (error) {
            console.error('Error deleting niveau:', error);
            alert("Erreur lors de la suppression.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setNiveauToEdit(null);
        setShowModal(true);
    };

    const handleOpenEdit = (niveau) => {
        setNiveauToEdit(niveau);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setNiveauToEdit(null);
    };

    const handleNiveauSaved = (savedNiveau) => {
        if (niveauToEdit) {
            // Update existant
            setNiveaux(prev => prev.map(n => n.id === savedNiveau.id ? { ...n, ...savedNiveau } : n));
            if (selectedNiveau && selectedNiveau.id === savedNiveau.id) {
                setSelectedNiveau(prev => ({ ...prev, ...savedNiveau }));
            }
        } else {
            // New creation
            setNiveaux(prev => [...prev, savedNiveau]);
            setSelectedNiveau(savedNiveau);
        }
        // Force refresh only if strictly needed (e.g. reordering), but local update is usually enough
        handleModalClose();
    };


    // Drag and Drop Logic
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

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setNiveaux((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Update orders in DB
                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    nom: item.nom,
                    user_id: item.user_id,
                    ordre: index + 1
                }));
                // Fire and forget 
                updateOrder(updates);

                return newItems;
            });
        }
    };

    const updateOrder = async (updates) => {
        try {
            const { error } = await supabase
                .from('Niveau')
                .upsert(updates, { onConflict: 'id' });
            if (error) throw error;
        } catch (err) {
            console.error("Error updating niveau order:", err);
        }
    };

    const filteredNiveaux = niveaux.filter(n =>
        n.nom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">

            {/* LEFT PANEL: LIST */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">

                {/* Header & Search */}
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <Layers className="text-primary" size={24} />
                            Niveaux
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {niveaux.length} Total
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                    ) : filteredNiveaux.length === 0 ? (
                        <div className="text-center py-8 text-grey-dark text-sm italic">
                            Aucun niveau trouvé.
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredNiveaux.map(n => n.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredNiveaux.map((niveau, index) => (
                                    <SortableNiveauItem
                                        key={niveau.id}
                                        niveau={niveau}
                                        index={index}
                                        isSelected={selectedNiveau?.id === niveau.id}
                                        onClick={setSelectedNiveau}
                                        onEdit={handleOpenEdit}
                                        onDelete={() => setNiveauToDelete(niveau)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>

                {/* Add Level Button */}
                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <button
                        onClick={handleOpenAdd}
                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Ajouter un niveau</span>
                    </button>
                </div>
            </div>

            {/* RIGHT PANEL: DETAILS */}
            <div className="flex-1 bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl flex flex-col overflow-hidden relative">
                {selectedNiveau ? (
                    <>
                        <div className="bg-surface/20 p-8 border-b border-white/5 flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-text-main flex items-center gap-3">
                                    {selectedNiveau.nom}
                                </h1>
                                <p className="text-grey-medium flex items-center gap-2 mt-2 font-medium">
                                    <Layers size={16} className="text-primary" />
                                    Niveau scolaire
                                    <span className="w-1 h-1 rounded-full bg-grey-dark"></span>
                                    {students.length} Élève{students.length > 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="flex gap-2">
                            </div>
                        </div>

                        {/* Students List for this Level */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            <h3 className="text-sm font-bold text-grey-dark uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/5 pb-2">
                                <GraduationCap size={16} className="text-primary" />
                                Élèves inscrits
                            </h3>

                            {loadingStudents ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                            ) : students.length === 0 ? (
                                <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center">
                                    <User size={48} className="text-grey-dark mb-4 opacity-50" />
                                    <p className="text-grey-medium italic">Aucun élève dans ce niveau.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {students.map(student => (
                                        <div key={student.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all hover:bg-white/10 group">
                                            <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-lg shadow-inner">
                                                {student.prenom[0]}{student.nom[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-text-main truncate">{student.prenom} {student.nom}</div>
                                                <div className="text-xs text-grey-medium truncate">Né(e) le {new Date(student.date_naissance).toLocaleDateString()}</div>
                                            </div>
                                            <ChevronRight size={16} className="text-grey-dark group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-12">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Layers size={40} className="text-grey-medium" />
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-2">Sélectionnez un niveau</h3>
                        <p className="text-grey-medium max-w-sm">Cliquez sur un niveau dans la liste pour voir les détails et les élèves inscrits.</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {niveauToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le niveau ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer le niveau <span className="text-white font-bold">"{niveauToDelete.nom}"</span> ?
                            <br />Cette action est irréversible et retirera le niveau des élèves associés.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setNiveauToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddNiveauModal
                isOpen={showModal}
                onClose={handleModalClose}
                onAdded={handleNiveauSaved}
                niveauToEdit={niveauToEdit}
            />
        </div>
    );
};

export default Niveaux;
