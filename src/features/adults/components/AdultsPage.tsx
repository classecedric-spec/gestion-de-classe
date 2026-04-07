/**
 * Nom du module/fichier : AdultsPage.tsx
 * 
 * Données en entrée : 
 *   - Liste des adultes et types d'activités (via le hook useAdultsPageFlow).
 *   - États de recherche et de sélection.
 * 
 * Données en sortie : 
 *   - Interface interactive de gestion de l'équipe.
 *   - Formulaires de création/édition d'adultes et de types d'activités.
 * 
 * Objectif principal : Ce composant est la page principale pour gérer "l'humain" dans la classe, hors élèves. Il permet de lister, ajouter et modifier les membres de l'équipe pédagogique (ATSEM, AESH, etc.) ainsi que de définir les types d'actions qu'ils peuvent effectuer (Aide, Surveillance, etc.).
 */

import React from 'react';
import { Badge, EmptyState, Avatar, ListItem, CardInfo, CardList, CardTabs, ConfirmModal, Input, SearchBar, InfoSection, InfoRow } from '../../../core';
import { Users, Activity, Plus, BookOpen, Clock, ChevronDown, Save, X, ShieldCheck } from 'lucide-react';
import { useAdultsPageFlow } from '../hooks/useAdultsPageFlow';

export const AdultsPage: React.FC = () => {
    // RÉCUPÉRATION DE LA LOGIQUE MÉTIER
    // On extrait tous les états et fonctions du hook spécialisé pour garder ce composant purement visuel.
    const { states, actions } = useAdultsPageFlow();

    const {
        adultsHook,
        activityTypesHook,
        selectedAdult,
        activeTab,
        showAdultModal,
        isEditingAdult,
        currentAdultForm,
        adultToDelete,
        showActivityModal,
        isEditingActivity,
        currentActivityForm,
        activityToDelete,
        headerHeight,
        leftContentRef,
        rightContentRef
    } = states;

    const {
        setSelectedAdult,
        setActiveTab,
        setShowAdultModal,
        setCurrentAdultForm,
        setAdultToDelete,
        setShowActivityModal,
        setCurrentActivityForm,
        setActivityToDelete,
        handleOpenAddAdult,
        handleOpenEditAdult,
        handleAdultSubmit,
        handleDeleteAdultConfirm,
        handleOpenAddActivity,
        handleOpenEditActivity,
        handleActivitySubmit,
        handleDeleteActivityConfirm
    } = actions;

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* COLONNE GAUCHE : LISTE DES ADULTES (1/4 de la largeur) */}
            <div className="w-1/4 flex flex-col gap-6 h-full">
                {/* En-tête de la liste avec compteur */}
                <CardInfo ref={leftContentRef} height={headerHeight} contentClassName="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <Users size={24} className="text-primary" />
                            Adultes
                        </h2>
                        <Badge variant="primary" size="xs">
                            {adultsHook.filteredAdults.length} Total
                        </Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    {/* Barre de recherche d'adultes */}
                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher un adulte..."
                            value={adultsHook.searchTerm}
                            onChange={(e) => adultsHook.setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                {/* Liste cliquable des adultes */}
                <CardList
                    actionLabel="Nouvel Adulte"
                    onAction={handleOpenAddAdult}
                    actionIcon={Plus}
                >
                    {adultsHook.loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                            <Avatar size="lg" loading initials="" />
                            <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                        </div>
                    ) : adultsHook.filteredAdults.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="Aucun adulte"
                            description={adultsHook.searchTerm ? "Aucun adulte ne correspond." : "Commencez par ajouter un adulte."}
                            size="sm"
                        />
                    ) : (
                        <div className="space-y-1 flex-1">
                            {adultsHook.filteredAdults.map((adult) => (
                                <ListItem
                                    key={adult.id}
                                    id={adult.id}
                                    title={`${adult.prenom} ${adult.nom}`}
                                    subtitle={(adult as any).fonction}
                                    isSelected={selectedAdult?.id === adult.id}
                                    onClick={() => setSelectedAdult(adult)}
                                    onEdit={() => handleOpenEditAdult({ stopPropagation: () => { } } as any, adult)}
                                    onDelete={() => setAdultToDelete(adult)}
                                    avatar={{
                                        initials: `${adult.prenom?.[0]}${adult.nom?.[0]}`,
                                        className: "bg-surface"
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </CardList>
            </div>

            {/* COLONNE DROITE : DÉTAILS ET CONFIGURATION */}
            <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
                {!selectedAdult ? (
                    // État vide si aucun adulte n'est sélectionné
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={Users}
                            title="Sélectionnez un adulte"
                            description="Choisissez un adulte dans la liste pour voir les détails et types d'actions."
                            size="lg"
                        />
                    </div>
                ) : (
                    <>
                        {/* En-tête du profil sélectionné */}
                        <CardInfo ref={rightContentRef} height={headerHeight}>
                            <div className="flex gap-6 items-center">
                                <Avatar
                                    size="xl"
                                    initials={`${selectedAdult.prenom?.[0]}${selectedAdult.nom?.[0]}`}
                                    className="bg-surface"
                                />
                                <div className="min-w-0">
                                    <h1 className="text-cq-xl font-black text-text-main mb-1 tracking-tight truncate">{selectedAdult.prenom} {selectedAdult.nom}</h1>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="primary" size="sm" className="border border-secondary/20 text-secondary">
                                            {(selectedAdult as any).fonction || 'Adulte'}
                                        </Badge>
                                        <div className="w-1 h-1 rounded-full bg-grey-dark" />
                                        <p className="text-grey-medium text-sm font-medium">
                                            Équipe pédagogique
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardInfo>

                        {/* Onglets : Actions et Informations */}
                        <CardTabs
                            tabs={[
                                { id: 'types', label: "Types d'actions", icon: Activity },
                                { id: 'details', label: 'Informations', icon: BookOpen }
                            ]}
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as any)}
                            actionLabel={activeTab === 'types' ? "Nouveau type" : undefined}
                            onAction={activeTab === 'types' ? handleOpenAddActivity : undefined}
                            actionIcon={Plus}
                        >
                            {/* Onglet : Grille des types d'actions disponibles */}
                            {activeTab === 'types' ? (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto px-2 pt-2 custom-scrollbar">
                                        {activityTypesHook.loading ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                <Avatar size="lg" loading initials="" />
                                                <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                                            </div>
                                        ) : activityTypesHook.activityTypes.length === 0 ? (
                                            <EmptyState
                                                icon={Activity}
                                                title="Aucun type"
                                                description="Aucun type d'action configuré."
                                                size="md"
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {activityTypesHook.activityTypes.map(act => (
                                                    <ListItem
                                                        key={act.id}
                                                        id={act.id}
                                                        title={act.label}
                                                        avatar={{
                                                            icon: Activity,
                                                            className: "bg-background text-primary"
                                                        }}
                                                        onEdit={() => handleOpenEditActivity(act)}
                                                        onDelete={() => setActivityToDelete(act)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Onglet : Détails administratifs
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InfoSection title="Profil de l'Adulte">
                                        <InfoRow
                                            icon={Users}
                                            label="Nom complet"
                                            value={`${selectedAdult.prenom} ${selectedAdult.nom}`}
                                        />
                                        <InfoRow
                                            icon={ShieldCheck}
                                            label="Fonction"
                                            value={(selectedAdult as any).fonction || 'Non définie'}
                                        />
                                        <InfoRow
                                            icon={Clock}
                                            label="Membre depuis"
                                            value={selectedAdult.created_at ? new Date(selectedAdult.created_at).toLocaleDateString() : 'Non renseigné'}
                                        />
                                    </InfoSection>
                                </div>
                            )}
                        </CardTabs>
                    </>
                )}
            </div>

            {/* FENÊTRE MODALE : AJOUT / MODIFICATION D'UN ADULTE */}
            {showAdultModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{isEditingAdult ? 'Modifier l\'adulte' : 'Ajouter un adulte'}</h2>
                            <button onClick={() => setShowAdultModal(false)} className="text-grey-medium hover:text-white transition-colors" title="Fermer"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdultSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Prénom</label>
                                <Input required type="text" value={currentAdultForm.prenom} onChange={(e) => setCurrentAdultForm({ ...currentAdultForm, prenom: e.target.value })} className="bg-background/50 border-white/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Nom</label>
                                <Input required type="text" value={currentAdultForm.nom} onChange={(e) => setCurrentAdultForm({ ...currentAdultForm, nom: e.target.value })} className="bg-background/50 border-white/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Fonction</label>
                                <div className="relative group">
                                    <select
                                        title="Fonction de l'adulte"
                                        value={currentAdultForm.fonction}
                                        onChange={(e) => setCurrentAdultForm({ ...currentAdultForm, fonction: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer font-medium"
                                    >
                                        <option value="" className="bg-surface">Sélectionner une fonction...</option>
                                        <option value="Titulaire" className="bg-surface">Titulaire</option>
                                        <option value="AESH" className="bg-surface">AESH</option>
                                        <option value="ATSEM" className="bg-surface">ATSEM</option>
                                        <option value="Stagiaire" className="bg-surface">Stagiaire</option>
                                        <option value="Remplaçant" className="bg-surface">Remplaçant</option>
                                        <option value="Autre" className="bg-surface">Autre</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAdultModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors">Annuler</button>
                                <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all">
                                    <Save size={20} />
                                    {isEditingAdult ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE DE CONFIRMATION DE SUPPRESSION D'ADULTE */}
            <ConfirmModal
                isOpen={!!adultToDelete}
                onClose={() => setAdultToDelete(null)}
                onConfirm={handleDeleteAdultConfirm}
                title="Supprimer l'adulte ?"
                message={`Voulez-vous vraiment supprimer "${adultToDelete?.prenom} ${adultToDelete?.nom}" ?`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />

            {/* FENÊTRE MODALE : AJOUT / MODIFICATION D'UN TYPE D'ACTION */}
            {showActivityModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{isEditingActivity ? 'Modifier le type' : 'Nouvelle action'}</h2>
                            <button onClick={() => setShowActivityModal(false)} className="text-grey-medium hover:text-white transition-colors" title="Fermer"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleActivitySubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Libellé</label>
                                <Input required type="text" placeholder="Ex: Observation, Coaching..." value={currentActivityForm.label} onChange={(e) => setCurrentActivityForm({ ...currentActivityForm, label: e.target.value })} className="bg-background/50 border-white/10" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowActivityModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors">Annuler</button>
                                <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all">
                                    <Save size={20} />
                                    {isEditingActivity ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE DE CONFIRMATION DE SUPPRESSION DE TYPE D'ACTION */}
            <ConfirmModal
                isOpen={!!activityToDelete}
                onClose={() => setActivityToDelete(null)}
                onConfirm={handleDeleteActivityConfirm}
                title="Supprimer le type ?"
                message={`Voulez-vous vraiment supprimer "${activityToDelete?.label}" ?`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />
        </div>
    );
};

export default AdultsPage;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CHARGEMENT : La page récupère les listes d'adultes et d'actions via useAdultsPageFlow.
 * 2. RECHERCHE : L'utilisateur peut filtrer la liste de gauche en tapant un nom.
 * 3. SÉLECTION : Cliquer sur un adulte affiche son profil détaillé dans la colonne de droite.
 * 4. CONFIGURATION : Via l'onglet "Types d'actions", on définit ce que les adultes font en classe.
 * 5. SAUVEGARDE : Les modales permettent de créer/modifier ces données qui sont envoyées au serveur au clic sur "Enregistrer".
 */
