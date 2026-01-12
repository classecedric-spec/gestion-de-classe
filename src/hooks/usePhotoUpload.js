import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { resizeImage } from '../lib/imageUtils';
import { toast } from 'sonner';

/**
 * Hook personnalisé pour gérer l'upload de photos
 * Gère le drag & drop, la sélection de fichiers, le redimensionnement et l'upload
 * 
 * @param {Object} options - Options de configuration
 * @param {number} options.maxWidth - Largeur maximale de l'image (défaut: 400)
 * @param {number} options.maxHeight - Hauteur maximale de l'image (défaut: 400)
 * @param {number} options.quality - Qualité JPEG (0-1, défaut: 0.8)
 * @returns {Object} - Fonctions et états pour gérer les photos
 */
export function usePhotoUpload(options = {}) {
    const {
        maxWidth = 400,
        maxHeight = 400,
        quality = 0.8,
        onUploadSuccess
    } = options;

    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(null);

    /**
     * Traite et sauvegarde une photo
     * @param {File} file - Fichier image
     * @param {Object} target - Objet cible (ex: {id, table: 'Eleve'})
     */
    const processAndSavePhoto = async (file, target) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Le fichier doit être une image');
            return null;
        }

        setUploading(true);

        try {
            // Redimensionner l'image
            const resizedBase64 = await resizeImage(file, maxWidth, maxHeight, quality);

            // Mettre à jour dans la base de données
            const { error } = await supabase
                .from(target.table || 'Eleve')
                .update({ photo_base64: resizedBase64 })
                .eq('id', target.id);

            if (error) throw error;

            toast.success('Photo mise à jour avec succès');
            onUploadSuccess?.(resizedBase64, target);

            return resizedBase64;
        } catch (error) {
            console.error('Erreur lors du traitement de la photo:', error);
            toast.error('Erreur lors de l\'upload de la photo');
            return null;
        } finally {
            setUploading(false);
        }
    };

    /**
     * Gère le drop d'une photo
     */
    const handlePhotoDrop = async (e, target) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);

        const file = e.dataTransfer.files[0];
        if (file) {
            await processAndSavePhoto(file, target);
        }
    };

    /**
     * Gère le drag over
     */
    const handlePhotoDragOver = (e, targetId = null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(targetId);
    };

    /**
     * Gère le drag leave
     */
    const handlePhotoDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
    };

    /**
     * Gère la sélection de fichier via input
     */
    const handlePhotoChange = async (e, target) => {
        const file = e.target.files?.[0];
        if (file) {
            await processAndSavePhoto(file, target);
        }
    };

    /**
     * Supprimer une photo
     */
    const deletePhoto = async (target) => {
        try {
            const { error } = await supabase
                .from(target.table || 'Eleve')
                .update({ photo_base64: null })
                .eq('id', target.id);

            if (error) throw error;

            toast.success('Photo supprimée');
            onUploadSuccess?.(null, target);

            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de la photo:', error);
            toast.error('Erreur lors de la suppression');
            return false;
        }
    };

    return {
        uploading,
        dragOver,
        processAndSavePhoto,
        handlePhotoDrop,
        handlePhotoDragOver,
        handlePhotoDragLeave,
        handlePhotoChange,
        deletePhoto
    };
}

export default usePhotoUpload;
