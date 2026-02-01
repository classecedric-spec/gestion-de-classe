import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { FormModal, ImageUpload } from '../../../core';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type BrancheInsert = Database['public']['Tables']['Branche']['Insert'];

interface AddBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<BrancheInsert>) => Promise<void>;
    branchToEdit?: BrancheRow;
}

const AddBranchModal: React.FC<AddBranchModalProps> = ({ isOpen, onClose, onSubmit, branchToEdit }) => {
    const [nom, setNom] = useState<string>('');
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            if (branchToEdit) {
                setNom(branchToEdit.nom);
                setPhotoBase64((branchToEdit as any).photo_base64 || null);
                setPhotoUrl(branchToEdit.photo_url || null);
            } else {
                setNom('');
                setPhotoBase64(null);
                setPhotoUrl(null);
            }
        }
    }, [isOpen, branchToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!nom.trim()) return;

        setLoading(true);
        try {
            await onSubmit({
                nom: nom.trim(),
                photo_base64: photoBase64,
                photo_url: photoUrl
            } as any);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={branchToEdit ? 'Modifier la Branche' : 'Ajouter une Branche'}
            icon={BookOpen}
            loading={loading}
            confirmDisabled={!nom.trim()}
            confirmText={branchToEdit ? 'Sauvegarder' : 'Créer'}
            size="sm"
        >
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
                        value={photoUrl || photoBase64 || undefined}
                        onChange={(v: string | null) => {
                            if (v && v.startsWith('http')) {
                                setPhotoUrl(v);
                            } else {
                                setPhotoBase64(v);
                            }
                        }}
                        storagePath={branchToEdit ? `branche/${branchToEdit.id}.jpg` : undefined}
                    />
                </div>
            </div>
        </FormModal>
    );
};

export default AddBranchModal;
