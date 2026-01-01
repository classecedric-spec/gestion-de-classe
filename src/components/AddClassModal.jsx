import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit, BookOpen } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ui/ImageUpload';

const AddClassModal = ({ isOpen, onClose, onAdded, classToEdit }) => {
    const [name, setName] = useState('');
    const [acronym, setAcronym] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [photoBase64, setPhotoBase64] = useState('');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (classToEdit) {
                setName(classToEdit.nom);
                setAcronym(classToEdit.acronyme || '');
                setLogoUrl(classToEdit.logo_url || '');
                setPhotoBase64(classToEdit.photo_base64 || '');
            } else {
                setName('');
                setAcronym('');
                setLogoUrl('');
                setPhotoBase64('');
            }
        }
    }, [isOpen, classToEdit]);

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté pour créer une classe.");

            if (classToEdit) {
                const { error } = await supabase
                    .from('Classe')
                    .update({
                        nom: name,
                        acronyme: acronym,
                        logo_url: logoUrl,
                        photo_base64: photoBase64
                    })
                    .eq('id', classToEdit.id);
                if (error) throw error;
                onAdded(classToEdit); // Pass back the edited object (fields might be stale but ID is same)
            } else {
                const { data, error } = await supabase.from('Classe').insert([{
                    nom: name,
                    acronyme: acronym,
                    logo_url: logoUrl,
                    photo_base64: photoBase64,
                    user_id: user.id
                }]).select().single();

                if (error) throw error;
                onAdded(data);
            }

            onClose();
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoading(false);
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
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleCreateClass}
                        loading={loading}
                        className="flex-1"
                        icon={classToEdit ? null : Plus}
                    >
                        {classToEdit ? "Enregistrer" : "Créer la classe"}
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleCreateClass(e); }} className="space-y-4">
                <ImageUpload
                    value={photoBase64}
                    onChange={setPhotoBase64}
                    label="Photo de la classe"
                    placeholderIcon={BookOpen}
                />

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Nom de la classe</label>
                    <input
                        type="text"
                        placeholder="Ex: 5ème Scientifique"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Acronyme</label>
                    <input
                        type="text"
                        placeholder="Ex: 5SC"
                        value={acronym}
                        onChange={e => setAcronym(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default AddClassModal;
