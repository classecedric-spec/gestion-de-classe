import React, { useState } from 'react';
import { useSubBranches } from '../features/sub-branches/hooks/useSubBranches';
import { useBranches } from '../features/branches/hooks/useBranches';
import SubBranchList from '../features/sub-branches/components/SubBranchList';
import SubBranchDetails from '../features/sub-branches/components/SubBranchDetails';
import AddSubBranchModal from '../features/branches/components/AddSubBranchModal';
import { Trash2, Loader2 } from 'lucide-react';
import { useInAppMigration } from '../hooks/useInAppMigration';

const SubBranches: React.FC = () => {
    const {
        filteredSubBranches,
        loading,
        searchTerm,
        setSearchTerm,
        selectedSubBranch,
        setSelectedSubBranch,
        createSubBranch,
        updateSubBranch,
        deleteSubBranch,
        subBranches,
    } = useSubBranches();

    // Fetch branches for the modal dropdown
    const { branches: availableBranches } = useBranches();

    // In-app migration
    useInAppMigration(filteredSubBranches, 'SousBranche', 'sousbranche');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [subBranchToEdit, setSubBranchToEdit] = useState<any>(null);
    const [subBranchToDelete, setSubBranchToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handlers
    const handleOpenCreate = () => {
        setSubBranchToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (subBranch: any) => {
        setSubBranchToEdit(subBranch);
        setIsAddModalOpen(true);
    };

    const handleModalSubmit = async (subBranchData: any) => {
        let success = false;
        if (subBranchToEdit) {
            success = await updateSubBranch(subBranchToEdit.id, subBranchData);
        } else {
            success = await createSubBranch(subBranchData);
        }

        if (success) {
            setIsAddModalOpen(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!subBranchToDelete) return;
        setIsDeleting(true);
        const success = await deleteSubBranch(subBranchToDelete.id);
        setIsDeleting(false);
        if (success) {
            setSubBranchToDelete(null);
        }
    };

    return (
        <div className="flex h-full gap-6">
            <SubBranchList
                subBranches={filteredSubBranches}
                loading={loading}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedSubBranch={selectedSubBranch}
                onSelect={setSelectedSubBranch}
                onOpenAdd={handleOpenCreate}
                onEdit={handleEdit}
                onDelete={setSubBranchToDelete}
            />

            <SubBranchDetails selectedSubBranch={selectedSubBranch} />

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

            <AddSubBranchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                branches={availableBranches}
                subBranchToEdit={subBranchToEdit}
            />
        </div>
    );
};

export default SubBranches;
