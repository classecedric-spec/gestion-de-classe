/**
 * Nom du module/fichier : AddActivityModal.tsx
 * 
 * Données en entrée : 
 *   - isOpen : Indique si la fenêtre modale doit être affichée à l'écran.
 *   - activityToEdit : L'activité à modifier (si cet objet est vide, le système comprend que c'est une nouvelle création).
 *   - onAdded : Fonction de rappel appelée après une sauvegarde réussie pour rafraîchir l'affichage principal.
 *   - onClose : Fonction pour fermer la fenêtre (annulation).
 * 
 * Données en sortie : Une interface visuelle de type "fenêtre modale" (pop-up).
 * 
 * Objectif principal : Fournir l'interface utilisateur complète pour créer ou modifier un atelier (activité). Elle rassemble dans un seul écran ergonomique les informations d'identité (nom, module), le matériel requis et les réglages de différenciation pédagogique (objectifs par niveau).
 * 
 * Ce que ça affiche : Une fenêtre divisée en deux colonnes :
 *    - À GAUCHE : Détails de base (nom de l'activité, choix du module dossier) et sélection du matériel.
 *    - À DROITE : Gestion des objectifs personnalisés pour chaque niveau scolaire (ex: PS, MS, GS).
 */

import React from 'react';
import { Save } from 'lucide-react';
import clsx from 'clsx';

import SelectModuleModal from '../../../components/SelectModuleModal';
import { FormModal } from '../../../core';

// Hooks & Sous-composants spécialisés
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

/**
 * Composant principal de l'interface de création/édition d'activité.
 */
const AddActivityModal: React.FC<AddActivityModalProps> = (props) => {
    const { isOpen, onClose, activityToEdit } = props;

    // On délègue TOUTE la logique complexe (saisie, validation, envoi) au Hook personnalisé
    // pour garder ce fichier focalisé sur la mise en page visuelle.
    const {
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
        handleAddLevel,
        handleRemoveLevel,
        updateActivityLevel,
        toggleMaterialType,
        submitForm
    } = useActivityForm(props);

    // État interne pour gérer l'ouverture de la sous-fenêtre de sélection de module
    const [showSelectModule, setShowSelectModule] = React.useState(false);

    /**
     * Déclenche la procédure de sauvegarde finale définie dans le Hook.
     */
    const handleSubmit = async () => {
        await submitForm();
    };

    /**
     * Fonction relais pour ajouter un niveau scolaire avec les critères de l'activité de base.
     */
    const onAddLevelException = (levelId: string) => {
        handleAddLevel(levelId, nbExercises, nbErrors, requirementStatus);
    };

    return (
        <React.Fragment>
            {/* Fenêtre principale (Modal) */}
            <FormModal
                isOpen={isOpen}
                onClose={onClose}
                onSubmit={handleSubmit}
                title={activityToEdit ? 'Modifier l\'Activité' : 'Nouvelle Activité'}
                icon={Save}
                loading={loading}
                size="lg"
            >
                {/* Structure en deux colonnes pour une meilleure ergonomie sur ordinateur */}
                <div className="flex overflow-hidden h-[65vh]">
                    
                    {/* COLONNE GAUCHE : Identité de l'activité & Matériel */}
                    <div className="w-1/2 border-r border-white/5 pr-5 space-y-8 overflow-y-auto custom-scrollbar">
                        <div className="border-b border-white/10 pb-2 mb-6">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Détails de l'activité</h4>
                        </div>

                        {/* Affichage d'un message d'erreur si la validation ou l'envoi échoue */}
                        {error && (
                            <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm border border-danger/20 mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Champ de saisie du nom de l'atelier */}
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

                            {/* Choix du dossier (Module) dans lequel ranger l'activité */}
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

                        {/* Intégration du sélecteur de matériel requis */}
                        <ActivityMaterialSelector
                            selectedMaterialIds={selectedMaterialTypes}
                            onToggle={toggleMaterialType}
                        />
                    </div>

                    {/* COLONNE DROITE : Paramétrage des objectifs par niveau */}
                    <div className="w-1/2 overflow-y-auto pl-5 pr-2 custom-scrollbar">
                        <ActivityLevelExceptions
                            activityLevels={activityLevels}
                            allLevels={levels}
                            onAdd={onAddLevelException}
                            onRemove={handleRemoveLevel}
                            onUpdate={updateActivityLevel}
                        />
                    </div>
                </div>
            </FormModal>

            {/* Sous-fenêtre pour choisir le module parmi la liste existante */}
            <SelectModuleModal
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le professeur clique sur "+ Ajouter une activité" ou sur l'icône de "crayon" pour modifier.
 * 2. La fenêtre `AddActivityModal` s'affiche à l'écran.
 * 3. À GAUCHE :
 *    - Le professeur saisit le nom de l'atelier (ex: "Compter les jetons").
 *    - Il choisit le dossier (Module) parent.
 *    - Il coche les matériels nécessaires (ex: "Jetons", "Boîtes").
 * 4. À DROITE :
 *    - Il ajoute les niveaux scolaires concernés (ex: PS et MS).
 *    - Pour chaque niveau, il règle précisément le nombre d'exercices à réussir.
 * 5. Quand il clique sur "Enregistrer" :
 *    a. Le système vérifie que les champs obligatoires (*) sont remplis.
 *    b. Il envoie l'ensemble des données (activité + matériel + niveaux) à la base de données.
 *    c. En cas de succès, la fenêtre se ferme et l'atelier apparaît dans la liste principale.
 */
