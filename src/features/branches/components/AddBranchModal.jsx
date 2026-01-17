import React, { useState, useEffect } from 'react';
import { Check, BookOpen } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';

const AddBranchModal = ({ isOpen, onClose, onSubmit, branchToEdit }) => {
    const [nom, setNom] = useState('');
    const [photoBase64, setPhotoBase64] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (branchToEdit) {
                setNom(branchToEdit.nom);
                setPhotoBase64(branchToEdit.photo_base64 || null);
                setPhotoUrl(branchToEdit.photo_url || null);
            } else {
                setNom('');
                setPhotoBase64(null);
                setPhotoUrl(null);
            }
        }
    }, [isOpen, branchToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nom.trim()) return;

        setLoading(true);
        try {
            await onSubmit({
                nom: nom.trim(),
                photo_base64: photoBase64,
                photo_url: photoUrl
            });
            onClose();
        } catch (error) {
            console.error(error);
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
                        disabled={!nom.trim()}
                        className="flex-1"
                        icon={Check}
                    >
                        {branchToEdit ? 'Sauvegarder' : 'Créer'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nom de la Branche</label>
                        <input
                            type="text"
                            value={nom}
                            onChange={(e) => setNom(e.target.value)}
                            placeholder="Ex: Mathématiques, Sciences..."
                            className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Logo (Optionnel)</label>
                        <ImageUpload
                            value={photoUrl || photoBase64}
                            onChange={(v) => {
                                if (v && v.startsWith('http')) {
                                    setPhotoUrl(v);
                                } else {
                                    setPhotoBase64(v);
                                }
                            }}
                            storagePath={branchToEdit ? `branche/${branchToEdit.id}.jpg` : null}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AddBranchModal;
