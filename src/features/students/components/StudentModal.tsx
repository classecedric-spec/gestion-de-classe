import React, { Fragment } from 'react';
import { Plus, User as UserIcon, Check } from 'lucide-react';
import clsx from 'clsx';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { TablesInsert } from '../../../types/supabase';

import AddClassModal from '../../classes/components/AddClassModal';
import AddGroupModal from '../../../components/AddGroupModal';
import AddLevelModal from '../../levels/components/AddLevelModal';

// Feature Components & Hooks
import { useStudentForm, UseStudentFormProps } from '../hooks/useStudentForm';
import StudentGeneralInfo from './StudentGeneralInfo';
import StudentParentsInfo from './StudentParentsInfo';

export interface StudentModalProps extends UseStudentFormProps {
    showModal: boolean;
}

const StudentModal: React.FC<StudentModalProps> = (props) => {
    const { showModal, onClose, isEditing } = props;

    // Custom Hook Usage
    const {
        // State
        student,
        loading,
        activeTab, setActiveTab,

        // Lists
        classesList,
        groupsList,
        niveauxList,

        // Modals Controls
        showAddClassModal, setShowAddClassModal,
        showAddGroupModal, setShowAddGroupModal,
        showAddNiveauModal, setShowAddNiveauModal,

        // Input Handlers
        handleInputChange,
        updateField,
        handleClassChange,
        handleNiveauChange,
        handleToggleGroup,

        // Callbacks
        handleClassAdded,
        handleGroupAdded,
        handleLevelSubmit,

        // Submit
        submitForm
    } = useStudentForm(props);

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();

        // Basic HTML5 validation trigger
        const form = document.getElementById('student-form') as HTMLFormElement | null;
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }

        await submitForm();
    };

    if (!showModal) return null;

    return (
        <Fragment>
            <Modal
                isOpen={showModal}
                onClose={onClose}
                title={isEditing ? "Modifier l'élève" : "Ajouter un élève"}
                icon={isEditing ? <UserIcon size={24} /> : <Plus size={24} />}
                className="max-w-2xl"
                noPadding
                footer={
                    <>
                        <Button onClick={onClose} variant="secondary" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={loading}
                            className="flex-1"
                            icon={Check}
                        >
                            {isEditing ? "Enregistrer" : "Créer l'élève"}
                        </Button>
                    </>
                }
            >
                {/* Tabs Header */}
                <div className="flex px-6 border-b border-border/5 bg-surface sticky top-0 z-10">
                    <button
                        onClick={() => setActiveTab('enfant')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'enfant' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Enfant
                    </button>
                    <button
                        onClick={() => setActiveTab('parent1')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'parent1' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Parent 1
                    </button>
                    <button
                        onClick={() => setActiveTab('parent2')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'parent2' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Parent 2
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6">
                    <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
                        {activeTab === 'enfant' && (
                            <StudentGeneralInfo
                                student={student}
                                handleInputChange={handleInputChange}
                                updateField={updateField}
                                handleClassChange={handleClassChange}
                                handleNiveauChange={handleNiveauChange}
                                handleToggleGroup={handleToggleGroup}
                                classesList={classesList}
                                niveauxList={niveauxList}
                                groupsList={groupsList}
                                setShowAddGroupModal={setShowAddGroupModal}
                            />
                        )}

                        {(activeTab === 'parent1' || activeTab === 'parent2') && (
                            <StudentParentsInfo
                                student={student}
                                handleInputChange={handleInputChange}
                                activeTab={activeTab}
                            />
                        )}
                    </form>
                </div>
            </Modal>

            {/* Sub Modals */}
            <AddClassModal
                isOpen={showAddClassModal}
                onClose={() => setShowAddClassModal(false)}
                onAdded={(c) => c && handleClassAdded(c)}
                classToEdit={null}
            />

            <AddGroupModal
                isOpen={showAddGroupModal}
                onClose={() => setShowAddGroupModal(false)}
                onAdded={handleGroupAdded}
            />

            <AddLevelModal
                isOpen={showAddNiveauModal}
                onClose={() => setShowAddNiveauModal(false)}
                onSubmit={async (levelData: TablesInsert<'Niveau'>) => {
                    const result = await handleLevelSubmit(levelData);
                    return result;
                }}
                levelToEdit={null}
            />
        </Fragment>
    );
};

export default StudentModal;
