import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import {
    User, Mail, School, Camera, Save, Loader2,
    Moon, Sun, Monitor, Palette, AlertTriangle, Trash2, Database, Sparkles, Settings as SettingsIcon,
    Key, Feather, Smartphone, Cpu
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { resizeAndConvertToBase64 } from '../lib/imageUtils';
import { useTheme } from '../components/ThemeProvider';
import { toast } from 'sonner';
import clsx from 'clsx';

const Settings = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || 'systeme';

    const [activeTab, setActiveTab] = useState(initialTab);
    const { theme, setTheme } = useTheme();
    const { refreshProfile, pendingValidation } = useOutletContext() || {};

    // --- PROFILE STATE ---
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

    // --- SETTINGS STATE ---
    const [isResetting, setIsResetting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [updatingPassword, setUpdatingPassword] = useState(false);

    useEffect(() => {
        if (activeTab === 'profil') {
            getProfile();
        }
    }, [activeTab]);

    useEffect(() => {
        const tab = queryParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`/dashboard/settings?tab=${tabId}`, { replace: true });
    };

    // --- PROFILE LOGIC ---
    const getProfile = async () => {
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
        } finally {
            setLoadingProfile(false);
        }
    };

    const updateProfile = async (e) => {
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

            // If it was the first time, we might need a reload for the UI
            // but let's try just refreshing context first.
        } catch (error) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    };

    const processFile = async (file) => {
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
    };

    // --- SYSTEM LOGIC (Copied from Settings.jsx) ---
    const handleCheckAndFixProgressions = async () => {
        const toastId = toast.loading("Vérification des progressions...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            // 1. Fetch null/invalid progressions
            const { data: invalidProgs, error } = await supabase
                .from('Progression')
                .select('id, etat')
                .or('etat.is.null,etat.eq.""');

            if (error) throw error;

            if (!invalidProgs || invalidProgs.length === 0) {
                toast.success("Aucune progression invalide trouvée.", { id: toastId });
                return;
            }

            // 2. Fix them
            const { error: updateError } = await supabase
                .from('Progression')
                .update({ etat: 'a_commencer' })
                .in('id', invalidProgs.map(p => p.id));

            if (updateError) throw updateError;

            toast.success(`${invalidProgs.length} progression(s) corrigée(s) !`, { id: toastId });

        } catch (err) {
            toast.error("Erreur lors de la vérification.", { id: toastId });
        }
    };

    const handleGenerateDemoData = async () => {
        setIsGenerating(true);
        const toastId = toast.loading("Génération des données de test...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");
            const userId = user.id;

            // 1. Structure de Base: Niveaux
            const { data: levels, error: lErr } = await supabase.from('Niveau').insert([
                { nom: 'Niveau 1', ordre: 1, user_id: userId },
                { nom: 'Niveau 2', ordre: 2, user_id: userId }
            ]).select();
            if (lErr) throw lErr;
            const n1 = levels.find(l => l.nom === 'Niveau 1').id;
            const n2 = levels.find(l => l.nom === 'Niveau 2').id;

            // 1. Structure de Base: Classe
            const { data: classe, error: cErr } = await supabase.from('Classe').insert([
                { nom: 'Classe de test', user_id: userId }
            ]).select().single();
            if (cErr) throw cErr;
            const classeId = classe.id;

            // 1. Structure de Base: Groupes
            const { data: groups, error: gErr } = await supabase.from('Groupe').insert([
                { nom: 'Groupe A', acronyme: 'GA', user_id: userId, classe_id: classeId },
                { nom: 'Groupe B', acronyme: 'GB', user_id: userId, classe_id: classeId },
                { nom: 'Groupe AB', acronyme: 'GAB', user_id: userId, classe_id: classeId }
            ]).select();
            if (gErr) throw gErr;
            const gA = groups.find(g => g.nom === 'Groupe A').id;
            const gB = groups.find(g => g.nom === 'Groupe B').id;
            const gAB = groups.find(g => g.nom === 'Groupe AB').id;

            // 2. Les Élèves (Total : 22)
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

            // 3. Structure Pédagogique
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

            // 4. Modules et Activités simplified
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
    };

    const handleHardReset = async () => {
        setIsResetting(true);
        const resetToastId = toast.loading("Suppression des données...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            // 1. Logs and Linker tables (Foreign Key dependencies)
            // We use .not('id', 'is', null) to delete EVERYTHING authorized by RLS, 
            // even if user_id column is missing or null, provided the user has DELETE rights.
            await supabase.from('SuiviAdulte').delete().not('id', 'is', null);
            await supabase.from('Progression').delete().not('id', 'is', null);
            await supabase.from('Attendance').delete().not('id', 'is', null);
            await supabase.from('EleveGroupe').delete().not('id', 'is', null);
            await supabase.from('ActiviteNiveau').delete().not('id', 'is', null);
            await supabase.from('ActiviteMateriel').delete().not('id', 'is', null);

            // 2. Data tables
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

            // 3. Setup tables
            await supabase.from('TypeActiviteAdulte').delete().not('id', 'is', null);
            await supabase.from('Adulte').delete().not('id', 'is', null);
            await supabase.from('CategoriePresence').delete().not('id', 'is', null);
            await supabase.from('SetupPresence').delete().not('id', 'is', null);
            await supabase.from('TypeMateriel').delete().not('id', 'is', null);
            await supabase.from('UserPreference').delete().not('id', 'is', null);

            toast.success("Toutes les données autorisées ont été réinitialisées.", { id: resetToastId });
            setShowResetModal(false);
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            toast.error("Erreur lors de la réinitialisation: " + error.message, { id: resetToastId });
        } finally {
            setIsResetting(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Les nouveaux mots de passe ne correspondent pas.");
            return;
        }

        setUpdatingPassword(true);
        try {
            // Note: Supabase doesn't strictly require old password for update,
            // but we could implement a re-auth if needed. For now, we follow instructions.
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
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shrink-0 pl-16">
                {/* Space for Sidebar Toggle (LEFT) */}
                <div className="min-w-[200px]" />

                {/* TAB SELECTORS (CENTER) */}
                <div className="flex-1 flex justify-center">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-white/10 shadow-none">
                        <button
                            onClick={() => handleTabChange('systeme')}
                            className={clsx(
                                "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 shadow-none border-0 flex items-center gap-2",
                                activeTab === 'systeme' ? "bg-primary text-text-dark shadow-none" : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            <SettingsIcon size={16} /> Système
                        </button>
                        <button
                            onClick={() => handleTabChange('profil')}
                            className={clsx(
                                "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 shadow-none border-0 flex items-center gap-2",
                                activeTab === 'profil' ? "bg-primary text-text-dark shadow-none" : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            <User size={16} /> Profil
                        </button>
                    </div>
                </div>

                {/* EMPTY (RIGHT) - To balance the grid/flex layout if needed, or for future clock */}
                <div className="min-w-[200px] flex justify-end">
                    <p className="text-[10px] text-grey-dark uppercase tracking-widest font-black opacity-50">Configuration</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    <div className="animate-in fade-in duration-500">

                        {/* --- PROFIL TAB --- */}
                        {activeTab === 'profil' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                {loadingProfile ? (
                                    <div className="h-64 flex items-center justify-center bg-surface/30 rounded-2xl border border-white/5">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    </div>
                                ) : (
                                    <form onSubmit={updateProfile} className="bg-surface/30 backdrop-blur-sm border border-white/5 rounded-2xl p-8 shadow-xl space-y-8">
                                        {/* Avatar Section */}
                                        <div className="flex flex-col items-center gap-4">
                                            <div
                                                className={clsx(
                                                    "w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center relative group overflow-hidden shadow-xl transition-all",
                                                    isDragging ? "border-primary bg-primary/20 scale-105" : "bg-white/5 border-white/20",
                                                    profile.photo_base64 && "bg-[#D9B981]"
                                                )}
                                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
                                            >
                                                {profile.photo_base64 ? (
                                                    <img src={profile.photo_base64} alt="Avatar" className="w-[90%] h-[90%] object-contain rounded-full shadow-inner" />
                                                ) : (
                                                    <User size={48} className={isDragging ? "text-primary animate-bounce" : "text-grey-medium"} />
                                                )}
                                                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    <Camera className="text-white mb-2" size={32} />
                                                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">Modifier</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                                </label>
                                            </div>
                                            <p className="text-[10px] font-bold text-grey-medium uppercase tracking-wider">Photo de profil</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Prénom</label>
                                                <input
                                                    type="text"
                                                    value={profile.prenom}
                                                    onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-grey-dark"
                                                    placeholder="Votre prénom"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Nom</label>
                                                <input
                                                    type="text"
                                                    value={profile.nom}
                                                    onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-grey-dark"
                                                    placeholder="Votre nom"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                                                <Mail size={14} /> Email
                                            </label>
                                            <input type="email" value={profile.email} disabled className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-grey-dark cursor-not-allowed font-medium" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                                                <School size={14} /> Nom de l'école
                                            </label>
                                            <input
                                                type="text"
                                                value={profile.nom_ecole}
                                                onChange={(e) => setProfile({ ...profile, nom_ecole: e.target.value })}
                                                className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-grey-dark"
                                                placeholder="Ex: École Saint-Joseph"
                                            />
                                        </div>

                                        <div className="pt-4 flex justify-between items-center border-t border-white/5 mt-8">
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordModal(true)}
                                                className="text-xs text-primary hover:text-white transition-colors flex items-center gap-2 font-bold"
                                            >
                                                <Key size={14} /> Modifier le mot de passe
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={updatingProfile}
                                                className="px-8 py-3 bg-primary text-text-dark font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                                            >
                                                {updatingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                Enregistrer les modifications
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {pendingValidation && (
                                    <div className="flex items-center justify-center gap-3 p-5 bg-primary/10 border border-primary/20 rounded-2xl shadow-inner scale-in-fade duration-500">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                                        <p className="text-xs text-grey-light font-medium">
                                            <span className="font-black text-primary uppercase tracking-widest">En attente de validation : </span>
                                            Votre accès complet sera débloqué après validation de l'administrateur.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- SYSTEME TAB --- */}
                        {activeTab === 'systeme' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Apparence */}
                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                        <Palette size={20} className="text-primary" /> Apparence
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { id: 'default', label: 'Défaut', icon: Palette },
                                            { id: 'light', label: 'Clair', icon: Sun },
                                            { id: 'dark', label: 'Sombre', icon: Moon },
                                            { id: 'neumo-2', label: 'Neumorphisme', icon: Sparkles },
                                            { id: 'glass', label: 'Vision', icon: Sparkles },
                                            { id: 'system', label: 'Système', icon: Monitor },
                                        ].map(t => {
                                            const Icon = t.icon;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id)}
                                                    className={clsx(
                                                        "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                                                        theme === t.id ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/10 text-grey-medium hover:text-white"
                                                    )}
                                                >
                                                    <Icon size={24} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                        <Database size={20} className="text-primary" /> Environnement
                                    </h2>

                                    <div className="space-y-4">
                                        {/* Generation */}
                                        <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Générer des données de test</h3>
                                                <p className="text-xs text-grey-medium">Créez une classe fictive avec des élèves et des activités pour tester l'application.</p>
                                            </div>
                                            <button
                                                onClick={handleGenerateDemoData}
                                                disabled={isGenerating}
                                                className="w-full md:w-auto px-6 py-3 bg-primary text-text-dark font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                Générer
                                            </button>
                                        </div>

                                        {/* Repair */}
                                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Maintenance des Données</h3>
                                                <p className="text-xs text-grey-medium">Corrige les états de progression invalides ou manquants.</p>
                                            </div>
                                            <button
                                                onClick={handleCheckAndFixProgressions}
                                                className="w-full md:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <SettingsIcon size={16} />
                                                Réparer
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-danger/5 backdrop-blur-md border border-danger/10 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-danger mb-6 flex items-center gap-2">
                                        <AlertTriangle size={20} /> Zone de Danger
                                    </h2>
                                    <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Vider toutes les données</h3>
                                            <p className="text-xs text-grey-medium">Supprime définitivement vos élèves, classes et suivis. Cette action est irréversible.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowResetModal(true)}
                                            className="w-full md:w-auto px-6 py-3 bg-danger text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-danger/90 transition-all flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <Trash2 size={16} /> Réinitialiser
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Effacer toutes les données ?</h2>
                        <p className="text-xs text-grey-medium mb-8 leading-relaxed">
                            Cette action supprimera tout votre contenu sauf votre profil. Vous perdrez vos élèves, vos suivis et vos modules. C'est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-bold transition-all text-sm">Annuler</button>
                            <button onClick={handleHardReset} disabled={isResetting} className="flex-1 py-3 bg-danger text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                                {isResetting ? <Loader2 size={14} className="animate-spin" /> : "Tout effacer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Key size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white">Changer mon mot de passe</h2>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Ancien mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.oldPassword}
                                    onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.newPassword}
                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Confirmer le nouveau mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-bold transition-all text-sm"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingPassword}
                                    className="flex-1 py-3 bg-primary text-text-dark rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                                >
                                    {updatingPassword ? <Loader2 size={14} className="animate-spin" /> : "Mettre à jour"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
