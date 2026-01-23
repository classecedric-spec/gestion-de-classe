import { useState } from 'react';
import { supabase } from '../lib/database';
import { resizeImage } from '../lib/imageUtils';
import { toast } from 'sonner';

export interface PhotoUploadOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    bucket?: string;
    onUploadSuccess?: (photoUrl: string | null, target: PhotoUploadTarget) => void;
}

export interface PhotoUploadTarget {
    id: string;
    table?: string;
    folder?: string;
}

/**
 * Uploads a base64 image to Supabase Storage and returns the public URL
 * @param base64Data - The base64 encoded image data
 * @param bucket - The storage bucket name
 * @param folder - The folder path within the bucket
 * @param entityId - The entity ID for unique filename
 * @returns The public URL of the uploaded image, or null on failure
 */
const uploadToStorage = async (
    base64Data: string,
    bucket: string,
    folder: string,
    entityId: string
): Promise<string | null> => {
    try {
        // Convert base64 to Blob
        const response = await fetch(base64Data);
        const blob = await response.blob();

        const fileName = `${folder}/${entityId}_${Date.now()}.jpg`;
        const { error } = await supabase.storage
            .from(bucket)
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) {
            console.error('Storage upload error:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (e) {
        console.error('Error uploading to storage:', e);
        return null;
    }
};

/**
 * Hook personnalisé pour gérer l'upload de photos vers Supabase Storage
 * Gère le drag & drop, la sélection de fichiers, le redimensionnement et l'upload
 */
export function usePhotoUpload(options: PhotoUploadOptions = {}) {
    const {
        maxWidth = 400,
        maxHeight = 400,
        quality = 0.8,
        bucket = 'photos',
        onUploadSuccess
    } = options;

    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState<string | null>(null);

    /**
     * Traite et sauvegarde une photo vers Supabase Storage
     * @param file - Fichier image
     * @param target - Objet cible (ex: {id, table: 'Eleve', folder: 'eleve'})
     * @returns L'URL publique de la photo uploadée
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

            // Déterminer le dossier de stockage
            const folder = target.folder || target.table?.toLowerCase() || 'general';

            // Uploader vers Supabase Storage
            const photoUrl = await uploadToStorage(resizedBase64, bucket, folder, target.id);

            if (!photoUrl) {
                throw new Error('Upload failed');
            }

            // Mettre à jour dans la base de données avec l'URL
            const { error } = await supabase
                .from((target.table || 'Eleve') as any)
                .update({ photo_url: photoUrl } as any)
                .eq('id', target.id);

            if (error) throw error;

            toast.success('Photo mise à jour avec succès');
            onUploadSuccess?.(photoUrl, target);

            return photoUrl;
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
     * Supprimer une photo (met l'URL à null en DB)
     * Note: Ne supprime pas le fichier du Storage pour éviter les liens cassés
     */
    const deletePhoto = async (target: PhotoUploadTarget): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from((target.table || 'Eleve') as any)
                .update({ photo_url: null } as any)
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
