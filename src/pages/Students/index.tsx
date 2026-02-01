import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { Badge, ConfirmModal } from '../../core';

// Components
import StudentModal from '../../features/students/components/StudentModal';
import StudentQRModal from '../../features/students/components/StudentQRModal';
import { StudentListColumn } from '../../features/students/components/StudentListColumn';
import { StudentDetailsColumn } from '../../features/students/components/StudentDetailsColumn';

// Hooks
import { useStudentsData } from '../../features/students/hooks/useStudentsData';
import { useStudentPhoto } from '../../features/students/hooks/useStudentPhoto';

const Students: React.FC = () => {
    const location = useLocation();
    const initialStudentId = location.state?.selectedStudentId;

    // UI State
    const [showFilters, setShowFilters] = React.useState(false);
    const [showQRModal, setShowQRModal] = React.useState(false);

    // Data Hooks
    const {
        students, setStudents, selectedStudent, setSelectedStudent, loading,
        searchQuery, setSearchQuery, filterClass, setFilterClass, filterGroup, setFilterGroup,
        showModal, isEditing, editId, studentToDelete, setStudentToDelete,
        filteredStudents, fetchStudents, handleStudentSaved, handleUpdateImportance,
        handleEdit, handleOpenCreate, handleCloseModal, handleDelete
    } = useStudentsData(initialStudentId);

    const {
        isDraggingPhoto, draggingPhotoId, updatingPhotoId, setDraggingPhotoId,
        processAndSavePhoto, handlePhotoDrop, handlePhotoDragOver, handlePhotoDragLeave
    } = useStudentPhoto(setSelectedStudent, setStudents);

    // Initial Load
    useEffect(() => {
        fetchStudents();
    }, []);

    const rightContent = (
        <Badge variant="primary" size="sm" className="font-bold">
            {students.length} Élèves au total
        </Badge>
    );

    return (
        <PageLayout
            title="Élèves"
            subtitle="Gérez vos élèves et leur progression"
            rightContent={rightContent}
            containerClassName="p-6"
        >
            <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
                {/* 1. List Column */}
                <StudentListColumn
                    students={students}
                    filteredStudents={filteredStudents}
                    loading={loading}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    filterGroup={filterGroup}
                    setFilterGroup={setFilterGroup}
                    filterClass={filterClass}
                    setFilterClass={setFilterClass}
                    selectedStudent={selectedStudent}
                    setSelectedStudent={setSelectedStudent}
                    handleOpenCreate={handleOpenCreate}
                    handleEdit={handleEdit}
                    setStudentToDelete={setStudentToDelete}
                    // Photo Logic
                    updatingPhotoId={updatingPhotoId}
                    draggingPhotoId={draggingPhotoId}
                    setDraggingPhotoId={setDraggingPhotoId}
                    processAndSavePhoto={processAndSavePhoto}
                />

                {/* 2. Detail Column */}
                <StudentDetailsColumn
                    selectedStudent={selectedStudent}
                    students={students}
                    isDraggingPhoto={isDraggingPhoto}
                    updatingPhotoId={updatingPhotoId}
                    handlePhotoDragOver={handlePhotoDragOver}
                    handlePhotoDragLeave={handlePhotoDragLeave}
                    handlePhotoDrop={handlePhotoDrop}
                    processAndSavePhoto={processAndSavePhoto}
                    setShowQRModal={setShowQRModal}
                    handleUpdateImportance={handleUpdateImportance}
                />

                {/* Modals */}
                <ConfirmModal
                    isOpen={!!studentToDelete}
                    onClose={() => setStudentToDelete(null)}
                    onConfirm={handleDelete}
                    title="Supprimer l'élève ?"
                    message={`Êtes-vous sûr de vouloir supprimer "${studentToDelete?.prenom} ${studentToDelete?.nom}" ? Cette action est irréversible.`}
                    confirmText="Supprimer"
                    cancelText="Annuler"
                    variant="danger"
                    isLoading={loading}
                />

                <StudentModal
                    showModal={showModal}
                    onClose={handleCloseModal}
                    isEditing={isEditing}
                    editId={editId}
                    onSaved={handleStudentSaved}
                />

                <StudentQRModal
                    isOpen={showQRModal}
                    onClose={() => setShowQRModal(false)}
                    student={selectedStudent}
                />
            </div >
        </PageLayout>
    );
};

export default Students;
