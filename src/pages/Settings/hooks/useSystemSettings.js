import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            const { data: invalidProgs, error } = await supabase
                .from('Progression')
                .select('id, etat')
                .or('etat.is.null,etat.eq.""');

            if (error) throw error;

            if (!invalidProgs || invalidProgs.length === 0) {
                toast.success("Aucune progression invalide trouvée.", { id: toastId });
                return;
            }

            const { error: updateError } = await supabase
                .from('Progression')
                .update({ etat: 'a_commencer' })
                .in('id', invalidProgs.map(p => p.id));

            if (updateError) throw updateError;

            toast.success(`${invalidProgs.length} progression(s) corrigée(s) !`, { id: toastId });
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
            const userId = user.id;

            // 1. Niveaux
            const { data: levels, error: lErr } = await supabase.from('Niveau').insert([
                { nom: 'Niveau 1', ordre: 1, user_id: userId },
                { nom: 'Niveau 2', ordre: 2, user_id: userId }
            ]).select();
            if (lErr) throw lErr;
            const n1 = levels.find(l => l.nom === 'Niveau 1').id;
            const n2 = levels.find(l => l.nom === 'Niveau 2').id;

            // 2. Classe
            const { data: classe, error: cErr } = await supabase.from('Classe').insert([
                { nom: 'Classe de test', user_id: userId }
            ]).select().single();
            if (cErr) throw cErr;
            const classeId = classe.id;

            // 3. Groupes
            const { data: groups, error: gErr } = await supabase.from('Groupe').insert([
                { nom: 'Groupe A', acronyme: 'GA', user_id: userId, classe_id: classeId },
                { nom: 'Groupe B', acronyme: 'GB', user_id: userId, classe_id: classeId },
                { nom: 'Groupe AB', acronyme: 'GAB', user_id: userId, classe_id: classeId }
            ]).select();
            if (gErr) throw gErr;
            const gA = groups.find(g => g.nom === 'Groupe A').id;
            const gB = groups.find(g => g.nom === 'Groupe B').id;
            const gAB = groups.find(g => g.nom === 'Groupe AB').id;

            // 4. Élèves (22 au total)
            const studentsData = [];
            for (let i = 1; i <= 10; i++) {
                studentsData.push({
                    nom: `1.${i}`,
                    prenom: String.fromCharCode(64 + i),
                    niveau_id: n1,
                    classe_id: classeId,
                    titulaire_id: userId,
                    date_naissance: '2018-09-01'
                });
            }
            for (let i = 1; i <= 12; i++) {
                studentsData.push({
                    nom: `2.${i}`,
                    prenom: String.fromCharCode(76 + i),
                    niveau_id: n2,
                    classe_id: classeId,
                    titulaire_id: userId,
                    date_naissance: '2017-09-01'
                });
            }
            const { data: insertedStudents, error: sErr } = await supabase.from('Eleve').insert(studentsData).select();
            if (sErr) throw sErr;

            // Liens élèves-groupes
            const eleveGroupeLinks = [];
            insertedStudents.forEach(student => {
                const isN1 = student.nom.startsWith('1.');
                if (isN1) {
                    eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gA, user_id: userId });
                    eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gAB, user_id: userId });
                } else {
                    eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gB, user_id: userId });
                    eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gAB, user_id: userId });
                }
            });
            await supabase.from('EleveGroupe').insert(eleveGroupeLinks);

            // 5. Structure pédagogique
            const branchesConfig = [
                { nom: 'Français', subs: ['Lecture', 'Écriture', 'Grammaire'] },
                { nom: 'Mathématiques', subs: ['Numération', 'Géométrie', 'Calcul'] },
                { nom: 'Éveil', subs: ['Histoire', 'Géographie', 'Sciences'] }
            ];

            const allSubIds = [];
            for (const b of branchesConfig) {
                const { data: branch, error: bErr } = await supabase.from('Branche').insert({ nom: b.nom, user_id: userId }).select().single();
                if (bErr) throw bErr;
                for (const sName of b.subs) {
                    const { data: sub, error: sbErr } = await supabase.from('SousBranche').insert({ nom: sName, branche_id: branch.id, user_id: userId }).select().single();
                    if (sbErr) throw sbErr;
                    allSubIds.push(sub.id);
                }
            }

            // 6. Modules et activités
            const createModuleWithActivities = async (moduleName, subId, levelIds) => {
                const { data: mod } = await supabase.from('Module').insert({
                    nom: moduleName,
                    sous_branche_id: subId,
                    user_id: userId,
                    statut: 'en_cours'
                }).select().single();

                const activitiesToInsert = [1, 2, 3].map(i => ({
                    titre: `${moduleName} - Act ${i}`,
                    module_id: mod.id,
                    user_id: userId,
                    nombre_exercices: 10,
                    nombre_erreurs: 2,
                    statut_exigence: 'obligatoire'
                }));
                const { data: insertedActs } = await supabase.from('Activite').insert(activitiesToInsert).select();

                for (const act of insertedActs) {
                    const actLevels = levelIds.map(lId => ({
                        activite_id: act.id,
                        niveau_id: lId,
                        user_id: userId,
                        nombre_exercices: 10,
                        nombre_erreurs: 2,
                        statut_exigence: 'obligatoire'
                    }));
                    await supabase.from('ActiviteNiveau').insert(actLevels);

                    const relevantStudents = insertedStudents.filter(s => levelIds.includes(s.niveau_id));
                    const progressions = relevantStudents.map(s => ({
                        eleve_id: s.id,
                        activite_id: act.id,
                        etat: 'a_commencer',
                        user_id: userId
                    }));
                    if (progressions.length > 0) await supabase.from('Progression').insert(progressions);
                }
            };

            await createModuleWithActivities('Lecture Fondamentale', allSubIds[0], [n1]);
            await createModuleWithActivities('Calcul Avancé', allSubIds[5], [n2]);

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

            // Tables dans l'ordre des dépendances FK
            await supabase.from('SuiviAdulte').delete().not('id', 'is', null);
            await supabase.from('Progression').delete().not('id', 'is', null);
            await supabase.from('Attendance').delete().not('id', 'is', null);
            await supabase.from('EleveGroupe').delete().not('id', 'is', null);
            await supabase.from('ActiviteNiveau').delete().not('id', 'is', null);
            await supabase.from('ActiviteMateriel').delete().not('id', 'is', null);

            await supabase.from('Eleve').delete().not('id', 'is', null);
            await supabase.from('ClasseAdulte').delete().not('id', 'is', null);
            await supabase.from('Activite').delete().not('id', 'is', null);
            await supabase.from('Module').delete().not('id', 'is', null);
            await supabase.from('SousBranche').delete().not('id', 'is', null);
            await supabase.from('Branche').delete().not('id', 'is', null);
            await supabase.from('SousDomaine').delete().not('id', 'is', null);
            await supabase.from('Groupe').delete().not('id', 'is', null);
            await supabase.from('Classe').delete().not('id', 'is', null);
            await supabase.from('Niveau').delete().not('id', 'is', null);

            await supabase.from('TypeActiviteAdulte').delete().not('id', 'is', null);
            await supabase.from('Adulte').delete().not('id', 'is', null);
            await supabase.from('CategoriePresence').delete().not('id', 'is', null);
            await supabase.from('SetupPresence').delete().not('id', 'is', null);
            await supabase.from('TypeMateriel').delete().not('id', 'is', null);
            await supabase.from('UserPreference').delete().not('id', 'is', null);

            toast.success("Toutes les données ont été réinitialisées.", { id: resetToastId });
            setShowResetModal(false);
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            toast.error("Erreur lors de la réinitialisation: " + error.message, { id: resetToastId });
        } finally {
            setIsResetting(false);
        }
    }, []);

    // Change le mot de passe de l'utilisateur
    const handleChangePassword = useCallback(async (e) => {
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
        } catch (error) {
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
