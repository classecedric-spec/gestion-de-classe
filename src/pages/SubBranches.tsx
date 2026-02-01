import React, { useState, useRef, useLayoutEffect } from 'react';
import { Layers } from 'lucide-react';
import { useSubBranches } from '../features/sub-branches/hooks/useSubBranches';
import { useBranches } from '../features/branches/hooks/useBranches';
import SubBranchList from '../features/sub-branches/components/SubBranchList';
import SubBranchDetails from '../features/sub-branches/components/SubBranchDetails';
import AddSubBranchModal from '../features/branches/components/AddSubBranchModal';
import { useInAppMigration } from '../hooks/useInAppMigration';
import { ConfirmModal, CardInfo, Badge, SearchBar } from '../core';

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
    } = useSubBranches();

    // Fetch branches for the modal dropdown
    const { branches: availableBranches } = useBranches();

    // In-app migration
    useInAppMigration(filteredSubBranches, 'SousBranche', 'sousbranche');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [subBranchToEdit, setSubBranchToEdit] = useState<any>(null);
    const [subBranchToDelete, setSubBranchToDelete] = useState<any>(null);
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
    }, [filteredSubBranches.length, selectedSubBranch, searchTerm]);

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
            if (selectedSubBranch?.id === subBranchToDelete.id) {
                setSelectedSubBranch(null);
            }
            setSubBranchToDelete(null);
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
                            <Layers className="text-primary" size={24} />
                            Sous-branches
                        </h2>
                        <Badge variant="primary" size="xs">{filteredSubBranches.length} Total</Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher une sous-branche..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                <SubBranchList
                    subBranches={filteredSubBranches}
                    loading={loading}
                    selectedSubBranch={selectedSubBranch}
                    onSelect={setSelectedSubBranch}
                    onOpenAdd={handleOpenCreate}
                    onEdit={handleEdit}
                    onDelete={setSubBranchToDelete}
                />
            </div>

            {/* Detail Column */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <SubBranchDetails
                    selectedSubBranch={selectedSubBranch}
                    rightContentRef={rightContentRef}
                    headerHeight={headerHeight}
                />
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!subBranchToDelete}
                onClose={() => setSubBranchToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer la sous-branche ?"
                message={`Êtes-vous sûr de vouloir supprimer la sous-branche "${subBranchToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

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
