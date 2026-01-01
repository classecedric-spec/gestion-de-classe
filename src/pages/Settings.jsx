import React, { useState } from 'react';
import { Trash2, AlertTriangle, Check, Loader2, Database, Moon, Sun, Monitor } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { useTheme } from '../components/ThemeProvider';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import clsx from 'clsx';

const Settings = () => {
    const { theme, setTheme } = useTheme();
    const [isResetting, setIsResetting] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetStep, setResetStep] = useState(0); // 0: closed, 1: warning, 2: final confirmation
    const [modalMode, setModalMode] = useState('RESET'); // 'RESET' or 'TEST_DATA'
    const [confirmationText, setConfirmationText] = useState('');

    const initiateHardReset = () => {
        setModalMode('RESET');
        setShowResetModal(true);
        setResetStep(1);
        setConfirmationText('');
    };

    const initiateTestData = () => {
        setModalMode('TEST_DATA');
        setShowResetModal(true);
        setResetStep(1);
        setConfirmationText('');
    };

    const handleHardReset = async () => {
        setIsResetting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non connecté");

            // Delete order to respect FK constraints (though Cascade might handle some)
            // 1. Eleve (Students)
            // 2. Groupe (Groups)
            // 3. Activite, Module, Branche, SousDomaine (Curriculum)
            // 4. Classe (Classes)
            // 5. Niveau (Levels) - Assuming table exists or tracked separately.

            const tablesByUser = ['Groupe', 'Activite', 'Module', 'Branche', 'SousDomaine', 'Classe'];

            // Delete Students first (titulaire_id)
            const { error: errEleve } = await supabase.from('Eleve').delete().eq('titulaire_id', user.id);
            if (errEleve) throw errEleve;

            // Delete other tables
            for (const table of tablesByUser) {
                const { error } = await supabase.from(table).delete().eq('user_id', user.id);
                if (error) {
                    console.warn(`Error deleting from ${table}:`, error.message);
                    // Continue best effort or throw?
                }
            }

            // Try to delete Niveau if exists (Best effort)
            try {
                await supabase.from('Niveau').delete().eq('user_id', user.id);
            } catch (e) { /* ignore */ }

            toast.success("Base de données réinitialisée avec succès !");
            setShowResetModal(false);
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la réinitialisation : " + error.message);
        } finally {
            setIsResetting(false);
        }
    };

    const generateTestData = async () => {
        setIsResetting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non connecté");

            // 1. Create Classes
            const { data: classData, error: classError } = await supabase
                .from('Classe')
                .insert([
                    { nom: 'Classe A', acronyme: 'CLA', user_id: user.id },
                    { nom: 'Classe B', acronyme: 'CLB', user_id: user.id }
                ])
                .select();

            if (classError) throw classError;

            const classA = classData[0];
            const classB = classData[1];

            // 2. Create Groups/Levels if needed? Skip for simple test data.

            // 3. Create Students
            const students = [
                { prenom: 'Alice', nom: 'Dupont', sex: 'F', classe_id: classA.id, titulaire_id: user.id },
                { prenom: 'Bob', nom: 'Martin', sex: 'M', classe_id: classA.id, titulaire_id: user.id },
                { prenom: 'Charlie', nom: 'Durand', sex: 'M', classe_id: classB.id, titulaire_id: user.id },
                { prenom: 'Diana', nom: 'Lefebvre', sex: 'F', classe_id: classB.id, titulaire_id: user.id },
            ];

            const { error: studError } = await supabase.from('Eleve').insert(students);
            if (studError) throw studError;

            toast.success("Données de test générées !");
            setShowResetModal(false);
        } catch (error) {
            console.error(error);
            toast.error("Erreur génération : " + error.message);
        } finally {
            setIsResetting(false);
        }
    };

    const performAction = () => {
        if (modalMode === 'RESET') handleHardReset();
        else generateTestData();
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <section className="bg-danger/5 border border-danger/20 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-danger mb-2 flex items-center gap-2">
                    <AlertTriangle size={24} />
                    Zone de Danger
                </h2>
                <p className="text-grey-medium mb-6 text-sm">
                    Ces actions sont irréversibles. Faites attention.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={initiateHardReset}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 transition-all active:scale-95"
                    >
                        <Trash2 size={20} />
                        Supprimer toutes les données
                    </button>

                    <button
                        onClick={initiateTestData}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-surface hover:bg-surface/80 text-text-main border border-border/10 rounded-xl font-bold shadow-sm transition-all active:scale-95"
                    >
                        <Database size={20} />
                        Générer des données de test
                    </button>
                </div>
            </section>

            {/* CONFIRMATION MODAL */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-surface border border-border/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center space-y-6">

                            {/* Icon */}
                            <div className={clsx(
                                "w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl",
                                modalMode === 'RESET' ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                            )}>
                                {modalMode === 'RESET' ? <Trash2 size={40} /> : <Database size={40} />}
                            </div>

                            {/* Text */}
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-text-main">
                                    {modalMode === 'RESET' ? "Suppression Totale" : "Génération de Données"}
                                </h2>
                                <p className="text-grey-medium">
                                    {modalMode === 'RESET'
                                        ? "Attention ! Cette action supprimera TOUTES vos données (classes, élèves, notes...). Votre compte utilisateur sera conservé."
                                        : "Voulez-vous générer un jeu de données de test (Classes, Élèves) ?"}
                                </p>
                            </div>

                            {/* Additional Warning Step for Reset */}
                            {modalMode === 'RESET' && (
                                <div className="bg-danger/5 border border-danger/10 p-4 rounded-xl text-left">
                                    <p className="text-xs font-bold text-danger uppercase mb-1">Confirmation requise</p>
                                    <p className="text-sm text-grey-medium mb-3">Tapez <span className="font-mono font-bold text-text-main">RESET</span> pour confirmer.</p>
                                    <input
                                        type="text"
                                        placeholder="RESET"
                                        value={confirmationText}
                                        onChange={e => setConfirmationText(e.target.value)}
                                        className="w-full bg-input border border-border/10 rounded-lg px-3 py-2 text-text-main font-mono focus:outline-none focus:border-danger transition-colors"
                                    />
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setShowResetModal(false)}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={performAction}
                                    disabled={isResetting || (modalMode === 'RESET' && confirmationText !== 'RESET')}
                                    className={clsx(
                                        "flex-1",
                                        modalMode === 'RESET'
                                            ? "bg-danger hover:bg-danger/90 text-white"
                                            : "bg-primary hover:bg-primary/90 text-text-dark"
                                    )}
                                >
                                    {isResetting ? <Loader2 className="animate-spin" /> : "Confirmer"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
