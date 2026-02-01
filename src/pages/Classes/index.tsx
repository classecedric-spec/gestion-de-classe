import React, { useState, useLayoutEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { EmptyState, ConfirmModal } from '../../core';

// Feature Hooks & Services
import { useClasses } from '../../features/classes/hooks/useClasses';

// Modals
import AddClassModal from '../../features/classes/components/AddClassModal';
import StudentModal from '../../features/students/components/StudentModal';
import { AddStudentToClassModal } from '../../features/classes/components/AddStudentToClassModal';

// Components
import { ClassListSidebar } from './components/ClassListSidebar';
import { ClassDetailView } from './components/ClassDetailView';

const Classes: React.FC = () => {
    const {
        // Data
        filteredClasses,
        loading,
        loadingStudents,
        selectedClass,
        studentsInClass,
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        sortConfig,

        // Actions
        handleSelectClass,
        handleSort,
        handleAddClass,
        handleUpdateClass,
        handleDeleteClass,
        handleAddStudent,
        handleRemoveStudent,
        handleUpdateStudent,
        refreshStudents,

        // Modal State
        modals,
        activeItem,
        toggleModal
    } = useClasses();

    const [activeDetailTab, setActiveDetailTab] = useState('students');

    // --- Height Synchronization ---
    const leftHeaderRef = useRef<HTMLDivElement>(null);
    const rightHeaderRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    // Local state for student removal confirmation
    const [studentToRemove, setStudentToRemove] = useState<string | null>(null);

    // --- Height Measure Effect ---
    useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftHeaderRef.current;
            const rightEl = rightHeaderRef.current;

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
    }, [filteredClasses.length, selectedClass, searchQuery]);

    const handleCreateClass = () => toggleModal('createEditClass', true, null);

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* Sidebar Column */}
            <ClassListSidebar
                filteredClasses={filteredClasses}
                selectedClass={selectedClass}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                loading={loading}
                headerHeight={headerHeight}
                headerRef={leftHeaderRef}
                onSelectClass={handleSelectClass}
                onCreateClass={handleCreateClass}
                onEditClass={(c) => toggleModal('createEditClass', true, c)}
                onDeleteClass={(c) => toggleModal('deleteConfirm', true, c)}
            />

            {/* Main Content Column */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                {!selectedClass ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={BookOpen}
                            title="Sélectionnez une classe"
                            description="Choisissez une classe dans la liste pour voir les élèves et les détails."
                            size="lg"
                        />
                    </div>
                ) : (
                    <ClassDetailView
                        selectedClass={selectedClass}
                        studentsInClass={studentsInClass}
                        loadingStudents={loadingStudents}
                        headerHeight={headerHeight}
                        headerRef={rightHeaderRef}
                        activeDetailTab={activeDetailTab}
                        setActiveDetailTab={setActiveDetailTab}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        sortConfig={sortConfig as any}
                        onSort={handleSort}
                        onAddStudent={() => toggleModal('addStudentToClass', true)}
                        onUpdateStudent={handleUpdateStudent}
                        onEditStudent={(student) => toggleModal('studentDetails', true, student)}
                        onRemoveStudent={(id) => setStudentToRemove(id)}
                    />
                )}
            </div>

            {/* --- Modals --- */}

            {/* Create/Edit Class */}
            <AddClassModal
                isOpen={modals.createEditClass}
                onClose={() => toggleModal('createEditClass', false)}
                onAdded={(c) => {
                    if (activeItem.classToEdit && c) {
                        handleUpdateClass(c as any);
                    } else if (c) {
                        handleAddClass(c as any);
                    }
                }}
                classToEdit={activeItem.classToEdit}
            />

            {/* Student Details (Global Student Modal) */}
            <StudentModal
                showModal={modals.studentDetails}
                onClose={() => toggleModal('studentDetails', false)}
                isEditing={!!activeItem.studentToEditId}
                editId={activeItem.studentToEditId}
                onSaved={(student) => {
                    if (activeItem.studentToEditId) {
                        refreshStudents();
                    } else if (student) {
                        handleAddStudent(student);
                    }
                }}
            />

            {/* Add Student To Class (Existing Student) */}
            <AddStudentToClassModal
                showModal={modals.addStudentToClass}
                handleCloseModal={() => toggleModal('addStudentToClass', false)}
                classId={selectedClass?.id || ''}
                className={selectedClass?.nom || ''}
                onAdded={() => refreshStudents()}
            />

            {/* Delete Class Confirmation */}
            <ConfirmModal
                isOpen={modals.deleteConfirm && !!activeItem.classToDelete}
                onClose={() => toggleModal('deleteConfirm', false)}
                onConfirm={handleDeleteClass}
                title="Supprimer la classe ?"
                message={`Êtes-vous sûr de vouloir supprimer "${activeItem.classToDelete?.nom || 'cette classe'}" ? Les élèves ne seront pas supprimés.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />

            {/* Remove Student Confirmation */}
            <ConfirmModal
                isOpen={!!studentToRemove}
                onClose={() => setStudentToRemove(null)}
                onConfirm={() => {
                    if (studentToRemove) handleRemoveStudent(studentToRemove);
                    setStudentToRemove(null);
                }}
                title="Retirer l'élève ?"
                message="Voulez-vous retirer cet élève de la classe ?"
                confirmText="Retirer"
                cancelText="Annuler"
                variant="warning"
            />
        </div>
    );
};

export default Classes;
