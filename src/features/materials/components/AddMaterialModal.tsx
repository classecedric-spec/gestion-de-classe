/**
 * Nom du module/fichier : AddMaterialModal.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Indique si la fenêtre doit être affichée.
 *   - `materielToEdit` : (Optionnel) Les données d'un matériel existant si on est en mode "Modification".
 * 
 * Données en sortie : 
 *   - `onSubmit` : Envoie le nom et l'acronyme saisis vers le service de sauvegarde.
 * 
 * Objectif principal : Offrir une interface simple et claire pour ajouter un nouvel outil à la classe (ex: 'Tablette') ou modifier un outil existant. La fenêtre s'occupe de valider que le nom est bien rempli avant de permettre l'enregistrement.
 * 
 * Ce que ça affiche : 
 *   - Un champ de texte pour le nom du matériel (obligatoire).
 *   - Un champ optionnel pour un acronyme court (max 5 lettres).
 *   - Un bouton de sauvegarde avec un indicateur de chargement.
 */

import React, { useState, useEffect } from 'react';
import { FormModal } from '../../../core';
import { Save } from 'lucide-react';
import { TypeMateriel } from '../services/materialService';

interface AddMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (materialData: { nom: string; acronyme: string | null }) => Promise<void> | void;
    materielToEdit?: TypeMateriel | null;
}

/**
 * Fenêtre surgissante (Modal) pour la création ou l'édition de matériel.
 */
const AddMaterialModal: React.FC<AddMaterialModalProps> = ({ isOpen, onClose, onSubmit, materielToEdit }) => {
    const [nom, setNom] = useState('');
    const [acronyme, setAcronyme] = useState('');
    const [loading, setLoading] = useState(false);

    /**
     * INITIALISATION : Remplit les champs si on est en mode modification.
     */
    useEffect(() => {
        if (isOpen) {
            if (materielToEdit) {
                setNom(materielToEdit.nom || '');
                setAcronyme(materielToEdit.acronyme || '');
            } else {
                setNom('');
                setAcronyme('');
            }
        }
    }, [isOpen, materielToEdit]);

    /**
     * ENVOI : Valide et transmet les données.
     */
    const handleSubmit = async () => {
        if (!nom.trim()) return; // Bloque si le nom est vide

        setLoading(true);
        try {
            await onSubmit({
                nom: nom.trim(),
                acronyme: acronyme.trim() || null
            });
            onClose(); // Ferme la fenêtre après succès
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
            title={materielToEdit ? 'Modifier le matériel' : 'Nouveau matériel'}
            icon={Save}
            loading={loading}
            size="sm"
        >
            <div className="space-y-4">
                {/* Champ : Nom du matériel */}
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

                {/* Champ : Acronyme (Optionnel) */}
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
            </div>
        </FormModal>
    );
};

export default AddMaterialModal;

/**
 * LOGIGRAMME DE FORMULAIRE :
 * 
 * 1. OUVERTURE -> La fenêtre apparaît, vide (nouveau) ou pré-remplie (édition).
 * 2. SAISIE -> L'utilisateur tape le nom de l'objet.
 * 3. VALIDATION -> Si l'utilisateur clique sur "Enregistrer" :
 *    - SI NOM VIDE : Rien ne se passe (sécurité).
 *    - SI NOM OK : Le bouton affiche un sablier et envoie les données.
 * 4. FERMETURE -> Une fois que le serveur a répondu "OK", la fenêtre se ferme d'elle-même.
 */
