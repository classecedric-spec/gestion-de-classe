import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Save } from 'lucide-react';

const AddMaterielModal = ({ isOpen, onClose, onAdded, materielToEdit }) => {
    const [nom, setNom] = useState('');
    const [acronyme, setAcronyme] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (materielToEdit) {
                setNom(materielToEdit.nom);
                setAcronyme(materielToEdit.acronyme || '');
            } else {
                setNom('');
                setAcronyme('');
            }
            setError(null);
        }
    }, [isOpen, materielToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nom.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                nom: nom.trim(),
                acronyme: acronyme.trim() || null
            };

            if (materielToEdit) {
                // Update
                const { error } = await supabase
                    .from('TypeMateriel')
                    .update(payload)
                    .eq('id', materielToEdit.id);
                if (error) throw error;
                onAdded({ ...materielToEdit, ...payload });
            } else {
                // Create
                const { data, error } = await supabase
                    .from('TypeMateriel')
                    .insert([{ ...payload, user_id: user.id }])
                    .select()
                    .single();
                if (error) throw error;
                onAdded(data);
            }
            onClose();
        } catch (err) {
            setError("Une erreur est survenue lors de l'enregistrement.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={materielToEdit ? 'Modifier le matériel' : 'Nouveau matériel'}
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        className="flex-1"
                        icon={Save}
                    >
                        Enregistrer
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="nom" className="text-sm font-medium text-gray-300">
                        Nom du matériel <span className="text-danger">*</span>
                    </label>
                    <input
                        id="nom"
                        type="text"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="Ex: Compas, Règle, Dictionnaire..."
                        autoFocus
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="acronyme" className="text-sm font-medium text-gray-300">
                        Acronyme (Optionnel)
                    </label>
                    <input
                        id="acronyme"
                        type="text"
                        value={acronyme}
                        onChange={(e) => setAcronyme(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase"
                        placeholder="Ex: COM, REG..."
                        maxLength={5}
                    />
                    <p className="text-xs text-grey-medium">Sera affiché dans le titre de l'activité (ex: Titre [ACR])</p>
                </div>
                {error && (
                    <div className="text-danger text-sm bg-danger/10 p-3 rounded-lg border border-danger/20">
                        {error}
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default AddMaterielModal;
