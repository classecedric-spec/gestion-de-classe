import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../lib/database';
import { groupService } from '../features/groups/services/groupService';
import { Plus, Layers } from 'lucide-react';
import { Modal, Button, ImageUpload, Input } from '../core';
import { Tables } from '../types/supabase';

interface AddGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded?: (group: Tables<'Groupe'>) => void;
    groupToEdit?: Tables<'Groupe'> | null;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({ isOpen, onClose, onAdded, groupToEdit = null }) => {
    const [newGroup, setNewGroup] = useState<{
        nom: string;
        acronyme: string;
        photo_url: string;
        tempId: string;
    }>({ nom: '', acronyme: '', photo_url: '', tempId: '' });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (groupToEdit) {
                setNewGroup({
                    nom: groupToEdit.nom || '',
                    acronyme: groupToEdit.acronyme || '',
                    photo_url: groupToEdit.photo_url || '',
                    tempId: groupToEdit.id
                });
            } else {
                setNewGroup({
                    nom: '',
                    acronyme: '',
                    photo_url: '',
                    tempId: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });
            }
        }
    }, [isOpen, groupToEdit]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error("Vous devez être connecté.");

            const groupData = {
                nom: newGroup.nom,
                acronyme: newGroup.acronyme,
                photo_url: newGroup.photo_url,
                user_id: user.id
            };

            let result: Tables<'Groupe'>;
            if (groupToEdit) {
                result = await groupService.updateGroup(groupToEdit.id, groupData);
            } else {
                result = await groupService.createGroup(groupData);
            }

            if (onAdded) onAdded(result);
            onClose();
        } catch (error: any) {
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
                        onClick={() => handleSubmit()}
                        loading={loading}
                        className="flex-1"
                        icon={groupToEdit ? undefined : Plus}
                    >
                        {groupToEdit ? "Enregistrer" : "Créer le groupe"}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <ImageUpload
                    value={newGroup.photo_url}
                    onChange={(v: string) => setNewGroup(prev => ({ ...prev, photo_url: v }))}
                    label="Photo du groupe"
                    placeholderIcon={Layers}
                    storagePath={`groupe/${newGroup.tempId}.jpg`}
                />

                <Input
                    label="Nom du groupe"
                    placeholder="Ex: Groupe A"
                    required
                    value={newGroup.nom}
                    onChange={e => setNewGroup({ ...newGroup, nom: e.target.value })}
                />
                <Input
                    label="Acronyme"
                    placeholder="Ex: GR A"
                    value={newGroup.acronyme}
                    onChange={e => setNewGroup({ ...newGroup, acronyme: e.target.value })}
                />
            </form>
        </Modal>
    );
};

export default AddGroupModal;
