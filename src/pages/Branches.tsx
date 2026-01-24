import React, { useState, useRef, useLayoutEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { useBranches } from '../features/branches/hooks/useBranches';
import BranchList from '../features/branches/components/BranchList';
import BranchDetails from '../features/branches/components/BranchDetails';
import AddBranchModal from '../features/branches/components/AddBranchModal';
import { useInAppMigration } from '../hooks/useInAppMigration';
import { ConfirmModal, CardInfo, SearchBar, Badge } from '../components/ui';

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

    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50);
        const t2 = setTimeout(syncHeight, 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [filteredBranches.length, selectedBranch, searchTerm]);

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
        setIsAddModalOpen(false);
    };

    const handleDeleteConfirm = async () => {
        if (!branchToDelete) return;
        setIsDeleting(true);
        const success = await deleteBranch(branchToDelete.id);
        setIsDeleting(false);
        if (success) {
            if (selectedBranch?.id === branchToDelete.id) {
                setSelectedBranch(null);
            }
            setBranchToDelete(null);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* Sidebar Column - 25% like Students/Activities */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <GitBranch className="text-primary" size={24} />
                            Branches
                        </h2>
                        <Badge variant="primary" size="xs">{filteredBranches.length} Total</Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher une branche..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                <BranchList
                    branches={filteredBranches}
                    loading={loading}
                    selectedBranch={selectedBranch}
                    onSelect={setSelectedBranch}
                    onOpenAdd={handleOpenCreate}
                    onEdit={handleEdit}
                    onDelete={setBranchToDelete}
                    onReorder={reorderBranches}
                />
            </div>

            {/* Detail Column */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <BranchDetails
                    selectedBranch={selectedBranch}
                    subBranches={subBranches}
                    onReorderSub={reorderSubBranches}
                    rightContentRef={rightContentRef}
                    headerHeight={headerHeight}
                />
            </div>

            {/* Modals & Confirmations */}
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
