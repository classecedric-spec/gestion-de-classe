/**
 * Nom du module/fichier : AddBranchModal.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Indique si la fenêtre doit être affichée.
 *   - `branchToEdit` : (Optionnel) Les données d'une branche existante si on est en mode modification.
 * 
 * Données en sortie : 
 *   - L'appel à `onSubmit` avec le nom et la photo de la branche.
 * 
 * Objectif principal : Offrir une interface simple pour créer ou modifier une matière principale (une "Branche") comme les Français, les Mathématiques ou le Sport.
 * 
 * Ce que ça affiche : Une fenêtre surgissante contenant un champ de texte pour le nom et une zone pour télécharger une image ou un logo représentatif.
 */

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

    // Initialise les champs si on modifie une branche existante
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

    // Déclenche l'enregistrement des données vers le service parent
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
                {/* Champ de saisie du nom */}
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

                {/* Zone de téléchargement du logo */}
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant décide de créer une nouvelle matière (ex: "Art").
 * 2. La fenêtre `AddBranchModal` s'ouvre. Si c'est une modification, elle pré-remplit le nom "Art".
 * 3. L'enseignant tape le nom et, s'il le souhaite, choisit une icône ou une photo sur son ordinateur.
 * 4. Au clic sur "Créer" ou "Sauvegarder", l'ordinateur vérifie que le nom n'est pas vide.
 * 5. La branche est envoyée au programme principal pour être sauvegardée dans la base de données.
 * 6. La fenêtre se ferme automatiquement.
 */
export default AddBranchModal;
