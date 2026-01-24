import React, { useState } from 'react';
import { useMaterials } from '../features/materials/hooks/useMaterials';
import MaterialList from '../features/materials/components/MaterialList';
import MaterialDetails from '../features/materials/components/MaterialDetails';
import AddMaterialModal from '../features/materials/components/AddMaterialModal';
import { TypeMateriel } from '../features/materials/services/materialService';
import { ConfirmModal } from '../components/ui';

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
            setMaterielToDelete(null);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            <MaterialList
                materiels={filteredMateriels}
                loading={loading}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedMateriel={selectedMateriel}
                onSelect={setSelectedMateriel}
                onOpenAdd={handleOpenCreate}
                onOpenEdit={handleOpenEdit}
                onDelete={setMaterielToDelete}
            />

            <MaterialDetails
                selectedMateriel={selectedMateriel}
                linkedActivities={linkedActivities}
                loadingActivities={loadingActivities}
            />

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
