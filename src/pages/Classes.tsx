import React from 'react';
import { useClasses } from '../features/classes/hooks/useClasses';

// Components
import ClassList from '../features/classes/components/ClassList';
import ClassDetails from '../features/classes/components/ClassDetails';

// Modals
import AddClassModal from '../features/classes/components/AddClassModal';
import StudentModal from '../features/students/components/StudentModal';
import AddStudentToClassModal from '../components/AddStudentToClassModal';
import { ConfirmModal } from '../components/ui';

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

    // Local state for student removal confirmation
    const [studentToRemove, setStudentToRemove] = React.useState<string | null>(null);

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">

            {/* Sidebar */}
            <ClassList
                classes={filteredClasses} // Changed from 'classes' to 'filteredClasses'
                // Wait, useClasses returns 'filteredClasses' not 'classes' as the list to display usually
                // Let's check the hook implementation.
                // It returns 'classes' (all) and 'filteredClasses' (filtered).
                // I should pass filteredClasses to ClassList to respect search.
                loading={loading}
                selectedClass={selectedClass}
                onSelect={(cls: any) => handleSelectClass(cls)}
                onEdit={(cls: any) => toggleModal('createEditClass', true, cls)}
                onDelete={(cls: any) => toggleModal('deleteConfirm', true, cls)}
                onSearch={setSearchQuery}
                searchQuery={searchQuery}
                onCreate={() => toggleModal('createEditClass', true, null)}
            />

            {/* Main Content */}
            <ClassDetails
                selectedClass={selectedClass}
                students={studentsInClass} // Sorted
                loadingStudents={loadingStudents}
                viewMode={viewMode}
                setViewMode={setViewMode}
                sortConfig={sortConfig as any}
                onSort={handleSort}
                onUpdateStudent={handleUpdateStudent}
                onEditStudent={(student: any) => toggleModal('studentDetails', true, student)}
                onRemoveStudent={(e: any, id: string) => {
                    e.stopPropagation();
                    setStudentToRemove(id);
                }}
                onAddStudent={() => toggleModal('addStudentToClass', true)}
            />

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
