import React, { useState, useEffect } from 'react';
import { Check, Layers } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

const AddLevelModal = ({ isOpen, onClose, onSubmit, levelToEdit }) => {
    const [nom, setNom] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (levelToEdit) {
                setNom(levelToEdit.nom);
            } else {
                setNom('');
            }
        }
    }, [isOpen, levelToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nom.trim()) return;

        setLoading(true);
        try {
            await onSubmit({ nom: nom.trim() });
            setNom('');
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
            title={levelToEdit ? 'Modifier le Niveau' : 'Nouveau Niveau'}
            icon={<Layers size={24} />}
            className="max-w-sm"
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
                        {levelToEdit ? 'Enregistrer' : 'Créer'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase block mb-2">Nom du niveau</label>
                    <input
                        type="text"
                        placeholder="Ex: CM1"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        autoFocus
                    />
                </div>
            </form>
        </Modal>
    );
};

export default AddLevelModal;
