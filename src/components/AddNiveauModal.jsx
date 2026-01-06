import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, Layers } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const AddNiveauModal = ({ isOpen, onClose, onAdded, niveauToEdit }) => {
    const [nom, setNom] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (niveauToEdit) {
                setNom(niveauToEdit.nom);
            } else {
                setNom('');
            }
        }
    }, [isOpen, niveauToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté pour gérer les niveaux.");

            let resultData;

            if (niveauToEdit) {
                // UPDATE
                const { data, error } = await supabase
                    .from('Niveau')
                    .update({ nom: nom.trim() })
                    .eq('id', niveauToEdit.id)
                    .select()
                    .single();

                if (error) throw error;
                resultData = data;
            } else {
                // CREATE
                // Fetch existing niveaus to determine order order
                const { data: existingNiveaux } = await supabase
                    .from('Niveau')
                    .select('ordre')
                    .order('ordre', { ascending: false })
                    .limit(1);

                const nextOrder = (existingNiveaux && existingNiveaux.length > 0)
                    ? (existingNiveaux[0].ordre || 0) + 1
                    : 1;

                const { data, error } = await supabase
                    .from('Niveau')
                    .insert([{
                        nom: nom.trim(),
                        ordre: nextOrder,
                        user_id: user.id
                    }])
                    .select()
                    .single();

                if (error) throw error;
                resultData = data;
            }

            onAdded(resultData);
            setNom('');
            onClose();
        } catch (error) {
            alert("Erreur: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={niveauToEdit ? 'Modifier le Niveau' : 'Nouveau Niveau'}
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
                        {niveauToEdit ? 'Enregistrer' : 'Créer'}
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

export default AddNiveauModal;
