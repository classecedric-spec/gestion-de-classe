/**
 * Nom du module/fichier : AddSubBranchModal.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Indique si la fenêtre doit être affichée.
 *   - `branches` : Liste des branches parentes disponibles (pour le menu déroulant).
 *   - `subBranchToEdit` : (Optionnel) Données d'une sous-branche existante pour modification.
 * 
 * Données en sortie : 
 *   - L'appel à `onSubmit` avec les données de la sous-branche (nom, branche parente, photo).
 * 
 * Objectif principal : Permettre de créer ou modifier une "sous-matière" ou une spécialité liée à une branche principale (ex: "Géométrie" rattachée à "Mathématiques").
 * 
 * Ce que ça affiche : Une fenêtre surgissante avec un champ de texte, un menu de sélection pour la branche parente, et une zone de téléchargement d'image.
 */

import React, { useState, useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { FormModal, ImageUpload } from '../../../core';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];
type SousBrancheInsert = Database['public']['Tables']['SousBranche']['Insert'];

interface AddSubBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<SousBrancheInsert>) => Promise<void>;
    branches: BrancheRow[];
    subBranchToEdit?: SousBrancheRow;
}

const AddSubBranchModal: React.FC<AddSubBranchModalProps> = ({ isOpen, onClose, onSubmit, branches, subBranchToEdit }) => {
    const [nom, setNom] = useState<string>('');
    const [branchId, setBranchId] = useState<string>('');
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // Initialise les champs lors de l'ouverture, en gérant le mode "création" ou "édition".
    useEffect(() => {
        if (isOpen) {
            if (subBranchToEdit) {
                setNom(subBranchToEdit.nom);
                setBranchId(subBranchToEdit.branche_id || '');
                setPhotoBase64((subBranchToEdit as any).photo_base64 || null);
                setPhotoUrl(subBranchToEdit.photo_url || null);
            } else {
                setNom('');
                setBranchId('');
                setPhotoBase64(null);
                setPhotoUrl(null);
            }
        }
    }, [isOpen, subBranchToEdit]);

    // Valide et envoie les données vers le serveur via la fonction onSubmit
    const handleSubmit = async () => {
        if (!nom.trim() || !branchId) return;

        setLoading(true);
        try {
            await onSubmit({
                nom: nom.trim(),
                branche_id: branchId,
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
            title={subBranchToEdit ? 'Modifier la Sous-Branche' : 'Ajouter une Sous-Branche'}
            icon={GitBranch}
            loading={loading}
            confirmDisabled={!nom.trim() || !branchId}
            confirmText={subBranchToEdit ? 'Sauvegarder' : 'Créer'}
            size="sm"
        >
            <div className="space-y-4">
                {/* Champ pour le nom de la spécialité */}
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

                {/* Sélecteur de la matière parente obligatoire */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Branche Parente</label>
                    <select
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        title="Branche parente"
                    >
                        <option value="" disabled>Sélectionner la branche parente</option>
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.nom}</option>
                        ))}
                    </select>
                </div>

                {/* Zone optionnelle pour charger un logo spécifique */}
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
                        storagePath={subBranchToEdit ? `sousbranche/${subBranchToEdit.id}.jpg` : undefined}
                    />
                </div>
            </div>
        </FormModal>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant souhaite créer une sous-catégorie (ex: "Grammaire") sous la branche "Français".
 * 2. Il ouvre la fenêtre `AddSubBranchModal`.
 * 3. Il saisit le nom et sélectionne "Français" dans la liste déroulante des branches parentes.
 * 4. L'enseignant peut ajouter une icône pour illustrer cette sous-matière.
 * 5. Lors de la validation, le programme vérifie qu'un nom est présent et qu'une branche parente est bien choisie.
 * 6. Les informations sont envoyées pour stockage et la fenêtre se referme.
 */
export default AddSubBranchModal;
