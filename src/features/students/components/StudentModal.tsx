/**
 * Nom du module/fichier : StudentModal.tsx
 * 
 * Données en entrée : 
 *   - showModal : Commande l'ouverture ou la fermeture de la fenêtre.
 *   - isEditing / editId : Indiquent si l'on modifie un élève existant ou si on en crée un nouveau.
 *   - onSaved / onClose : Fonctions de rappel pour valider ou annuler la saisie.
 * 
 * Données en sortie : Une interface visuelle interactive (Modale) permettant de saisir l'intégralité du dossier d'un élève.
 * 
 * Objectif principal : Offrir un espace de saisie clair et structuré pour la gestion des élèves. Pour éviter de surcharger l'écran, le formulaire est divisé en deux onglets : l'un pour l'identité scolaire de l'enfant (nom, classe, niveau, groupes) et l'autre pour les coordonnées des parents. Le composant est "intelligent" : il permet de créer rapidement une classe ou un groupe manquant via des sous-fenêtres sans perdre les informations déjà saisies pour l'élève.
 * 
 * Ce que ça affiche : Une fenêtre surgissante avec des onglets de navigation, des champs de texte, des menus de sélection et des boutons d'action.
 */

import React, { Fragment } from 'react';
import { Plus, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import { FormModal } from '../../../core';
import { TablesInsert } from '../../../types/supabase';

import AddClassModal from '../../classes/components/AddClassModal';
import AddGroupModal from '../../../components/AddGroupModal';
import AddLevelModal from '../../levels/components/AddLevelModal';

// Composants internes et Logique métier
import { useStudentForm, UseStudentFormProps } from '../hooks/useStudentForm';
import StudentGeneralInfo from './StudentGeneralInfo';
import StudentParentsInfo from './StudentParentsInfo';

export interface StudentModalProps extends UseStudentFormProps {
    showModal: boolean;
}

/**
 * Composant Modale pour la création et l'édition des élèves.
 */
const StudentModal: React.FC<StudentModalProps> = (props) => {
    const { showModal, onClose, isEditing } = props;

    /** 
     * LOGIQUE FORMULAIRE : 
     * On délègue toute l'intelligence (chargement, validation, listes) au Hook spécialisé. 
     */
    const {
        student, loading, activeTab, setActiveTab,
        classesList, groupsList, niveauxList,
        showAddClassModal, setShowAddClassModal,
        showAddGroupModal, setShowAddGroupModal,
        showAddNiveauModal, setShowAddNiveauModal,
        handleInputChange, updateField,
        handleClassChange, handleNiveauChange, handleToggleGroup,
        handleClassAdded, handleGroupAdded, handleLevelSubmit,
        submitForm
    } = useStudentForm(props);

    const handleSubmit = async () => {
        await submitForm();
    };

    return (
        <Fragment>
            {/** 
             * FENÊTRE PRINCIPALE : 
             * Utilise le composant de base `FormModal` pour garantir une apparence cohérente 
             * (entête, icône de titre, boutons standard).
             */}
            <FormModal
                isOpen={showModal}
                onClose={onClose}
                onSubmit={handleSubmit}
                title={isEditing ? "Modifier l'élève" : "Ajouter un élève"}
                icon={isEditing ? UserIcon : Plus}
                loading={loading}
                confirmText={isEditing ? "Enregistrer les modifications" : "Créer la fiche élève"}
                size="md"
                noPadding
            >
                {/** 
                 * BARRE D'ONGLETS : 
                 * Permet de basculer entre l'identité de l'enfant et les dossiers parents.
                 */}
                <div className="flex px-6 border-b border-border/10 bg-surface sticky top-0 z-10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('enfant')}
                        className={clsx(
                            "px-6 py-3 text-sm font-semibold border-b-2 transition-all",
                            activeTab === 'enfant' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Profil Enfant
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('parents')}
                        className={clsx(
                            "px-6 py-3 text-sm font-semibold border-b-2 transition-all",
                            activeTab === 'parents' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Dossier Parents
                    </button>
                </div>

                {/** 
                 * CONTENU DES FORMULAIRES : 
                 * On affiche un sous-composant ou l'autre selon l'onglet actif.
                 */}
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

            {/** 
             * SOUS-FENÊTRES (FENÊTRES DANS LA FENÊTRE) : 
             * Ces fenêtres permettent de créer des éléments manquants (Classe, Groupe, Niveau) 
             * sans quitter ni réinitialiser le formulaire de l'élève.
             */}
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le professeur clique sur le bouton "+ Élève".
 * 2. La `StudentModal` surgit à l'écran, pré-chargée sur l'onglet "Profil Enfant".
 * 3. L'enseignant remplit le nom et le prénom de l'enfant.
 * 4. Au moment de choisir la classe, il s'aperçoit qu'il a oublié de créer la classe "CM1-C" :
 *    - Il clique sur le petit bouton "Ajouter" à côté du menu.
 *    - Une deuxième fenêtre (`AddClassModal`) apparaît par-dessus.
 *    - Il crée sa classe, valide, et revient sur le dossier de son élève avec "CM1-C" déjà sélectionné comme par magie.
 * 5. Il passe à l'onglet "Dossier Parents" pour saisir les adresses emails de contact.
 * 6. Il clique sur "Créer la fiche élève" : le composant valide l'ensemble et confie l'enregistrement au système.
 */
