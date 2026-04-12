/**
 * Nom du module/fichier : AddClassModal.tsx
 * 
 * Données en entrée : 
 *   - isOpen : État indiquant si la fenêtre de dialogue doit être affichée.
 *   - onClose : Fonction permettant de fermer la fenêtre (annulation).
 *   - onAdded : Fonction de rappel exécutée après la réussite de la création ou de la modification.
 *   - classToEdit : Objet contenant les données de la classe si nous sommes en mode "Édition".
 * 
 * Données en sortie : Une interface utilisateur de type fenêtre modale interactive.
 * 
 * Objectif principal : Offrir un écran complet permettant de configurer une classe de A à Z. Au-delà de l'identité de la classe (Nom, Logo), ce composant permet de définir précisément l'équipe pédagogique (plusieurs enseignants avec des rôles distincts : principal, co-enseignant, support) et propose même une fonction d'importation groupée des élèves via Excel/CSV lors de la création d'une nouvelle classe.
 * 
 * Ce que ça affiche : Un formulaire moderne comprenant :
 *    - Un sélecteur d'image pour le logo de la classe.
 *    - Des champs de saisie pour le nom et l'acronyme.
 *    - Une liste dynamique pour ajouter/retirer des enseignants.
 *    - Une section d'importation d'élèves (uniquement lors d'une nouvelle création).
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, BookOpen, X } from 'lucide-react';
import { Modal, Button, Input, Select } from '../../../core';
import ImageUpload from '../../../core/ImageUpload';
import { useClassForm } from '../hooks/useClassForm';
import ImportStudentsSection, { ImportedStudent } from './ImportStudentsSection';
import { Tables, TablesInsert } from '../../../types/supabase';
import { studentService } from '../../students/services/studentService';
import { supabase } from '../../../lib/database';
import { resetSync } from '../../../lib/sync';
import { SupabaseLevelRepository } from '../../levels/repositories/SupabaseLevelRepository';

const levelRepository = new SupabaseLevelRepository();

interface AddClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded: () => void;
    classToEdit?: Tables<'Classe'> | null;
}

/**
 * Interface pour la gestion locale des lignes d'enseignants dans le formulaire.
 */
interface AdultRow {
    adulte_id: string; // ID de l'adulte sélectionné
    role: string; // Rôle au sein de cette classe
}

/**
 * Composant visuel de la fenêtre de création ou de modification d'une classe.
 */
const AddClassModal: React.FC<AddClassModalProps> = ({ isOpen, onClose, onAdded, classToEdit }) => {

    // États locaux pour gérer les données temporaires d'élèves et les niveaux scolaires
    const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>([]);
    const [levels, setLevels] = useState<Tables<'Niveau'>[]>([]);

    /**
     * Chargement des niveaux : récupère la liste des niveaux scolaires (PS, MS, GS...) 
     * pour permettre de classer les élèves lors d'une importation groupée.
     */
    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const data = await levelRepository.getLevels();
                setLevels(data);
            } catch (error) {
                console.error("Error fetching levels:", error);
            }
        };
        if (isOpen) fetchLevels();
    }, [isOpen]);

    // On utilise le "cerveau" métier via le Hook useClassForm
    const {
        classData,
        loading,
        adultsList,
        handleChange,
        updateField,
        submitForm: submitClass
    } = useClassForm({
        isEditing: !!classToEdit,
        classToEdit,
        onSaved: () => { }, 
        onClose: () => { }  
    });

    // Gestion de l'affichage dynamique de la liste des professeurs
    const [adultRows, setAdultRows] = useState<AdultRow[]>([]);

    /**
     * Synchronisation : transforme l'état du formulaire en lignes visuelles 
     * d'intervenants éditables dans le tableau.
     */
    useEffect(() => {
        const refs: AdultRow[] = [
            ...(classData.principaux || []).map(id => ({ adulte_id: id, role: 'principal' })),
            ...(classData.complementaires || []).map(id => ({ adulte_id: id, role: 'complementaire' }))
        ];

        if (refs.length !== adultRows.length || (refs.length === 0 && adultRows.length === 0 && !classToEdit)) {
            setAdultRows(refs.length > 0 ? refs : [{ adulte_id: '', role: 'principal' }]);
        }
    }, [classData.principaux, classData.complementaires, classToEdit]);

    /**
     * Ajoute un nouvel emplacement pour un enseignant supplémentaire.
     */
    const handleAddRow = () => {
        setAdultRows([...adultRows, { adulte_id: '', role: 'principal' }]);
    };

    /**
     * Met à jour une ligne spécifique d'enseignant et synchronise avec le Hook métier.
     */
    const handleUpdateRow = (index: number, field: keyof AdultRow, value: string) => {
        const newRows = [...adultRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setAdultRows(newRows);

        // Mise à jour des listes triées par rôle pour le serveur
        const p = newRows.filter(r => r.role === 'principal').map(r => r.adulte_id).filter(Boolean);
        const c = newRows.filter(r => r.role !== 'principal').map(r => r.adulte_id).filter(Boolean);

        updateField('principaux', p);
        updateField('complementaires', c);
    };

    /**
     * Supprime un intervenant de la liste.
     */
    const handleRemoveRow = (index: number) => {
        const newRows = adultRows.filter((_, i) => i !== index);
        setAdultRows(newRows);

        const p = newRows.filter(r => r.role === 'principal').map(r => r.adulte_id).filter(Boolean);
        const c = newRows.filter(r => r.role !== 'principal').map(r => r.adulte_id).filter(Boolean);

        updateField('principaux', p);
        updateField('complementaires', c);
    };

    const [savingStudents, setSavingStudents] = useState(false);

    /**
     * Super-Validation : Cette fonction gère l'enregistrement global.
     * 1. Sauvegarde les infos de la classe.
     * 2. Si un fichier Excel d'élèves était présent, lance la création massive de fiches élèves.
     */
    const handleFullSubmit = async () => {
        try {
            const savedClass = await submitClass();
            if (!savedClass) return;

            // ÉTAPE PARTICULIÈRE : Création automatique des élèves importés
            if (!classToEdit && importedStudents.length > 0) {
                setSavingStudents(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // On boucle sur chaque ligne du fichier importé
                    for (const student of importedStudents) {
                        const studentData: TablesInsert<'Eleve'> = {
                            nom: student.nom,
                            prenom: student.prenom,
                            date_naissance: student.date_naissance,
                            classe_id: savedClass.id,
                            niveau_id: student.niveau_id,
                            parent1_nom: student.parent1_nom,
                            parent1_prenom: student.parent1_prenom,
                            parent1_email: student.parent1_email,
                            parent2_nom: student.parent2_nom,
                            parent2_prenom: student.parent2_prenom,
                            parent2_email: student.parent2_email,
                            sex: '', 
                            photo_url: '',
                            titulaire_id: user.id
                        };

                        // Appel du service élève pour chaque inscription
                        await studentService.saveStudent(
                            studentData,
                            [], 
                            user.id,
                            false
                        );
                    }
                    // On demande au système de rafraîchir son index pour voir les nouveaux élèves de suite
                    await resetSync('Eleve');
                }
                setSavingStudents(false);
            }

            // Fin du processus : on informe le parent et on ferme tout
            onAdded(savedClass);
            onClose();
        } catch (err) {
            setSavingStudents(false);
            console.error("Critical error during full class/students submit:", err);
            alert("Une erreur est survenue lors de la création de la classe et de ses élèves.");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={classToEdit ? "Modifier la Classe" : "Nouvelle Classe"}
            icon={classToEdit ? <Edit size={24} /> : <Plus size={24} />}
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1" disabled={savingStudents}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleFullSubmit}
                        loading={loading || savingStudents}
                        className="flex-1"
                        icon={classToEdit ? undefined : Plus}
                    >
                        {savingStudents ? "Création des élèves..." : (classToEdit ? "Enregistrer" : "Créer la classe")}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Zone de téléchargement du logo de la classe */}
                <ImageUpload
                    value={classData.photo_base64 || ''}
                    onChange={(v: string) => updateField('photo_base64', v)}
                    label="Photo de la classe"
                    placeholderIcon={BookOpen}
                    className="mb-4"
                    storagePath={`classes/${classToEdit?.id || 'new'}_logo.jpg`}
                />

                {/* Saisie des informations d'identité */}
                <Input
                    label="Nom de la classe"
                    id="class-name"
                    name="nom"
                    value={classData.nom}
                    onChange={handleChange}
                    placeholder="Ex: 5ème Scientifique"
                    title="Nom de la classe"
                    required
                />
                <Input
                    label="Acronyme"
                    id="class-acronym"
                    name="acronyme"
                    value={classData.acronyme}
                    onChange={handleChange}
                    placeholder="Ex: 5SC"
                    title="Acronyme de la classe"
                />

                {/* Configuration dynamique de l'équipe pédagogique */}
                <div className="space-y-3 pt-2 border-t border-white/5 text-left">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-grey-light uppercase">Personnel Enseignant</label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleAddRow}
                            className="text-[10px] h-auto py-1 font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
                            icon={Plus}
                        >
                            Ajouter
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {adultRows.map((row, index) => (
                            <div key={index} className="flex gap-2 items-start animate-in slide-in-from-top-1 text-left">
                                <Select
                                    value={row.adulte_id}
                                    onChange={(e: any) => handleUpdateRow(index, 'adulte_id', e.target.value)}
                                    options={[
                                        { value: '', label: 'Sélectionner...' },
                                        ...adultsList.map(a => ({ value: a.id, label: `${a.prenom} ${a.nom}` }))
                                    ]}
                                    className="flex-1"
                                    title="Sélectionner un enseignant"
                                />
                                <Select
                                    value={row.role}
                                    onChange={(e: any) => handleUpdateRow(index, 'role', e.target.value)}
                                    options={[
                                        { value: 'principal', label: 'Principal' },
                                        { value: 'coenseignant', label: 'Co-Ens.' },
                                        { value: 'support', label: 'Support' }
                                    ]}
                                    className="w-32"
                                    title="Rôle de l'enseignant"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveRow(index)}
                                    className="h-[46px] w-[46px] p-0 text-danger hover:bg-danger/10"
                                    title="Retirer cet enseignant"
                                    icon={X}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section d'importation massive d'élèves (uniquement visible à la création) */}
                {!classToEdit && (
                    <ImportStudentsSection
                        levels={levels}
                        existingImports={importedStudents}
                        onImportData={setImportedStudents}
                    />
                )}
            </div>
        </Modal>
    );
};

export default AddClassModal;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur "Nouvelle Classe" depuis le tableau de bord.
 * 2. La fenêtre `AddClassModal` s'ouvre : il configure le nom (ex: "CM2 B").
 * 3. Il affecte son équipe : se met lui-même en principal et ajoute son ATSEM en support.
 * 4. S'il possède un fichier Excel avec sa liste d'élèves :
 *    - Il utilise la section "Importation" pour glisser son fichier.
 *    - Les noms des élèves apparaissent visuellement dans le formulaire.
 * 5. Lors du clic sur "Créer la classe" :
 *    a. Le système crée la classe en premier.
 *    b. Il boucle ensuite sur la liste des élèves importés pour créer chaque fiche.
 *    c. Il téléverse le logo de la classe sur le cloud.
 * 6. Une fois fini, la fenêtre se ferme automatiquement et la classe est prête avec tous ses élèves.
 */
