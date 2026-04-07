/**
 * Nom du module/fichier : ActivityTypesPanel.tsx
 * 
 * Données en entrée : 
 *   - activityTypes : Liste des types d'actions paramétrés.
 *   - loading : État de chargement.
 *   - onAdd, onEdit, onDelete : Fonctions de communication avec le serveur.
 * 
 * Données en sortie : 
 *   - Un panneau d'administration visuel (grille de cartes).
 *   - Déclenchement des actions de modification/suppression.
 * 
 * Objectif principal : Ce composant permet à l'utilisateur de configurer les "étiquettes" d'actions que les adultes effectuent en classe. C'est ici que l'on définit par exemple qu'un adulte peut faire de "l'Observation", du "Coaching" ou de la "Surveillance".
 */

import React, { useState } from 'react';
import { Activity, Plus, Edit, X, Save } from 'lucide-react';
import { ActivityType } from '../services/adultService';
import { Button, Avatar, EmptyState, ConfirmModal } from '../../../core';

interface ActivityTypesPanelProps {
    activityTypes: ActivityType[];
    loading: boolean;
    onAdd: (label: string) => Promise<boolean>;
    onEdit: (id: string, label: string) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
}

const ActivityTypesPanel: React.FC<ActivityTypesPanelProps> = ({
    activityTypes,
    loading,
    onAdd,
    onEdit,
    onDelete
}) => {
    // ÉTATS LOCAUX POUR LA GESTION DES FENÊTRES (MODALES)
    const [showModal, setShowModal] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentActivity, setCurrentActivity] = useState<Partial<ActivityType>>({ label: '' });
    const [activityToDelete, setActivityToDelete] = useState<ActivityType | null>(null);

    // Ouvre la fenêtre pour créer une nouvelle action
    const openAddModal = () => {
        setCurrentActivity({ label: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    // Ouvre la fenêtre pour modifier une action existante
    const openEditModal = (act: ActivityType) => {
        setCurrentActivity(act);
        setIsEditing(true);
        setShowModal(true);
    };

    // Envoi des données vers le serveur après validation du formulaire
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let success = false;
        if (isEditing && currentActivity.id) {
            success = await onEdit(currentActivity.id, currentActivity.label || '');
        } else {
            success = await onAdd(currentActivity.label || '');
        }
        if (success) setShowModal(false);
    };

    // Confirmation finale de la suppression
    const handleDeleteConfirm = async () => {
        if (activityToDelete) {
            await onDelete(activityToDelete.id);
            setActivityToDelete(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            {/* EN-TÊTE DU PANNEAU */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Activity className="text-primary" size={24} />
                        Types d'Actions Adultes
                    </h2>
                    <p className="text-xs text-grey-medium mt-1 font-medium">Configurez les types de suivi disponibles pour les adultes</p>
                </div>
                <Button
                    onClick={openAddModal}
                    variant="primary"
                    size="md"
                    icon={Plus}
                >
                    Nouveau type
                </Button>
            </div>

            {/* LISTE DES ACTIONS (GRILLE) */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background/20">
                {loading && activityTypes.length === 0 ? (
                    <div className="flex justify-center py-8">
                        <Avatar loading size="default" initials="" />
                    </div>
                ) : activityTypes.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title="Aucun type d'action"
                        description="Commencez par ajouter un type d'action pour le suivi des adultes."
                        size="md"
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activityTypes.map(act => (
                            <div key={act.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar
                                            size="sm"
                                            icon={Activity}
                                            className="bg-background text-primary"
                                        />
                                        <span className="font-bold text-sm text-text-main group-hover:text-primary transition-colors">{act.label}</span>
                                    </div>
                                    {/* Boutons d'édition/suppression apparaissant au survol */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEditModal(act)}
                                            className="p-2 text-grey-medium hover:text-primary transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => setActivityToDelete(act)}
                                            className="p-2 text-grey-medium hover:text-danger transition-colors"
                                            title="Supprimer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FENÊTRE FLOTTANTE (MODALE) DE SAISIE */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{isEditing ? 'Modifier le type' : 'Nouvelle action'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-grey-medium hover:text-white" title="Fermer"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Libellé</label>
                                <input required type="text" placeholder="Ex: Observation, Coaching..." value={currentActivity.label} onChange={(e) => setCurrentActivity({ ...currentActivity, label: e.target.value })} className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium">Annuler</button>
                                <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    <Save size={20} />
                                    {isEditing ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONFIRMATION DE SUPPRESSION */}
            <ConfirmModal
                isOpen={!!activityToDelete}
                onClose={() => setActivityToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le type ?"
                message={`Voulez-vous vraiment supprimer "${activityToDelete?.label}" ?`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />
        </div>
    );
};

export default ActivityTypesPanel;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ENTRÉE : Le composant reçoit la liste brute des types d'actions paramétrés.
 * 2. AFFICHAGE : Il génère une grille de "badges" éditables.
 * 3. INTERACTION : L'utilisateur clique sur "Nouveau type" ou sur l'icône de stylo pour ouvrir un formulaire de saisie.
 * 4. VALIDATION : En cliquant sur "Enregistrer", le composant appelle la fonction parente (onAdd ou onEdit) pour mettre à jour la base de données.
 */
