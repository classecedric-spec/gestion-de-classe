import React, { useState, useEffect, ChangeEvent } from 'react';
import { Plus, Edit, BookOpen } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
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

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase" htmlFor="class-name">Nom de la classe</label>
                    <input
                        id="class-name"
                        type="text"
                        name="nom"
                        value={classData.nom}
                        onChange={handleChange}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="Ex: 5ème Scientifique"
                        title="Nom de la classe"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase" htmlFor="class-acronym">Acronyme</label>
                    <input
                        id="class-acronym"
                        type="text"
                        name="acronyme"
                        value={classData.acronyme}
                        onChange={handleChange}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="Ex: 5SC"
                        title="Acronyme de la classe"
                    />
                </div>

                {/* Adults Configuration */}
                <div className="space-y-3 pt-2 border-t border-white/5 text-left">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-grey-light uppercase">Personnel Enseignant</label>
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider flex items-center gap-1"
                        >
                            <Plus size={12} /> Ajouter
                        </button>
                    </div>

                    <div className="space-y-2">
                        {adultRows.map((row, index) => (
                            <div key={index} className="flex gap-2 items-start animate-in slide-in-from-top-1 text-left">
                                <select
                                    value={row.adulte_id}
                                    title="Sélectionner un enseignant"
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdateRow(index, 'adulte_id', e.target.value)}
                                    className="flex-1 bg-input border border-border/10 rounded-xl p-2.5 text-sm text-text-main focus:border-primary outline-none"
                                >
                                    <option value="">Sélectionner...</option>
                                    {adultsList.map(a => (
                                        <option key={a.id}>{a.prenom} {a.nom}</option>
                                    ))}
                                </select>
                                <select
                                    value={row.role}
                                    title="Rôle de l'enseignant"
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdateRow(index, 'role', e.target.value)}
                                    className="w-32 bg-input border border-border/10 rounded-xl p-2.5 text-sm text-text-main focus:border-primary outline-none"
                                >
                                    <option value="principal">Principal</option>
                                    <option value="coenseignant" >Co-Ens.</option>
                                    <option value="support">Support</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRow(index)}
                                    className="p-2.5 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                                    title="Retirer cet enseignant"
                                >
                                    <Plus size={18} className="rotate-45" />
                                </button>
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
