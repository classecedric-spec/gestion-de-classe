import React, { useState } from 'react';
import { useLevels } from '../features/levels/hooks/useLevels';
import LevelList from '../features/levels/components/LevelList';
import LevelDetails from '../features/levels/components/LevelDetails';
import AddLevelModal from '../features/levels/components/AddLevelModal';
import { ConfirmModal } from '../components/ui';

const Niveaux: React.FC = () => {
    const {
        loading,
        loadingStudents,
        filteredLevels,
        searchTerm,
        setSearchTerm,
        selectedLevel,
        setSelectedLevel,
        students,
        createLevel,
        updateLevel,
        deleteLevel,
        reorderLevels
    } = useLevels();

    const [showModal, setShowModal] = useState(false);
    const [niveauToEdit, setNiveauToEdit] = useState<any>(null);
    const [niveauToDelete, setNiveauToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handlers
    const handleOpenAdd = () => {
        setNiveauToEdit(null);
        setShowModal(true);
    };

    const handleOpenEdit = (niveau: any) => {
        setNiveauToEdit(niveau);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setNiveauToEdit(null);
    };

    const handleLevelSubmit = async (levelData: any) => {
        let success = false;
        if (niveauToEdit) {
            success = await updateLevel(niveauToEdit.id, levelData);
        } else {
            success = await createLevel(levelData);
        }

        if (success) {
            handleModalClose();
        }
    };

    const handleDeleteConfirm = async () => {
        if (!niveauToDelete) return;
        setIsDeleting(true);
        const success = await deleteLevel(niveauToDelete.id);
        setIsDeleting(false);
        if (success) {
            setNiveauToDelete(null);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            <LevelList
                levels={filteredLevels}
                loading={loading}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedLevel={selectedLevel}
                onSelect={setSelectedLevel}
                onOpenAdd={handleOpenAdd}
                onEdit={handleOpenEdit}
                onDelete={setNiveauToDelete}
                onReorder={reorderLevels}
            />

            <LevelDetails
                selectedLevel={selectedLevel}
                students={students}
                loadingStudents={loadingStudents}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!niveauToDelete}
                onClose={() => setNiveauToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le niveau ?"
                message={`Êtes-vous sûr de vouloir supprimer le niveau "${niveauToDelete?.nom}" ? Cette action est irréversible et retirera le niveau des élèves associés.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

            <AddLevelModal
                isOpen={showModal}
                onClose={handleModalClose}
                onSubmit={handleLevelSubmit}
                levelToEdit={niveauToEdit}
            />
        </div>
    );
};

export default Niveaux;
