import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { FormModal } from '../../../core';
import { Tables, TablesInsert } from '../../../types/supabase';

export interface AddLevelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (levelData: TablesInsert<'Niveau'>) => Promise<boolean | void>;
    levelToEdit?: Tables<'Niveau'> | null;
}

const AddLevelModal: React.FC<AddLevelModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    levelToEdit
}) => {
    const [nom, setNom] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNom(levelToEdit?.nom || '');
        }
    }, [isOpen, levelToEdit]);

    const handleSubmit = async () => {
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
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={levelToEdit ? 'Modifier le Niveau' : 'Nouveau Niveau'}
            icon={Layers}
            loading={loading}
            confirmDisabled={!nom.trim()}
            confirmText={levelToEdit ? 'Enregistrer' : 'Créer'}
            size="sm"
        >
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase block mb-2" htmlFor="level-name">
                        Nom du niveau
                    </label>
                    <input
                        id="level-name"
                        type="text"
                        placeholder="Ex: CM1"
                        title="Nom du niveau"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        autoFocus
                    />
                </div>
            </div>
        </FormModal>
    );
};


export default AddLevelModal;
