import React from 'react';
import { Save } from 'lucide-react';
import clsx from 'clsx';

import SelectModuleModal from '../../../components/SelectModuleModal';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

// Hooks & Components
import { useActivityForm } from '../hooks/useActivityForm';
import ActivityMaterialSelector from './ActivityMaterialSelector';
import ActivityLevelExceptions from './ActivityLevelExceptions';

const AddActivityModal = (props) => {
    const { isOpen, onClose, activityToEdit } = props;

    // Utilisation du Custom Hook pour toute la logique (Respect des règles : séparation logique/vue)
    const {
        // State
        title, setTitle,
        moduleId, setModuleId,
        moduleName, setModuleName,
        nbExercises, setNbExercises,
        nbErrors, setNbErrors,
        requirementStatus, setRequirementStatus,
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        await submitForm();
    };

    // Wrapper pour handleAddLevel qui passe les valeurs courantes par défaut
    const onAddLevelException = (levelId) => {
        handleAddLevel(levelId, nbExercises, nbErrors, requirementStatus);
    };

    if (!isOpen) return null;

    return (
        <React.Fragment>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={activityToEdit ? 'Modifier l\'Activité' : 'Nouvelle Activité'}
                className="max-w-2xl"
                footer={
                    <>
                        <Button onClick={onClose} variant="secondary" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={loading}
                            className="flex-1"
                            icon={Save}
                        >
                            Enregistrer
                        </Button>
                    </>
                }
            >
                {/* Content Container - Scrollable */}
                <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <form id="activityForm" onSubmit={handleSubmit} className="space-y-10">
                        {error && (
                            <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm border border-danger/20">
                                {error}
                            </div>
                        )}

                        {/* SECTION 1: INFORMATIONS GÉNÉRALES */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="activity_title" className="text-sm font-medium text-gray-300">Nom de l'activité <span className="text-danger">*</span></label>
                                <input
                                    id="activity_title"
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="Ex: Exercices de calcul mental"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Module <span className="text-danger">*</span></label>
                                <button
                                    type="button"
                                    onClick={() => setShowSelectModule(true)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-left text-white focus:ring-1 focus:ring-primary focus:border-primary flex justify-between items-center transition-all hover:bg-black/30"
                                >
                                    <span className={clsx(!moduleId && "text-gray-500 italic")}>
                                        {moduleId ? moduleName : "Cliquez pour lier un module..."}
                                    </span>
                                </button>
                            </div>

                            {/* EXIGENCES DE BASE */}
                            <div className="bg-surface/10 p-4 rounded-xl border border-white/5 space-y-4">
                                <h5 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Exigences de base</h5>
                                <p className="text-xs text-gray-400 mb-2">Ces valeurs seront appliquées par défaut si aucune exigence spécifique n'est définie pour un niveau.</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="nb_exercises" className="text-xs font-medium text-gray-400">Nb Exercices</label>
                                        <input
                                            id="nb_exercises"
                                            type="number"
                                            value={nbExercises}
                                            onChange={e => setNbExercises(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-primary outline-none"
                                            placeholder="1"
                                            min="1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="nb_errors" className="text-xs font-medium text-gray-400">Nb Erreurs Max</label>
                                        <input
                                            id="nb_errors"
                                            type="number"
                                            value={nbErrors}
                                            onChange={e => setNbErrors(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-primary outline-none"
                                            placeholder="1"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">Statut</label>
                                    <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                                        {['obligatoire', 'facultatif'].map(status => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setRequirementStatus(status)}
                                                className={clsx(
                                                    "flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                                                    requirementStatus === status
                                                        ? (status === 'obligatoire' ? "bg-success text-text-dark shadow-sm" : "bg-danger text-white shadow-sm")
                                                        : "text-gray-400 hover:text-white"
                                                )}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: MATÉRIEL */}
                        <ActivityMaterialSelector
                            selectedMaterialIds={selectedMaterialTypes}
                            onToggle={toggleMaterialType}
                        />

                        {/* SECTION 3: EXCEPTIONS NIVEAUX */}
                        <ActivityLevelExceptions
                            activityLevels={activityLevels}
                            allLevels={levels}
                            onAdd={onAddLevelException}
                            onRemove={handleRemoveLevel}
                            onUpdate={updateActivityLevel}
                        />

                    </form>
                </div>
            </Modal>

            <SelectModuleModal
                isOpen={showSelectModule}
                onClose={() => setShowSelectModule(false)}
                onSelect={(module) => {
                    setModuleId(module.id);
                    setModuleName(module.nom);
                }}
            />
        </React.Fragment>
    );
};

export default AddActivityModal;
