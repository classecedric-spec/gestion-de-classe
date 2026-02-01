import React, { useState, useEffect } from 'react';
import { Plus, Edit, BookOpen, X } from 'lucide-react';
import { Modal, Button, Input, Select } from '../../../core';
import ImageUpload from '../../../core/ImageUpload';
import { useClassForm } from '../hooks/useClassForm';
import ImportStudentsSection, { ImportedStudent } from './ImportStudentsSection';
import { Tables, TablesInsert } from '../../../types/supabase';
import { ClassWithAdults } from '../services/classService';
import { studentService } from '../../students/services/studentService';
import { supabase } from '../../../lib/database';
import { resetSync } from '../../../lib/sync';
import { SupabaseLevelRepository } from '../../levels/repositories/SupabaseLevelRepository';

const levelRepository = new SupabaseLevelRepository();

export interface AddClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded: (newClass?: Tables<'Classe'>) => void;
    classToEdit: ClassWithAdults | null;
}

interface AdultRow {
    adulte_id: string;
    role: string;
}

const AddClassModal: React.FC<AddClassModalProps> = ({ isOpen, onClose, onAdded, classToEdit }) => {

    const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>([]);
    const [levels, setLevels] = useState<Tables<'Niveau'>[]>([]);

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
        onSaved: () => { }, // Dummy since we handle it in handleFullSubmit
        onClose: () => { }  // Dummy since we handle it in handleFullSubmit
    });

    const [adultRows, setAdultRows] = useState<AdultRow[]>([]);

    // Sync form state with local UI state for adults
    useEffect(() => {
        const refs: AdultRow[] = [
            ...(classData.principaux || []).map(id => ({ adulte_id: id, role: 'principal' })),
            ...(classData.complementaires || []).map(id => ({ adulte_id: id, role: 'complementaire' }))
        ];

        if (refs.length !== adultRows.length || (refs.length === 0 && adultRows.length === 0 && !classToEdit)) {
            setAdultRows(refs.length > 0 ? refs : [{ adulte_id: '', role: 'principal' }]);
        }
    }, [classData.principaux, classData.complementaires, classToEdit]);

    const handleAddRow = () => {
        setAdultRows([...adultRows, { adulte_id: '', role: 'principal' }]);
    };

    const handleUpdateRow = (index: number, field: keyof AdultRow, value: string) => {
        const newRows = [...adultRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setAdultRows(newRows);

        // Sync to Hook
        const p = newRows.filter(r => r.role === 'principal').map(r => r.adulte_id).filter(Boolean);
        const c = newRows.filter(r => r.role !== 'principal').map(r => r.adulte_id).filter(Boolean);

        updateField('principaux', p);
        updateField('complementaires', c);
    };

    const handleRemoveRow = (index: number) => {
        const newRows = adultRows.filter((_, i) => i !== index);
        setAdultRows(newRows);

        const p = newRows.filter(r => r.role === 'principal').map(r => r.adulte_id).filter(Boolean);
        const c = newRows.filter(r => r.role !== 'principal').map(r => r.adulte_id).filter(Boolean);

        updateField('principaux', p);
        updateField('complementaires', c);
    };

    const [savingStudents, setSavingStudents] = useState(false);

    // Wrapper submit to also handle students
    const handleFullSubmit = async () => {
        try {
            const savedClass = await submitClass();
            if (!savedClass) return;

            // 1. Handle Students Import if any
            if (!classToEdit && importedStudents.length > 0) {
                setSavingStudents(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Create students one by one using existing service
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
                            sex: '', // Default or could be added to excel
                            photo_url: '',
                            // @ts-ignore - types sync
                            titulaire_id: user.id
                        };

                        await studentService.saveStudent(
                            studentData,
                            [], // No initial groups for bulk import
                            user.id,
                            false
                        );
                    }
                    // Reset sync after bulk student creation to force fresh delta fetch
                    await resetSync('Eleve');
                }
                setSavingStudents(false);
            }

            // 2. Finalize
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
                <ImageUpload
                    value={classData.photo_base64 || ''}
                    onChange={(v: string) => updateField('photo_base64', v)}
                    label="Photo de la classe"
                    placeholderIcon={BookOpen}
                    className="mb-4"
                    storagePath={`classes/${classToEdit?.id || 'new'}_logo.jpg`}
                />

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

                {/* Adults Configuration */}
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

                {/* Import Logic (Only on create) */}
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
