import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GitBranch, Search, Plus, Edit, Trash2, Loader2, Image as ImageIcon, X } from 'lucide-react';
import clsx from 'clsx';
import AddBranchModal from '../components/AddBranchModal';

const Branches = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [branchToDelete, setBranchToDelete] = useState(null);
    const [branchToEdit, setBranchToEdit] = useState(null);

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Branche')
                .select('*')
                .order('nom');

            if (error) throw error;
            setBranches(data || []);
            if (data && data.length > 0 && !selectedBranch) {
                setSelectedBranch(data[0]);
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
        } finally {
            setLoading(false);
        }
    };



    const handleOpenCreate = () => {
        setBranchToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (branch) => {
        setBranchToEdit(branch);
        setIsAddModalOpen(true);
    };

    const handleDelete = async () => {
        const targetBranch = branchToDelete;
        if (!targetBranch) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("Vous devez être connecté pour supprimer.");
            }

            const { data, error } = await supabase
                .from('Branche')
                .delete()
                .eq('id', targetBranch.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                if (targetBranch.user_id && targetBranch.user_id !== user.id) {
                    throw new Error("Vous n'êtes pas le propriétaire de cette branche. Suppression impossible.");
                }
                throw new Error("Suppression échouée. Vérifiez vos permissions.");
            }

            if (selectedBranch?.id === targetBranch.id) {
                setSelectedBranch(null);
            }
            setBranchToDelete(null);
            fetchBranches();
        } catch (err) {
            console.error('Error deleting branch:', err);
            alert(err.message || "Erreur lors de la suppression.");
        } finally {
            setLoading(false);
        }
    };

    const filteredBranches = useMemo(() => {
        return branches.filter(b =>
            b.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [branches, searchTerm]);

    const [subBranches, setSubBranches] = useState([]);

    useEffect(() => {
        if (selectedBranch) {
            fetchSubBranches(selectedBranch.id);
        } else {
            setSubBranches([]);
        }
    }, [selectedBranch]);

    const fetchSubBranches = async (branchId) => {
        const { data, error } = await supabase
            .from('SousBranche')
            .select('*')
            .eq('branche_id', branchId)
            .order('nom');

        if (error) {
            console.error('Error fetching sub-branches:', error);
        } else {
            setSubBranches(data || []);
        }
    };

    const handleCreated = () => {
        fetchBranches();
        if (selectedBranch) {
            fetchSubBranches(selectedBranch.id);
        }
        if (branchToEdit) {
            setBranchToEdit(null);
        }
    };

    // ... existing functions ...

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar List */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <GitBranch className="text-primary" size={24} />
                            Branches
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {branches.length} Total
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher une branche..."
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
                    ) : filteredBranches.length === 0 ? (
                        <div className="text-center p-8 text-grey-medium italic">Aucune branche trouvée.</div>
                    ) : (
                        filteredBranches.map((branch) => (
                            <div
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch)}
                                className={clsx(
                                    "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                    selectedBranch?.id === branch.id
                                        ? "selected-state"
                                        : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedBranch(branch); }}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                                    selectedBranch?.id === branch.id ? "bg-white/20 text-text-dark" : "bg-background text-primary"
                                )}>
                                    {branch.photo_base64 ? (
                                        <img src={branch.photo_base64} alt={branch.nom} className="w-full h-full object-cover" />
                                    ) : (
                                        <GitBranch size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={clsx(
                                        "font-semibold truncate",
                                        selectedBranch?.id === branch.id ? "text-text-dark" : "text-text-main"
                                    )}>
                                        {branch.nom}
                                    </h3>
                                </div>

                                <div className={clsx(
                                    "flex gap-1 transition-opacity",
                                    selectedBranch?.id === branch.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleEdit(branch); }}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            selectedBranch?.id === branch.id
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
                                    onClick={(e) => { e.stopPropagation(); setBranchToDelete(branch); }}
                                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Supprimer la branche"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>

                                <ChevronRight size={16} className={clsx(
                                    "transition-transform",
                                    selectedBranch?.id === branch.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
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
                        <span className="font-medium">Nouvelle Branche</span>
                    </button>
                </div>
            </div>

            {/* Details Area */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                {selectedBranch ? (
                    <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                            <div className="flex gap-6 items-center">
                                <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0 overflow-hidden relative group">
                                    {selectedBranch.photo_base64 ? (
                                        <img src={selectedBranch.photo_base64} alt={selectedBranch.nom} className="w-full h-full object-cover" />
                                    ) : (
                                        <GitBranch size={48} />
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold text-text-main mb-2">{selectedBranch.nom}</h1>
                                </div>
                            </div>
                            <div className="flex gap-2">
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                                <GitBranch className="text-primary" size={24} />
                                Sous-branches liées
                                <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-grey-light ml-auto">
                                    {subBranches.length}
                                </span>
                            </h3>

                            <div className="space-y-2">
                                {subBranches.length === 0 ? (
                                    <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-xl">
                                        <p className="text-grey-medium italic">Aucune sous-branche liée.</p>
                                    </div>
                                ) : (
                                    subBranches.map(sub => (
                                        <div key={sub.id} className="flex items-center gap-3 p-4 bg-surface/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary shrink-0 overflow-hidden shadow-inner">
                                                {sub.photo_base64 ? (
                                                    <img src={sub.photo_base64} alt={sub.nom} className="w-full h-full object-cover" />
                                                ) : (
                                                    <GitBranch size={18} />
                                                )}
                                            </div>
                                            <span className="font-semibold text-text-main truncate">{sub.nom}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-center text-grey-medium">
                        <GitBranch size={64} className="mb-4 opacity-50" />
                        <p className="text-xl">Sélectionnez une branche pour voir les détails</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {branchToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer la branche ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer la branche <span className="text-white font-bold">"{branchToDelete.nom}"</span> ?
                            <br />Toutes les sous-branches associées seront supprimées.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBranchToDelete(null)}
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

            <AddBranchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdded={handleCreated}
                branchToEdit={branchToEdit}
            />
        </div>
    );
};

const ChevronRight = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default Branches;
