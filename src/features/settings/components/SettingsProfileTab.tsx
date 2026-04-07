/**
 * Nom du module/fichier : SettingsProfileTab.tsx
 * 
 * Données en entrée : 
 *   - `profile` : Objet contenant les infos de l'utilisateur (nom, prénom, photo, école).
 *   - `setProfile` : Fonction pour modifier localement les infos avant enregistrement.
 *   - `updateProfile` : Fonction qui déclenche la sauvegarde réelle en base de données.
 * 
 * Données en sortie : 
 *   - Mise à jour du profil enseignant.
 *   - Changement sécurisé du mot de passe.
 * 
 * Objectif principal : Offrir à l'enseignant un espace pour gérer son identité numérique au sein de l'application. Il peut y changer sa photo de profil, corriger son nom, renseigner le nom de son école et modifier son mot de passe. C'est la "carte d'identité" de l'utilisateur.
 * 
 * Ce que ça gère : 
 *   - Le téléchargement et le redimensionnement de la photo de profil.
 *   - Le formulaire de saisie des informations personnelles.
 *   - La modale sécurisée pour le changement de mot de passe (vérification de l'ancien mot de passe).
 *   - L'affichage d'un message si le compte est en attente de validation par un admin.
 */

import React from 'react';
import { User, Mail, School, Key, Save, Loader2 } from 'lucide-react';
import { Card, Button, Input, ImageUpload } from '../../../core';

import { useSystemSettings } from '../hooks/useSystemSettings';

interface SettingsProfileTabProps {
    profile: any;
    setProfile: React.Dispatch<React.SetStateAction<any>>;
    loadingProfile: boolean;
    updatingProfile: boolean;
    updateProfile: (e: React.FormEvent) => Promise<void>;
    pendingValidation?: boolean;
}

/**
 * COMPOSANT : Onglet Profil Enseignant.
 */
export const SettingsProfileTab: React.FC<SettingsProfileTabProps> = ({
    profile,
    setProfile,
    loadingProfile,
    updatingProfile,
    updateProfile,
    pendingValidation,
}) => {
    // Gestion de la logique spécifique au mot de passe (via un hook dédié)
    const {
        showPasswordModal,
        setShowPasswordModal,
        passwordData,
        setPasswordData,
        updatingPassword,
        handleChangePassword
    } = useSystemSettings();

    // Affichage d'un sablier si le profil est encore en cours de lecture
    if (loadingProfile) {
        return (
            <div className="h-64 flex items-center justify-center bg-surface/30 rounded-2xl border border-white/5">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <Card variant="glass" className="p-8">
                <form onSubmit={updateProfile} className="space-y-8">
                    {/* SECTION : Photo de profil (Drag & Drop) */}
                    <div className="flex flex-col items-center gap-4">
                        <ImageUpload
                            value={profile.photo_url || profile.photo_base64 || ''}
                            onChange={(v) => {
                                // On gère soit une URL web soit une image encodée (base64)
                                if (v.startsWith('http')) {
                                    setProfile((prev: any) => ({ ...prev, photo_url: v, photo_base64: '' }));
                                } else {
                                    setProfile((prev: any) => ({ ...prev, photo_base64: v, photo_url: '' }));
                                }
                            }}
                            label="Photo de profil"
                            placeholderIcon={User}
                            storagePath={`users/${profile.id}/avatar.jpg`}
                            className="w-full max-w-[200px]"
                        />
                    </div>

                    {/* SECTION : Identité (Prénom et Nom) */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Prénom</label>
                            <Input
                                type="text"
                                value={profile.prenom || ''}
                                onChange={(e) => setProfile((prev: any) => ({ ...prev, prenom: e.target.value }))}
                                placeholder="Votre prénom"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Nom</label>
                            <Input
                                type="text"
                                value={profile.nom || ''}
                                onChange={(e) => setProfile((prev: any) => ({ ...prev, nom: e.target.value }))}
                                placeholder="Votre nom"
                            />
                        </div>
                    </div>

                    {/* SECTION : Contact (Email bloqué car sert d'identifiant) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                            <Mail size={14} /> Email
                        </label>
                        <Input
                            type="email"
                            value={profile.email || ''}
                            disabled
                            className="cursor-not-allowed opacity-60"
                            title="Email (non modifiable)"
                        />
                    </div>

                    {/* SECTION : Établissement scolaire */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                            <School size={14} /> Nom de l'école
                        </label>
                        <Input
                            type="text"
                            value={profile.nom_ecole || ''}
                            onChange={(e) => setProfile((prev: any) => ({ ...prev, nom_ecole: e.target.value }))}
                            placeholder="Ex: École Saint-Joseph"
                        />
                    </div>

                    {/* ACTIONS : Changement de mot de passe et Sauvegarde */}
                    <div className="pt-4 flex justify-between items-center border-t border-white/5 mt-8">
                        <button
                            type="button"
                            onClick={() => setShowPasswordModal(true)}
                            className="text-xs text-primary hover:text-white transition-colors flex items-center gap-2 font-bold"
                        >
                            <Key size={14} /> Modifier le mot de passe
                        </button>

                        <Button
                            type="submit"
                            loading={updatingProfile}
                            icon={Save}
                        >
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </Card>

            {/* FENÊTRE SURGISSANTE : Changement de mot de passe */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="text-center mb-6">
                            <Key size={48} className="mx-auto text-primary mb-4" />
                            <h2 className="text-xl font-bold text-white">Changer mon mot de passe</h2>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <Input
                                type="password"
                                required
                                value={passwordData.oldPassword}
                                onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                placeholder="Ancien mot de passe"
                            />
                            <Input
                                type="password"
                                required
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="Nouveau mot de passe"
                            />
                            <Input
                                type="password"
                                required
                                value={passwordData.confirmPassword}
                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="Confirmer mot de passe"
                            />
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="flex-1"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    loading={updatingPassword}
                                    className="flex-1"
                                >
                                    Mettre à jour
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MESSAGE D'ALERTE : Si accès restreint */}
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
    );
};

export default SettingsProfileTab;

/**
 * LOGIGRAMME DE MISE À JOUR :
 * 
 * 1. CHARGEMENT -> L'écran affiche les données actuelles du profil depuis Supabase.
 * 2. ÉDITION -> L'enseignant modifie un champ (ex: changer d'école) ou sa photo.
 * 3. VALIDATION -> Au clic sur "Enregistrer", le composant appelle `updateProfile`.
 * 4. FEEDBACK -> Durant la sauvegarde, le bouton affiche un chargement pour rassurer l'utilisateur.
 * 5. CONFIRMATION -> Une notification (toast) informe de la réussite de l'opération.
 */
