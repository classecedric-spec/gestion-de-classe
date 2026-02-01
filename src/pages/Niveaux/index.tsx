import React, { useState, useRef, useLayoutEffect } from 'react';
import { useLevels } from '../../features/levels/hooks/useLevels';
import AddLevelModal from '../../features/levels/components/AddLevelModal';
import { ConfirmModal } from '../../core';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

// Components
import { LevelListPanel } from './components/LevelListPanel';
import { LevelDetailPanel } from './components/LevelDetailPanel';

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

    const [activeTab, setActiveTab] = useState<'students' | 'details'>('students');
    const [showModal, setShowModal] = useState(false);
    const [niveauToEdit, setNiveauToEdit] = useState<any>(null);
    const [niveauToDelete, setNiveauToDelete] = useState<any>(null);
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
        return () => clearTimeout(t);
    }, [filteredLevels.length, selectedLevel, searchTerm]);

    // Handlers
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = filteredLevels.findIndex((item) => item.id === active.id);
            const newIndex = filteredLevels.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(filteredLevels, oldIndex, newIndex);
            reorderLevels(newItems);
        }
    };

    const handleOpenAdd = () => {
        setNiveauToEdit(null);
        setShowModal(true);
    };

    const handleOpenEdit = (e: React.MouseEvent, niveau: any) => {
        e.stopPropagation();
        setNiveauToEdit(niveau);
        setShowModal(true);
    };

    const handleLevelSubmit = async (levelData: any) => {
        let success = false;
        if (niveauToEdit) {
            success = await updateLevel(niveauToEdit.id, levelData);
        } else {
            success = await createLevel(levelData);
        }
        if (success) {
            setShowModal(false);
            setNiveauToEdit(null);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, niveau: any) => {
        e.stopPropagation();
        setNiveauToDelete(niveau);
    };

    const handleDeleteConfirm = async () => {
        if (!niveauToDelete) return;
        setIsDeleting(true);
        const success = await deleteLevel(niveauToDelete.id);
        setIsDeleting(false);
        if (success) setNiveauToDelete(null);
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">

            <LevelListPanel
                loading={loading}
                filteredLevels={filteredLevels}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                onAddClick={handleOpenAdd}
                onEditClick={handleOpenEdit}
                onDeleteClick={handleDeleteClick}
                onDragEnd={handleDragEnd}
                contentRef={leftContentRef}
                headerHeight={headerHeight}
            />

            <LevelDetailPanel
                selectedLevel={selectedLevel}
                students={students}
                loadingStudents={loadingStudents}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                contentRef={rightContentRef}
                headerHeight={headerHeight}
            />

            {/* Modals */}
            <ConfirmModal
                isOpen={!!niveauToDelete}
                onClose={() => setNiveauToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le niveau ?"
                message={`Êtes-vous sûr de vouloir supprimer le niveau "${niveauToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

            <AddLevelModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleLevelSubmit}
                levelToEdit={niveauToEdit}
            />
        </div>
    );
};

export default Niveaux;
