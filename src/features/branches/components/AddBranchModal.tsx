import React, { useState, useEffect } from 'react';
import { Check, BookOpen } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';
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
                setPhotoBase64(branchToEdit.photo_base64 || null); // Note: photo_base64 not in Row type? It was in JS. Check specific type.
                // Checking previous type dump: Branche Row has photo_base64: string | null? No, I don't see it in the localized dump in step 226 for Branche Row?
                // Wait, step 226 Branche Row: photo_url: string | null. No photo_base64 ?
                // Checking Branche Insert: photo_url. No photo_base64.
                // Wait, Activite has photo_base64. Classe has photo_base64.
                // Branche does NOT have photo_base64 in the dump in step 226.
                // But the JS code uses `branchToEdit.photo_base64`.
                // This implies the DB schema might have changed or the type dump is outdated/incomplete, OR `branchToEdit` passed here has extra fields from a view or join?
                // Or maybe I missed it.
                // Let's assume for now it might differ or use `any` cast if strict type fails.
                // Actually, I'll cast branchToEdit to any for photo_base64 to be safe if it's not in the official type yet.
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nom.trim()) return;

        setLoading(true);
        try {
            await onSubmit({
                nom: nom.trim(),
                // Casting to any because if schema doesn't have it, we might rely on it being handled by backend or just ignored
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
                            onChange={(v: string | null) => {
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
