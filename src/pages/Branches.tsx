import React, { useState } from 'react';
import { useBranches } from '../features/branches/hooks/useBranches';
import BranchList from '../features/branches/components/BranchList';
import BranchDetails from '../features/branches/components/BranchDetails';
import AddBranchModal from '../features/branches/components/AddBranchModal';
import { useInAppMigration } from '../hooks/useInAppMigration';
import { ConfirmModal } from '../components/ui';

const Branches: React.FC = () => {
    const {
        loading,
        filteredBranches,
        searchTerm,
        setSearchTerm,
        selectedBranch,
        setSelectedBranch,
        subBranches,
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
    const [branchToEdit, setBranchToEdit] = useState<any>(null);
    const [branchToDelete, setBranchToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handlers
    const handleOpenCreate = () => {
        setBranchToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleEdit = (branch: any) => {
        setBranchToEdit(branch);
        setIsAddModalOpen(true);
    };

    const handleModalSubmit = async (branchData: any) => {
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

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!branchToDelete}
                onClose={() => setBranchToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer la branche ?"
                message={`Êtes-vous sûr de vouloir supprimer la branche "${branchToDelete?.nom}" ? Toutes les sous-branches associées seront supprimées.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

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
