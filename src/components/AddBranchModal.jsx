import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, BookOpen } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ui/ImageUpload';

const AddBranchModal = ({ isOpen, onClose, onAdded, branchToEdit = null }) => {
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Effect to reset or populate form when opening
    React.useEffect(() => {
        if (isOpen) {
            if (branchToEdit) {
                setName(branchToEdit.nom);
                setPhoto(branchToEdit.photo_base64 || null);
            } else {
                setName('');
                setPhoto(null);
            }
            setError(null);
        }
    }, [isOpen, branchToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté.");

            let errorResult;
            let data;

            if (branchToEdit) {
                // UPDATE
                const { data: updateData, error } = await supabase
                    .from('Branche')
                    .update({
                        nom: name.trim(),
                        photo_base64: photo
                    })
                    .eq('id', branchToEdit.id)
                    .select()
                    .single();
                data = updateData;
                errorResult = error;
            } else {
                // INSERT
                const { data: insertData, error } = await supabase
                    .from('Branche')
                    .insert([{
                        nom: name.trim(),
                        photo_base64: photo,
                        user_id: user.id
                    }])
                    .select()
                    .single();
                data = insertData;
                errorResult = error;
            }

            if (errorResult) throw errorResult;

            onAdded(data);
            onClose();
        } catch (err) {
            setError("Erreur lors de l'enregistrement. Vérifiez votre connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={branchToEdit ? 'Modifier la Branche' : 'Ajouter une Branche'}
            icon={<BookOpen size={24} />}
            className="max-w-md"
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        disabled={!name.trim()}
                        className="flex-1"
                        icon={Check}
                    >
                        {branchToEdit ? 'Sauvegarder' : 'Créer la Branche'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-900/30 border border-red-500/30 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nom de la Branche</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Mathématiques, Sciences..."
                            className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Logo (Optionnel)</label>
                        <ImageUpload
                            value={photo}
                            onChange={setPhoto}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AddBranchModal;
