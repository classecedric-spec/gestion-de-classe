import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { resizeImage } from '../lib/imageUtils';
import { toast } from 'sonner';

export interface PhotoUploadOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    onUploadSuccess?: (resizedBase64: string | null, target: PhotoUploadTarget) => void;
}

export interface PhotoUploadTarget {
    id: string;
    table?: string;
}

/**
 * Hook personnalisé pour gérer l'upload de photos
 * Gère le drag & drop, la sélection de fichiers, le redimensionnement et l'upload
 */
export function usePhotoUpload(options: PhotoUploadOptions = {}) {
    const {
        maxWidth = 400,
        maxHeight = 400,
        quality = 0.8,
        onUploadSuccess
    } = options;

    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState<string | null>(null);

    /**
     * Traite et sauvegarde une photo
     * @param {File} file - Fichier image
     * @param {PhotoUploadTarget} target - Objet cible (ex: {id, table: 'Eleve'})
     */
    const processAndSavePhoto = async (file: File, target: PhotoUploadTarget): Promise<string | null> => {
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
                .from((target.table || 'Eleve') as any)
                .update({ photo_base64: resizedBase64 } as any)
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
    const handlePhotoDrop = async (e: React.DragEvent, target: PhotoUploadTarget) => {
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
    const handlePhotoDragOver = (e: React.DragEvent, targetId: string | null = null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(targetId);
    };

    /**
     * Gère le drag leave
     */
    const handlePhotoDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
    };

    /**
     * Gère la sélection de fichier via input
     */
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, target: PhotoUploadTarget) => {
        const file = e.target.files?.[0];
        if (file) {
            await processAndSavePhoto(file, target);
        }
    };

    /**
     * Supprimer une photo
     */
    const deletePhoto = async (target: PhotoUploadTarget): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from((target.table || 'Eleve') as any)
                .update({ photo_base64: null } as any)
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
