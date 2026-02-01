import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { toast } from 'sonner';
import { systemService } from '../../../features/system/services/systemService';

/**
 * useSystemSettings
 * 
 * Hook pour les opérations système :
 * - Vérification/réparation des progressions
 * - Génération de données de démo
 * - Réinitialisation complète (hard reset)
 * - Changement de mot de passe
 */
export const useSystemSettings = () => {
    const [isResetting, setIsResetting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Vérifie et corrige les progressions invalides (null ou vides)
    const handleCheckAndFixProgressions = useCallback(async () => {
        const toastId = toast.loading("Vérification des progressions...");
        try {
            const count = await systemService.checkAndFixProgressions();

            if (count === 0) {
                toast.success("Aucune progression invalide trouvée.", { id: toastId });
                return;
            }

            toast.success(`${count} progression(s) corrigée(s) !`, { id: toastId });
        } catch (err) {
            toast.error("Erreur lors de la vérification.", { id: toastId });
        }
    }, []);

    // Génère des données de démonstration pour tester l'application
    const handleGenerateDemoData = useCallback(async () => {
        setIsGenerating(true);
        const toastId = toast.loading("Génération des données de test...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            await systemService.generateDemoData(user.id);

            toast.success("Données de test générées !", { id: toastId });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error("Erreur génération.", { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    }, []);

    // Supprime toutes les données de l'utilisateur
    const handleHardReset = useCallback(async () => {
        setIsResetting(true);
        const resetToastId = toast.loading("Suppression des données...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            await systemService.hardReset(user.id);

            toast.success("Toutes les données ont été réinitialisées.", { id: resetToastId });
            setShowResetModal(false);
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
            toast.error("Erreur lors de la réinitialisation: " + error.message, { id: resetToastId });
        } finally {
            setIsResetting(false);
        }
    }, []);

    // Change le mot de passe de l'utilisateur
    const handleChangePassword = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Les nouveaux mots de passe ne correspondent pas.");
            return;
        }

        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            toast.success("Mot de passe mis à jour avec succès");
            setShowPasswordModal(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error("Erreur: " + error.message);
        } finally {
            setUpdatingPassword(false);
        }
    }, [passwordData]);

    return {
        isResetting,
        isGenerating,
        showResetModal,
        setShowResetModal,
        showPasswordModal,
        setShowPasswordModal,
        passwordData,
        setPasswordData,
        updatingPassword,
        handleCheckAndFixProgressions,
        handleGenerateDemoData,
        handleHardReset,
        handleChangePassword
    };
};
