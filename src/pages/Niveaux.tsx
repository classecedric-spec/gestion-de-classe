import React, { useState } from 'react';
import { useLevels } from '../features/levels/hooks/useLevels';
import LevelList from '../features/levels/components/LevelList';
import LevelDetails from '../features/levels/components/LevelDetails';
import AddLevelModal from '../features/levels/components/AddLevelModal';
import { Trash2, Loader2 } from 'lucide-react';

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

            {/* Delete Confirmation Modal */}
            {niveauToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le niveau ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer le niveau <span className="text-white font-bold">"{niveauToDelete.nom}"</span> ?
                            <br />Cette action est irréversible et retirera le niveau des élèves associés.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setNiveauToDelete(null)}
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
