import React from 'react';
import { Save } from 'lucide-react';
import clsx from 'clsx';

import SelectModuleModal from '../../../components/SelectModuleModal';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

// Hooks & Components
import { useActivityForm } from '../hooks/useActivityForm';
import { ActivityWithRelations } from '../services/activityService';
import ActivityMaterialSelector from './ActivityMaterialSelector';
import ActivityLevelExceptions from './ActivityLevelExceptions';

interface AddActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    activityToEdit?: ActivityWithRelations | null;
    defaultModuleId?: string | null;
    defaultModuleName?: string | null;
    nextOrder?: number;
    onAdded: (activity?: any) => void;
}

const ActivityLevelExceptionsAny = ActivityLevelExceptions as any;
const SelectModuleModalAny = SelectModuleModal as any;
const ModalAny = Modal as any;
const ButtonAny = Button as any;

const AddActivityModal: React.FC<AddActivityModalProps> = (props) => {
    const { isOpen, onClose, activityToEdit } = props;

    // Utilisation du Custom Hook pour toute la logique
    const {
        // State
        title, setTitle,
        moduleId, setModuleId,
        moduleName, setModuleName,
        nbExercises,
        nbErrors,
        requirementStatus,
        selectedMaterialTypes,
        activityLevels,
        levels,
        loading,
        error,

        // Actions
        handleAddLevel,
        handleRemoveLevel,
        updateActivityLevel,
        toggleMaterialType,
        submitForm
    } = useActivityForm(props);

    const [showSelectModule, setShowSelectModule] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitForm();
    };

    // Wrapper pour handleAddLevel qui passe les valeurs courantes par défaut
    const onAddLevelException = (levelId: string) => {
        handleAddLevel(levelId, nbExercises, nbErrors, requirementStatus);
    };

    if (!isOpen) return null;

    return (
        <React.Fragment>
            <ModalAny
                isOpen={isOpen}
                onClose={onClose}
                title={activityToEdit ? 'Modifier l\'Activité' : 'Nouvelle Activité'}
                className="max-w-4xl"
                footer={
                    <>
                        <ButtonAny onClick={onClose} variant="secondary" className="flex-1">
                            Annuler
                        </ButtonAny>
                        <ButtonAny
                            onClick={handleSubmit}
                            loading={loading}
                            className="flex-1"
                            icon={Save}
                        >
                            Enregistrer
                        </ButtonAny>
                    </>
                }
            >
                <div>
                    <form id="activityForm" onSubmit={handleSubmit} className="flex overflow-hidden h-[65vh]">
                        {/* Sidebar: Identity & Materials */}
                        <div className="w-1/2 border-r border-white/5 pr-5 space-y-8 overflow-y-auto custom-scrollbar">
                            <div className="border-b border-white/10 pb-2 mb-6">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Détails de l'activité</h4>
                            </div>

                            {error && (
                                <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm border border-danger/20 mb-4">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="activity_title" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nom de l'activité <span className="text-danger">*</span></label>
                                    <input
                                        id="activity_title"
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                        placeholder="Ex: Exercices de calcul mental"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Module <span className="text-danger">*</span></label>
                                    <button
                                        type="button"
                                        onClick={() => setShowSelectModule(true)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-left text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary flex justify-between items-center transition-all hover:bg-black/30"
                                    >
                                        <span className={clsx(!moduleId && "text-gray-500 italic")}>
                                            {moduleId ? moduleName : "Lier un module..."}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <ActivityMaterialSelector
                                selectedMaterialIds={selectedMaterialTypes}
                                onToggle={toggleMaterialType}
                            />
                        </div>

                        {/* Main: Objectives per Level */}
                        <div className="w-1/2 overflow-y-auto pl-5 pr-2 custom-scrollbar">
                            <ActivityLevelExceptionsAny
                                activityLevels={activityLevels}
                                allLevels={levels}
                                onAdd={onAddLevelException}
                                onRemove={handleRemoveLevel}
                                onUpdate={updateActivityLevel}
                            />
                        </div>
                    </form>
                </div>
            </ModalAny>

            <SelectModuleModalAny
                isOpen={showSelectModule}
                onClose={() => setShowSelectModule(false)}
                onSelect={(module: any) => {
                    setModuleId(module.id);
                    setModuleName(module.nom || module.titre);
                }}
            />
        </React.Fragment>
    );
};

export default AddActivityModal;
