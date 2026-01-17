import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Layers } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ui/ImageUpload';

const AddGroupModal = ({ isOpen, onClose, onAdded, groupToEdit = null }) => {
    const [newGroup, setNewGroup] = useState({ nom: '', acronyme: '', photo_base64: '', photo_url: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (groupToEdit) {
                setNewGroup({
                    nom: groupToEdit.nom || '',
                    acronyme: groupToEdit.acronyme || '',
                    photo_base64: groupToEdit.photo_base64 || '',
                    photo_url: groupToEdit.photo_url || ''
                });
            } else {
                setNewGroup({ nom: '', acronyme: '', photo_base64: '', photo_url: '' });
            }
        }
    }, [isOpen, groupToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté.");

            const groupData = {
                nom: newGroup.nom,
                acronyme: newGroup.acronyme,
                photo_base64: newGroup.photo_base64,
                photo_url: newGroup.photo_url,
                user_id: user.id
            };

            let result;
            if (groupToEdit) {
                const { data, error } = await supabase
                    .from('Groupe')
                    .update({
                        nom: newGroup.nom,
                        acronyme: newGroup.acronyme,
                        photo_base64: newGroup.photo_base64,
                        photo_url: newGroup.photo_url
                    })
                    .eq('id', groupToEdit.id)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                const { data, error } = await supabase
                    .from('Groupe')
                    .insert([groupData])
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }

            if (onAdded) onAdded(result);
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
            title={groupToEdit ? "Modifier le Groupe" : "Nouveau Groupe"}
            icon={groupToEdit ? <Layers size={24} /> : <Plus size={24} />}
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        className="flex-1"
                        icon={groupToEdit ? null : Plus}
                    >
                        {groupToEdit ? "Enregistrer" : "Créer le groupe"}
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4">
                <ImageUpload
                    value={newGroup.photo_url || newGroup.photo_base64}
                    onChange={(v) => {
                        if (v && v.startsWith('http')) {
                            setNewGroup(prev => ({ ...prev, photo_url: v }));
                        } else {
                            setNewGroup(prev => ({ ...prev, photo_base64: v }));
                        }
                    }}
                    label="Photo du groupe"
                    placeholderIcon={Layers}
                    storagePath={groupToEdit ? `groupe/${groupToEdit.id}.jpg` : null}
                />

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Nom du groupe</label>
                    <input
                        type="text"
                        placeholder="Ex: Groupe A"
                        required
                        value={newGroup.nom}
                        onChange={e => setNewGroup({ ...newGroup, nom: e.target.value })}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Acronyme</label>
                    <input
                        type="text"
                        placeholder="Ex: GR A"
                        value={newGroup.acronyme}
                        onChange={e => setNewGroup({ ...newGroup, acronyme: e.target.value })}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default AddGroupModal;
