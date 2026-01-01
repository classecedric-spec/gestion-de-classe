import React, { useState } from 'react';
import { Moon, Sun, Monitor, Palette, AlertTriangle, Trash2, Loader2, Database, Sparkles } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import clsx from 'clsx';

const Settings = () => {
    const { theme, setTheme } = useTheme();
    const [isResetting, setIsResetting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

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
            // Série 1 (10 élèves) : N1, Groupes A & AB
            for (let i = 1; i <= 10; i++) {
                studentsData.push({
                    nom: `1.${i}`,
                    prenom: String.fromCharCode(64 + i), // A, B, C... J
                    niveau_id: n1,
                    classe_id: classeId,
                    titulaire_id: userId,
                    date_naissance: '2018-09-01'
                });
            }
            // Série 2 (12 élèves) : N2, Groupes B & AB
            for (let i = 1; i <= 12; i++) {
                studentsData.push({
                    nom: `2.${i}`,
                    prenom: String.fromCharCode(76 + i), // M, N, O... X
                    niveau_id: n2,
                    classe_id: classeId,
                    titulaire_id: userId,
                    date_naissance: '2017-09-01'
                });
            }
            const { data: insertedStudents, error: sErr } = await supabase.from('Eleve').insert(studentsData).select();
            if (sErr) throw sErr;

            // Appartenance aux Groupes
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

            // 3. Structure Pédagogique (Branches et Sous-branches)
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

            // 4. Modules et Activités
            const createModuleWithActivities = async (moduleName, subId, levelIds) => {
                const { data: mod, error: mErr } = await supabase.from('Module').insert({
                    nom: moduleName,
                    sous_branche_id: subId,
                    user_id: userId,
                    statut: 'en_cours'
                }).select().single();
                if (mErr) throw mErr;

                const activitiesToInsert = [];
                for (let i = 1; i <= 3; i++) {
                    activitiesToInsert.push({
                        titre: `${moduleName} - Act ${i}`,
                        module_id: mod.id,
                        user_id: userId,
                        nombre_exercices: 10,
                        nombre_erreurs: 2,
                        statut_exigence: 'obligatoire'
                    });
                }
                const { data: insertedActs, error: actsErr } = await supabase.from('Activite').insert(activitiesToInsert).select();
                if (actsErr) throw actsErr;

                for (const act of insertedActs) {
                    // Liaison aux niveaux (ActiviteNiveau)
                    const actLevels = levelIds.map(lId => ({
                        activite_id: act.id,
                        niveau_id: lId,
                        user_id: userId,
                        nombre_exercices: 10,
                        nombre_erreurs: 2,
                        statut_exigence: 'obligatoire'
                    }));
                    await supabase.from('ActiviteNiveau').insert(actLevels);

                    // Liaison de suivi (Progression: À commencer)
                    const relevantStudents = insertedStudents.filter(s => levelIds.includes(s.niveau_id));
                    const progressions = relevantStudents.map(s => ({
                        eleve_id: s.id,
                        activite_id: act.id,
                        etat: 'a_commencer',
                        user_id: userId
                    }));
                    if (progressions.length > 0) {
                        await supabase.from('Progression').insert(progressions);
                    }
                }
            };

            // Exclusive Niveau 1 : 2 modules
            await createModuleWithActivities('Lecture Fondamentale', allSubIds[0], [n1]);
            await createModuleWithActivities('Écriture Débutant', allSubIds[1], [n1]);

            // Exclusive Niveau 2 : 2 modules
            await createModuleWithActivities('Calcul Avancé', allSubIds[5], [n2]);
            await createModuleWithActivities('Géométrie Spatiale', allSubIds[4], [n2]);

            // Mixte (Niveau 1 & 2) : 3 modules
            await createModuleWithActivities('Découverte Histoire', allSubIds[6], [n1, n2]);
            await createModuleWithActivities('Exploration Géo', allSubIds[7], [n1, n2]);
            await createModuleWithActivities('Sciences de la Vie', allSubIds[8], [n1, n2]);

            toast.success("Données de test générées avec succès !", { id: toastId });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error("Error during demo generation:", error);
            toast.error("Erreur lors de la génération des données.", { id: toastId });
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

            // Deletion order to respect foreign key constraints
            // 1. Junction tables and deepest children
            await supabase.from('Progression').delete().eq('user_id', user.id);
            await supabase.from('EleveGroupe').delete().eq('user_id', user.id);
            await supabase.from('ActiviteNiveau').delete().eq('user_id', user.id);

            // 2. Main data tables
            await supabase.from('TypeMateriel').delete().eq('user_id', user.id);
            await supabase.from('Eleve').delete().eq('titulaire_id', user.id);
            await supabase.from('Activite').delete().eq('user_id', user.id);
            await supabase.from('Module').delete().eq('user_id', user.id);
            await supabase.from('SousBranche').delete().eq('user_id', user.id);
            await supabase.from('Branche').delete().eq('user_id', user.id);
            await supabase.from('Groupe').delete().eq('user_id', user.id);
            await supabase.from('Classe').delete().eq('user_id', user.id);
            await supabase.from('Niveau').delete().eq('user_id', user.id);

            toast.success("Toutes vos données ont été supprimées avec succès.", { id: resetToastId });
            setShowResetModal(false);

            // Refresh the app to clear UI state
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error("Error during hard reset:", error);
            toast.error("Une erreur est survenue lors de la suppression des données.", { id: resetToastId });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-text-main mb-2">Paramètres</h1>
                <p className="text-grey-medium">Gérez vos préférences et vos données.</p>
            </div>

            {/* THEME SETTINGS */}
            <section className="bg-surface/80 border border-border/10 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <h2 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
                    <Sun size={24} className="text-primary" />
                    Apparence
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => setTheme('default')}
                        className={clsx(
                            "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                            theme === 'default'
                                ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/50"
                                : "bg-input border-border/10 text-grey-medium hover:text-text-main hover:bg-input/80"
                        )}
                    >
                        <Palette size={32} />
                        <span className="font-bold">Défaut</span>
                    </button>

                    <button
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                            theme === 'light'
                                ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/50"
                                : "bg-input border-border/10 text-grey-medium hover:text-text-main hover:bg-input/80"
                        )}
                    >
                        <Sun size={32} />
                        <span className="font-bold">Clair</span>
                    </button>

                    <button
                        onClick={() => setTheme('dark')}
                        className={clsx(
                            "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                            theme === 'dark'
                                ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/50"
                                : "bg-input border-border/10 text-grey-medium hover:text-text-main hover:bg-input/80"
                        )}
                    >
                        <Moon size={32} />
                        <span className="font-bold">Sombre</span>
                    </button>

                    <button
                        onClick={() => setTheme('system')}
                        className={clsx(
                            "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                            theme === 'system'
                                ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/50"
                                : "bg-input border-border/10 text-grey-medium hover:text-text-main hover:bg-input/80"
                        )}
                    >
                        <Monitor size={32} />
                        <span className="font-bold">Système</span>
                    </button>
                </div>
            </section>

            {/* DANGER ZONE */}
            <section className="bg-danger/5 border border-danger/20 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <h2 className="text-xl font-bold text-danger mb-6 flex items-center gap-2">
                    <AlertTriangle size={24} />
                    Zone de Danger
                </h2>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-danger/5 rounded-xl border border-danger/10">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-main mb-1">Réinitialiser le compte</h3>
                        <p className="text-sm text-grey-medium">
                            Supprime définitivement toutes vos classes, élèves, modules, branches et progressions.
                            Votre compte utilisateur sera conservé.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowResetModal(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-danger hover:bg-danger/90 text-white font-bold rounded-xl shadow-lg shadow-danger/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Trash2 size={20} className="group-hover:rotate-12 transition-transform" />
                        Réinitialiser toutes les données
                    </button>
                </div>
            </section>

            {/* DEMO DATA SECTION */}
            <section className="bg-surface/80 border border-border/10 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                <h2 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
                    <Database size={24} className="text-primary" />
                    Données de démonstration
                </h2>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-main mb-1">Générer les données de test</h3>
                        <p className="text-sm text-grey-medium">
                            Peuplez instantanément votre environnement avec une classe de test, 22 élèves, des groupes, des branches et des activités.
                            Idéal pour découvrir les fonctionnalités de l'application.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateDemoData}
                        disabled={isGenerating}
                        className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-text-dark font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="group-hover:scale-110 transition-transform" />}
                        Générer les données de test
                    </button>
                </div>
            </section>

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-text-main mb-4">Attention, êtes-vous sûr de vouloir tout effacer ?</h2>
                        <p className="text-grey-medium mb-8">
                            Cette action est <span className="text-danger font-bold italic">irréversible</span>.
                            Toutes vos données (élèves, classes, modules, exercices, etc.) seront définitivement supprimées.
                            Seul votre profil utilisateur sera conservé.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-text-main rounded-xl font-bold transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleHardReset}
                                disabled={isResetting}
                                className="flex-1 py-4 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isResetting ? <Loader2 className="animate-spin" size={20} /> : "Oui, tout effacer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Settings;
