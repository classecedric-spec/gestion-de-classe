import React, { useState, useEffect } from 'react';
import { GitBranch, Check } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';

const AddSubBranchModal = ({ isOpen, onClose, onSubmit, branches, subBranchToEdit }) => {
    const [nom, setNom] = useState('');
    const [branchId, setBranchId] = useState('');
    const [photoBase64, setPhotoBase64] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (subBranchToEdit) {
                setNom(subBranchToEdit.nom);
                setBranchId(subBranchToEdit.branche_id);
                setPhotoBase64(subBranchToEdit.photo_base64 || null);
                setPhotoUrl(subBranchToEdit.photo_url || null);
            } else {
                setNom('');
                setBranchId('');
                setPhotoBase64(null);
                setPhotoUrl(null);
            }
        }
    }, [isOpen, subBranchToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nom.trim() || !branchId) return;

        setLoading(true);
        try {
            await onSubmit({
                nom: nom.trim(),
                branche_id: branchId,
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
            title={subBranchToEdit ? 'Modifier la Sous-Branche' : 'Ajouter une Sous-Branche'}
            icon={<GitBranch size={24} />}
            className="max-w-md"
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        disabled={!nom.trim() || !branchId}
                        className="flex-1"
                        icon={Check}
                    >
                        {subBranchToEdit ? 'Sauvegarder' : 'Créer'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nom de la Sous-branche</label>
                        <input
                            type="text"
                            value={nom}
                            onChange={(e) => setNom(e.target.value)}
                            placeholder="Ex: Algèbre, Géométrie..."
                            className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Branche Parente</label>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        >
                            <option value="" disabled>Sélectionner la branche parente</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.nom}</option>
                            ))}
                        </select>
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
                            storagePath={subBranchToEdit ? `sousbranche/${subBranchToEdit.id}.jpg` : null}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AddSubBranchModal;
