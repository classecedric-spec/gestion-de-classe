import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useClasses } from '../features/classes/hooks/useClasses';

// Components
import ClassList from '../features/classes/components/ClassList';
import ClassDetails from '../features/classes/components/ClassDetails';

// Modals (Legacy or soon to be refactored)
import AddClassModal from '../features/classes/components/AddClassModal';
import StudentModal from '../features/students/components/StudentModal';
import AddStudentToClassModal from '../components/AddStudentToClassModal';

const Classes: React.FC = () => {
    const {
        // Data
        classes,
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
        handleDeleteClass,
        handleRemoveStudent,
        handleUpdateStudent,
        refreshClasses,
        refreshStudents,

        // Modal State
        modals,
        activeItem,
        toggleModal
    } = useClasses();

    return (
        <div className="h-full flex gap-8 animate-in fade-in duration-500 relative">

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
                sortConfig={sortConfig}
                onSort={handleSort}
                onUpdateStudent={handleUpdateStudent}
                onEditStudent={(student: any) => toggleModal('studentDetails', true, student)}
                onRemoveStudent={(e: any, id: string) => {
                    e.stopPropagation();
                    if (confirm("Voulez-vous retirer cet élève de la classe ?")) {
                        handleRemoveStudent(id);
                    }
                }}
                onAddStudent={() => toggleModal('addStudentToClass', true)}
            />

            {/* --- Modals --- */}

            {/* Create/Edit Class */}
            <AddClassModal
                isOpen={modals.createEditClass}
                onClose={() => toggleModal('createEditClass', false)}
                onAdded={() => refreshClasses(true)} // true = keep selection
                classToEdit={activeItem.classToEdit}
            />

            {/* Student Details (Global Student Modal) */}
            <StudentModal
                showModal={modals.studentDetails}
                onClose={() => toggleModal('studentDetails', false)}
                isEditing={!!activeItem.studentToEditId}
                editId={activeItem.studentToEditId}
                onSaved={() => refreshStudents()}
            />

            {/* Add Student To Class (Existing Student) */}
            <AddStudentToClassModal
                showModal={modals.addStudentToClass}
                handleCloseModal={() => toggleModal('addStudentToClass', false)}
                classId={selectedClass?.id}
                className={selectedClass?.nom}
                onAdded={() => refreshStudents()}
            />

            {/* Delete Confirmation Overlay */}
            {modals.deleteConfirm && activeItem.classToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer la classe ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer <span className="text-text-main font-bold">"{activeItem.classToDelete.nom}"</span> ?
                            <br />Les élèves ne seront pas supprimés.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => toggleModal('deleteConfirm', false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteClass}
                                disabled={loading}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;
