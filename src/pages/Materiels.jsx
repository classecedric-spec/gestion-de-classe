import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Package, Search, Plus, Edit, Trash2, Loader2, ChevronRight, FileText, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import AddMaterielModal from '../components/AddMaterielModal';

const Materiels = () => {
    const [materiels, setMateriels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMateriel, setSelectedMateriel] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [materielToEdit, setMaterielToEdit] = useState(null);
    const [materielToDelete, setMaterielToDelete] = useState(null);

    // Linked Activities State
    const [linkedActivities, setLinkedActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    useEffect(() => {
        fetchMateriels();
    }, []);

    useEffect(() => {
        if (selectedMateriel) {
            fetchLinkedActivities(selectedMateriel.id);
        } else {
            setLinkedActivities([]);
        }
    }, [selectedMateriel]);

    const fetchMateriels = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('TypeMateriel')
                .select('*')
                .order('nom');

            if (error) throw error;
            setMateriels(data || []);
            if (data && data.length > 0 && !selectedMateriel) {
                setSelectedMateriel(data[0]);
            }
        } catch (error) {
            console.error('Error fetching materiels:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLinkedActivities = async (materielId) => {
        setLoadingActivities(true);
        try {
            const { data, error } = await supabase
                .from('ActiviteMateriel')
                .select(`
                    activite_id,
                    Activite:activite_id (
                        id,
                        titre,
                        Module:module_id (nom),
                        ActiviteMateriel (
                            TypeMateriel (
                                id,
                                nom,
                                acronyme
                            )
                        )
                    )
                `)
                .eq('type_materiel_id', materielId);

            if (error) throw error;

            // Extract activities from the join
            const activities = data?.map(item => item.Activite).filter(Boolean) || [];
            activities.sort((a, b) => a.titre.localeCompare(b.titre));

            setLinkedActivities(activities);
        } catch (error) {
            console.error('Error fetching linked activities:', error);
            setLinkedActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleDelete = async () => {
        if (!materielToDelete) return;

        try {
            const { error } = await supabase
                .from('TypeMateriel')
                .delete()
                .eq('id', materielToDelete.id);

            if (error) throw error;

            setMateriels(prev => prev.filter(m => m.id !== materielToDelete.id));
            if (selectedMateriel?.id === materielToDelete.id) {
                setSelectedMateriel(null);
            }
            setMaterielToDelete(null);

            // If the deleted one was selected, select the first available if any
            if (selectedMateriel?.id === materielToDelete.id) {
                const remaining = materiels.filter(m => m.id !== materielToDelete.id);
                if (remaining.length > 0) setSelectedMateriel(remaining[0]);
                else setSelectedMateriel(null);
            }
        } catch (error) {
            console.error('Error deleting materiel:', error);
            alert("Erreur lors de la suppression. Ce matériel est peut-être lié à des activités.");
        }
    };

    const handleMaterielSaved = (saved) => {
        if (materielToEdit) {
            setMateriels(prev => prev.map(m => m.id === saved.id ? saved : m).sort((a, b) => a.nom.localeCompare(b.nom)));
            if (selectedMateriel?.id === saved.id) {
                setSelectedMateriel(saved);
            }
        } else {
            const newlist = [...materiels, saved].sort((a, b) => a.nom.localeCompare(b.nom));
            setMateriels(newlist);
            setSelectedMateriel(saved);
        }
    };

    const handleOpenAdd = () => {
        setMaterielToEdit(null);
        setShowModal(true);
    };

    const handleOpenEdit = (materiel) => {
        setMaterielToEdit(materiel);
        setShowModal(true);
    };

    const filteredMateriels = useMemo(() => {
        return materiels.filter(m =>
            m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.acronyme && m.acronyme.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [materiels, searchTerm]);

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* LEFT PANEL: LIST (1/3) */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <Package className="text-primary" size={24} />
                            Matériel
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {materiels.length} Total
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un matériel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : filteredMateriels.length === 0 ? (
                        <div className="text-center p-8 text-grey-medium italic">Aucun matériel trouvé.</div>
                    ) : (
                        filteredMateriels.map((materiel) => (
                            <div
                                key={materiel.id}
                                onClick={() => setSelectedMateriel(materiel)}
                                className={clsx(
                                    "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                    selectedMateriel?.id === materiel.id
                                        ? "selected-state"
                                        : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                                )}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                                    selectedMateriel?.id === materiel.id ? "bg-white/20 text-text-dark" : "bg-background text-primary"
                                )}>
                                    <Package size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={clsx(
                                            "font-semibold truncate",
                                            selectedMateriel?.id === materiel.id ? "text-text-dark" : "text-text-main"
                                        )}>
                                            {materiel.nom}
                                        </h3>
                                        {materiel.acronyme && (
                                            <span className={clsx(
                                                "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
                                                selectedMateriel?.id === materiel.id
                                                    ? "bg-black/20 text-white/80 border-black/10"
                                                    : "bg-primary/10 text-primary border-primary/20"
                                            )}>
                                                {materiel.acronyme}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Hover Actions */}
                                <div className={clsx(
                                    "flex gap-1 transition-opacity",
                                    selectedMateriel?.id === materiel.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(materiel); }}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            selectedMateriel?.id === materiel.id
                                                ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                                : "text-grey-medium hover:text-white hover:bg-white/10"
                                        )}
                                        title="Modifier"
                                    >
                                        <Edit size={14} />
                                    </button>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setMaterielToDelete(materiel); }}
                                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Supprimer"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>

                                <ChevronRight size={16} className={clsx(
                                    "transition-transform",
                                    selectedMateriel?.id === materiel.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                                )} />
                            </div>
                        ))
                    )}
                </div>

                {/* Add Button */}
                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <button
                        onClick={handleOpenAdd}
                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Nouveau Matériel</span>
                    </button>
                </div>
            </div>

            {/* RIGHT PANEL: DETAILS (2/3) */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                {selectedMateriel ? (
                    <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                            <div className="flex gap-6 items-center">
                                <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0">
                                    <Package size={48} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-4xl font-bold text-text-main">{selectedMateriel.nom}</h1>
                                        {selectedMateriel.acronyme && (
                                            <span className="text-2xl font-mono text-white/50 bg-white/5 px-2 py-1 rounded-lg">
                                                [{selectedMateriel.acronyme}]
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-grey-medium flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                        Utilisé dans {linkedActivities.length} activité(s)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20 space-y-8">

                            {/* Information Section */}
                            <div>
                                <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                                    <Package className="text-primary" size={24} />
                                    Informations
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                        <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Nom du matériel</label>
                                        <p className="text-lg text-white font-medium">{selectedMateriel.nom}</p>
                                    </div>
                                    {selectedMateriel.acronyme && (
                                        <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                            <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Acronyme</label>
                                            <p className="text-white text-lg font-mono font-medium">{selectedMateriel.acronyme}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Activities Section */}
                            <div>
                                <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                                    <Sparkles className="text-accent" size={24} />
                                    Activités liées
                                    <span className="text-xs bg-white/5 text-grey-medium px-2 py-0.5 rounded-full ml-auto normal-case font-normal border border-white/5">
                                        {linkedActivities.length} activités
                                    </span>
                                </h3>

                                <div className="grid grid-cols-1 gap-3">
                                    {loadingActivities ? (
                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                                    ) : linkedActivities.length === 0 ? (
                                        <div className="text-center p-8 bg-surface/30 rounded-xl border border-dashed border-white/10 text-grey-medium">
                                            Aucune activité n'utilise ce matériel pour le moment.
                                        </div>
                                    ) : (
                                        linkedActivities.map(activity => (
                                            <div key={activity.id} className="group flex items-center p-4 bg-surface/50 hover:bg-surface border border-white/5 hover:border-primary/20 rounded-xl transition-all">
                                                <div className="p-2 bg-background rounded-lg text-primary mr-4 opacity-70 group-hover:opacity-100">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-text-main group-hover:text-primary transition-colors">{activity.titre}</h4>
                                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                        {activity.Module && (
                                                            <p className="text-xs text-grey-medium flex items-center gap-1">
                                                                Module: <span className="text-white/70">{activity.Module.nom}</span>
                                                            </p>
                                                        )}

                                                        {/* Material Acronyms */}
                                                        {activity.ActiviteMateriel && activity.ActiviteMateriel.length > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                {activity.ActiviteMateriel.some(am => am.TypeMateriel?.acronyme) && (
                                                                    <span className="text-xs text-grey-medium opacity-50 mx-1">|</span>
                                                                )}
                                                                {activity.ActiviteMateriel
                                                                    .map(am => am.TypeMateriel)
                                                                    .filter(tm => tm?.acronyme)
                                                                    .map((tm) => (
                                                                        <span
                                                                            key={tm.id}
                                                                            title={tm.nom}
                                                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-grey-light border border-white/10"
                                                                        >
                                                                            {tm.acronyme}
                                                                        </span>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-center text-grey-medium p-8 text-center">
                        <div className="w-24 h-24 bg-surface/50 rounded-full flex items-center justify-center mb-6">
                            <Package size={48} className="opacity-50" />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Aucun matériel sélectionné</h2>
                        <p>Sélectionnez un matériel dans la liste pour voir ses détails et les activités associées.</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {materielToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le matériel ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer <span className="text-white font-bold">"{materielToDelete.nom}"</span> ?
                            <br />Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMaterielToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddMaterielModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onAdded={handleMaterielSaved}
                materielToEdit={materielToEdit}
            />
        </div>
    );
};

export default Materiels;
