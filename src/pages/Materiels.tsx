import React, { useState, useRef, useLayoutEffect } from 'react';
import { Package } from 'lucide-react';
import { useMaterials } from '../features/materials/hooks/useMaterials';
import MaterialList from '../features/materials/components/MaterialList';
import MaterialDetails from '../features/materials/components/MaterialDetails';
import AddMaterialModal from '../features/materials/components/AddMaterialModal';
import { TypeMateriel } from '../features/materials/services/materialService';
import { ConfirmModal, CardInfo, Badge, SearchBar } from '../components/ui';

const Materiels: React.FC = () => {
    const {
        filteredMateriels,
        loading,
        searchTerm,
        setSearchTerm,
        selectedMateriel,
        setSelectedMateriel,
        linkedActivities,
        loadingActivities,
        createMateriel,
        updateMateriel,
        deleteMateriel,
    } = useMaterials();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [materielToEdit, setMaterielToEdit] = useState<TypeMateriel | null>(null);
    const [materielToDelete, setMaterielToDelete] = useState<TypeMateriel | null>(null);
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
    }, [filteredMateriels.length, selectedMateriel, searchTerm]);

    // Handlers
    const handleOpenCreate = () => {
        setMaterielToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (materiel: TypeMateriel) => {
        setMaterielToEdit(materiel);
        setIsAddModalOpen(true);
    };

    const handleModalSubmit = async (materialData: { nom: string; acronyme: string | null }) => {
        let success = false;
        if (materielToEdit) {
            success = await updateMateriel(materielToEdit.id, materialData);
        } else {
            success = await createMateriel(materialData);
        }

        if (success) {
            setIsAddModalOpen(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!materielToDelete) return;
        setIsDeleting(true);
        const success = await deleteMateriel(materielToDelete.id);
        setIsDeleting(false);
        if (success) {
            if (selectedMateriel?.id === materielToDelete.id) {
                setSelectedMateriel(null);
            }
            setMaterielToDelete(null);
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
                            <Package className="text-primary" size={24} />
                            Matériel
                        </h2>
                        <Badge variant="primary" size="xs">{filteredMateriels.length} Total</Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher un matériel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                <MaterialList
                    materiels={filteredMateriels}
                    loading={loading}
                    selectedMateriel={selectedMateriel}
                    onSelect={setSelectedMateriel}
                    onOpenAdd={handleOpenCreate}
                    onOpenEdit={handleOpenEdit}
                    onDelete={setMaterielToDelete}
                />
            </div>

            {/* Detail Column */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <MaterialDetails
                    selectedMateriel={selectedMateriel}
                    linkedActivities={linkedActivities}
                    loadingActivities={loadingActivities}
                    rightContentRef={rightContentRef}
                    headerHeight={headerHeight}
                />
            </div>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!materielToDelete}
                onClose={() => setMaterielToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le matériel ?"
                message={`Êtes-vous sûr de vouloir supprimer "${materielToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

            <AddMaterialModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                materielToEdit={materielToEdit}
            />
        </div>
    );
};

export default Materiels;
