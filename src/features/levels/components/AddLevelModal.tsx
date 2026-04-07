/**
 * Nom du module/fichier : AddLevelModal.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Commander l'affichage de la fenêtre.
 *   - `levelToEdit` : (Optionnel) Les données d'un niveau déjà existant si on veut le renommer.
 * 
 * Données en sortie : 
 *   - L'envoi du nouveau nom via `onSubmit`.
 * 
 * Objectif principal : Fournir une interface minimaliste pour ajouter un nouveau niveau scolaire (ex: "CP", "CE1") ou modifier le nom d'un niveau existant.
 * 
 * Ce que ça affiche : Une fenêtre surgissante avec une seule case de texte pour taper le nom du niveau.
 */

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

    // Si on ouvre la fenêtre pour modifier un niveau, on place son nom actuel dans la case.
    useEffect(() => {
        if (isOpen) {
            setNom(levelToEdit?.nom || '');
        }
    }, [isOpen, levelToEdit]);

    // Gère le clic sur le bouton de création/enregistrement
    const handleSubmit = async () => {
        if (!nom.trim()) return;

        setLoading(true);
        try {
            await onSubmit({ nom: nom.trim() });
            setNom(''); // On vide la case après le succès
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
                        Nom du niveau scolaire
                    </label>
                    <input
                        id="level-name"
                        type="text"
                        placeholder="Ex: CM1, 6ème, Maternelle..."
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant veut ajouter une classe de "Niveau CE2".
 * 2. Il clique sur le bouton "Ajouter", ce qui ouvre `AddLevelModal`.
 * 3. L'enseignant tape "CE2" dans le champ.
 * 4. L'ordinateur vérifie en temps réel que le champ n'est pas vide (sinon le bouton reste grisé).
 * 5. Au clic sur "Créer", le programme envoie le nom au service de stockage.
 * 6. Une fois enregistré, la case se vide et la fenêtre se ferme.
 */
export default AddLevelModal;
