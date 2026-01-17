import React, { useState } from 'react';
import { useMaterials } from '../features/materials/hooks/useMaterials';
import MaterialList from '../features/materials/components/MaterialList';
import MaterialDetails from '../features/materials/components/MaterialDetails';
import AddMaterialModal from '../features/materials/components/AddMaterialModal';
import { Trash2, Loader2 } from 'lucide-react';

const Materiels = () => {
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
        materiels,
    } = useMaterials();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [materielToEdit, setMaterielToEdit] = useState(null);
    const [materielToDelete, setMaterielToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handlers
    const handleOpenCreate = () => {
        setMaterielToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (materiel) => {
        setMaterielToEdit(materiel);
        setIsAddModalOpen(true);
    };

    const handleModalSubmit = async (materialData) => {
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
