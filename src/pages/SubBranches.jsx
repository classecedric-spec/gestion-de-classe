import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Layers, Search, Plus, Edit, Trash2, Loader2, GitBranch, X } from 'lucide-react';
import clsx from 'clsx';
import AddSubBranchModal from '../components/AddSubBranchModal';

const SubBranches = () => {
    const [subBranches, setSubBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubBranch, setSelectedSubBranch] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [subBranchToDelete, setSubBranchToDelete] = useState(null);
    const [subBranchToEdit, setSubBranchToEdit] = useState(null);

    useEffect(() => {
        fetchSubBranches();
    }, []);

    const fetchSubBranches = async () => {
        setLoading(true);
        try {
            // Fetch sub-branches with parent Branch info
            const { data, error } = await supabase
                .from('SousBranche')
                .select(`
                    *,
                    Branche:branche_id (nom)
                `)
                .order('nom');

            if (error) throw error;
            setSubBranches(data || []);
            if (data && data.length > 0 && !selectedSubBranch) {
                setSelectedSubBranch(data[0]);
            }
        } catch (error) {
            console.error('Error fetching sub-branches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreated = () => {
        fetchSubBranches();
        if (subBranchToEdit) {
            setSubBranchToEdit(null);
        }
    };

    const handleOpenCreate = () => {
        setSubBranchToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (subBranch) => {
        setSubBranchToEdit(subBranch);
        setIsAddModalOpen(true);
    };

    const handleDelete = async () => {
        const targetSubBranch = subBranchToDelete;
        if (!targetSubBranch) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('SousBranche')
                .delete()
                .eq('id', targetSubBranch.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Suppression échouée. Vérifiez vos permissions.");
            }

            if (selectedSubBranch?.id === targetSubBranch.id) {
                setSelectedSubBranch(null);
            }
            setSubBranchToDelete(null);
            fetchSubBranches();
        } catch (err) {
            console.error('Error deleting sub-branch:', err);
            alert("Erreur lors de la suppression: " + (err.message || "Erreur inconnue"));
        } finally {
            setLoading(false);
        }
    };

    const filteredSubBranches = useMemo(() => {
        return subBranches.filter(sb =>
            sb.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sb.Branche?.nom && sb.Branche.nom.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [subBranches, searchTerm]);

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar List */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <Layers className="text-primary" size={24} />
                            Sous-branches
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {subBranches.length} Total
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher une sous-branche..."
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
                    ) : filteredSubBranches.length === 0 ? (
                        <div className="text-center p-8 text-grey-medium italic">Aucune sous-branche trouvée.</div>
                    ) : (
                        filteredSubBranches.map((sb) => (
                            <div
                                key={sb.id}
                                onClick={() => setSelectedSubBranch(sb)}
                                className={clsx(
                                    "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                    selectedSubBranch?.id === sb.id
                                        ? "selected-state"
                                        : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSubBranch(sb); }}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                                    selectedSubBranch?.id === sb.id ? "bg-white/20 text-text-dark" : "bg-background text-primary"
                                )}>
                                    {sb.photo_base64 ? (
                                        <img src={sb.photo_base64} alt={sb.nom} className="w-full h-full object-cover" />
                                    ) : (
                                        <Layers size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={clsx(
                                        "font-semibold truncate",
                                        selectedSubBranch?.id === sb.id ? "text-text-dark" : "text-text-main"
                                    )}>
                                        {sb.nom}
                                    </h3>
                                    {sb.Branche && (
                                        <p className={clsx(
                                            "text-xs truncate flex items-center gap-1",
                                            selectedSubBranch?.id === sb.id ? "text-text-dark/70" : "text-grey-medium"
                                        )}>
                                            <GitBranch size={10} />
                                            {sb.Branche.nom}
                                        </p>
                                    )}
                                </div>

                                <div className={clsx(
                                    "flex gap-1 transition-opacity",
                                    selectedSubBranch?.id === sb.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleEdit(sb); }}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            selectedSubBranch?.id === sb.id
                                                ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                                : "text-grey-medium hover:text-white hover:bg-white/10"
                                        )}
                                        title="Modifier"
                                    >
                                        <Edit size={14} />
                                    </div>
                                </div>

                                {/* Absolute Delete Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSubBranchToDelete(sb); }}
                                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Supprimer la sous-branche"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>

                                <ChevronRight size={16} className={clsx(
                                    "transition-transform",
                                    selectedSubBranch?.id === sb.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                                )} />
                            </div>
                        ))
                    )}
                </div>

                {/* Add Button */}
                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <button
                        onClick={handleOpenCreate}
                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Nouvelle Sous-branche</span>
                    </button>
                </div>
            </div>

            {/* Details Area */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                {selectedSubBranch ? (
                    <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                            <div className="flex gap-6 items-center">
                                <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0 overflow-hidden relative group">
                                    {selectedSubBranch.photo_base64 ? (
                                        <img src={selectedSubBranch.photo_base64} alt={selectedSubBranch.nom} className="w-full h-full object-cover" />
                                    ) : (
                                        <Layers size={48} />
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold text-text-main mb-2">{selectedSubBranch.nom}</h1>
                                    <div className="flex items-center gap-4 text-grey-medium">
                                        {selectedSubBranch.Branche && (
                                            <span className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm">
                                                <GitBranch size={14} />
                                                {selectedSubBranch.Branche.nom}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                                <Layers className="text-primary" size={24} />
                                Informations
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                    <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Nom de la sous-branche</label>
                                    <p className="text-lg text-white font-medium">{selectedSubBranch.nom}</p>
                                </div>
                                <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                    <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Branche Appartenance</label>
                                    <p className="text-white text-lg font-medium flex items-center gap-2">
                                        <GitBranch size={16} className="text-primary" />
                                        {selectedSubBranch.Branche?.nom || "Aucune"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-center text-grey-medium">
                        <Layers size={64} className="mb-4 opacity-50" />
                        <p className="text-xl">Sélectionnez une sous-branche pour voir les détails</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {subBranchToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer la sous-branche ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer la sous-branche <span className="text-white font-bold">"{subBranchToDelete.nom}"</span> ?
                            <br />Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setSubBranchToDelete(null)}
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

            <AddSubBranchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdded={handleCreated}
                subBranchToEdit={subBranchToEdit}
            />
        </div>
    );
};

const ChevronRight = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default SubBranches;
