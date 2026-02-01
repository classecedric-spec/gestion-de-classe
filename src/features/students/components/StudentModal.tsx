import React, { Fragment } from 'react';
import { Plus, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import { FormModal } from '../../../core';
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
        student,
        loading,
        activeTab, setActiveTab,
        classesList,
        groupsList,
        niveauxList,
        showAddClassModal, setShowAddClassModal,
        showAddGroupModal, setShowAddGroupModal,
        showAddNiveauModal, setShowAddNiveauModal,
        handleInputChange,
        updateField,
        handleClassChange,
        handleNiveauChange,
        handleToggleGroup,
        handleClassAdded,
        handleGroupAdded,
        handleLevelSubmit,
        submitForm
    } = useStudentForm(props);

    const handleSubmit = async () => {
        await submitForm();
    };

    return (
        <Fragment>
            <FormModal
                isOpen={showModal}
                onClose={onClose}
                onSubmit={handleSubmit}
                title={isEditing ? "Modifier l'élève" : "Ajouter un élève"}
                icon={isEditing ? UserIcon : Plus}
                loading={loading}
                confirmText={isEditing ? "Enregistrer" : "Créer l'élève"}
                size="md"
                noPadding
            >
                {/* Tabs Header */}
                <div className="flex px-6 border-b border-border/5 bg-surface sticky top-0 z-10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('enfant')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'enfant' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Enfant
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('parents')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'parents' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Parents
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-6">
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

                        {activeTab === 'parents' && (
                            <StudentParentsInfo
                                student={student}
                                handleInputChange={handleInputChange}
                            />
                        )}
                    </div>
                </div>
            </FormModal>

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
