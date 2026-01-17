import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { resizeAndConvertToBase64 } from '../../../lib/imageUtils';
import { toast } from 'sonner';

/**
 * useProfileSettings
 * 
 * Hook pour gérer les paramètres du profil utilisateur :
 * - Chargement du profil
 * - Mise à jour du profil
 * - Upload de photo
 */
export const useProfileSettings = (refreshProfile) => {
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [profile, setProfile] = useState({
        email: '',
        nom: '',
        prenom: '',
        nom_ecole: '',
        photo_base64: ''
    });
    const [isDragging, setIsDragging] = useState(false);

    // Charge le profil depuis Supabase
    const getProfile = useCallback(async () => {
        try {
            setLoadingProfile(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('CompteUtilisateur')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (data) {
                setProfile({
                    email: user.email,
                    nom: data.nom || '',
                    prenom: data.prenom || '',
                    nom_ecole: data.nom_ecole || '',
                    photo_base64: data.photo_base64 || ''
                });
            } else {
                setProfile(prev => ({ ...prev, email: user.email }));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoadingProfile(false);
        }
    }, []);

    // Met à jour le profil dans Supabase
    const updateProfile = useCallback(async (e) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non trouvé');

            const updates = {
                id: user.id,
                nom: profile.nom,
                prenom: profile.prenom,
                nom_ecole: profile.nom_ecole,
                photo_base64: profile.photo_base64,
            };

            const { error } = await supabase.from('CompteUtilisateur').upsert(updates);
            if (error) throw error;

            toast.success("Profil mis à jour");
            if (refreshProfile) refreshProfile();
        } catch (error) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setUpdatingProfile(false);
        }
    }, [profile, refreshProfile]);

    // Traite un fichier image pour l'ajouter au profil
    const processFile = useCallback(async (file) => {
        if (file && (file.type.startsWith('image/'))) {
            try {
                const base64 = await resizeAndConvertToBase64(file, 200, 200);
                setProfile(prev => ({ ...prev, photo_base64: base64 }));
            } catch (err) {
                toast.error("Erreur lors du traitement de l'image");
            }
        } else {
            toast.error("Format non supporté.");
        }
    }, []);

    // Gère le changement de fichier depuis l'input
    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    }, [processFile]);

    return {
        profile,
        setProfile,
        loadingProfile,
        updatingProfile,
        isDragging,
        setIsDragging,
        getProfile,
        updateProfile,
        handleFileChange,
        processFile
    };
};
