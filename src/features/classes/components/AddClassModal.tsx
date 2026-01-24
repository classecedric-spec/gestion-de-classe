import React, { useState, useEffect } from 'react';
import { Plus, Edit, BookOpen, X } from 'lucide-react';
import { Modal, Button, Input, Select } from '../../../components/ui';
import ImageUpload from '../../../components/ui/ImageUpload';
import { useClassForm } from '../hooks/useClassForm';
import ImportStudentsSection, { ImportedStudent } from './ImportStudentsSection';
import { Tables } from '../../../types/supabase';
import { ClassWithAdults } from '../services/classService';
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
        onSaved: onAdded,
        onClose
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

    // Wrapper submit to also handle students
    const handleFullSubmit = async () => {
        // NOTE: In the future, we could pass importedStudents to useClassForm or handle them here after success.
        // For now, we follow the current hook logic.
        await submitClass();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={classToEdit ? "Modifier la Classe" : "Nouvelle Classe"}
            icon={classToEdit ? <Edit size={24} /> : <Plus size={24} />}
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleFullSubmit}
                        loading={loading}
                        className="flex-1"
                        icon={classToEdit ? undefined : Plus}
                    >
                        {classToEdit ? "Enregistrer" : "Créer la classe"}
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
