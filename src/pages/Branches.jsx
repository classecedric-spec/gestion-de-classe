import React, { useState } from 'react';
import { useBranches } from '../features/branches/hooks/useBranches';
import BranchList from '../features/branches/components/BranchList';
import BranchDetails from '../features/branches/components/BranchDetails';
import AddBranchModal from '../features/branches/components/AddBranchModal';
import { Trash2, Loader2 } from 'lucide-react';
import { useInAppMigration } from '../hooks/useInAppMigration';

const Branches = () => {
    const {
        // branches, // Used internally by filteredBranches, not needed here directly if we use filtered
        loading,
        filteredBranches,
        searchTerm,
        setSearchTerm,
        selectedBranch,
        setSelectedBranch,
        subBranches,
        // loadingSub, // Not used
        createBranch,
        updateBranch,
        deleteBranch,
        reorderBranches,
        reorderSubBranches
    } = useBranches();

    // In-app migration for branches and sub-branches
    useInAppMigration(filteredBranches, 'Branche', 'branche');
    useInAppMigration(subBranches, 'SousBranche', 'sousbranche');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [branchToEdit, setBranchToEdit] = useState(null);
    const [branchToDelete, setBranchToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handlers
    const handleOpenCreate = () => {
        setBranchToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (branch) => {
        setBranchToEdit(branch);
        setIsAddModalOpen(true);
    };

    const handleModalSubmit = async (branchData) => {
        if (branchToEdit) {
            await updateBranch(branchToEdit.id, branchData);
        } else {
            await createBranch(branchData);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!branchToDelete) return;
        setIsDeleting(true);
        const success = await deleteBranch(branchToDelete.id);
        setIsDeleting(false);
        if (success) {
            setBranchToDelete(null);
        }
    };

    return (
        <div className="flex h-full gap-6 animate-in fade-in duration-500 relative">
            <BranchList
                branches={filteredBranches}
                loading={loading}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedBranch={selectedBranch}
                onSelect={setSelectedBranch}
                onOpenAdd={handleOpenCreate}
                onEdit={handleEdit}
                onDelete={setBranchToDelete}
                onReorder={reorderBranches}
            />

            <BranchDetails
                selectedBranch={selectedBranch}
                subBranches={subBranches}
                onReorderSub={reorderSubBranches}
            />

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
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddBranchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                branchToEdit={branchToEdit}
            />
        </div>
    );
};

export default Branches;
