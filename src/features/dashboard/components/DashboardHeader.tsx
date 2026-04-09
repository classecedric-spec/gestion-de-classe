/**
 * Nom du module/fichier : DashboardHeader.tsx
 * 
 * Données en entrée : 
 *   - userName : Le nom ou prénom de l'enseignant.
 *   - userEmail : L'adresse email (utilisée si le nom est manquant).
 *   - currentTab : L'onglet actuellement actif sur le tableau de bord.
 *   - searchQuery : Le texte saisi dans la barre de recherche.
 * 
 * Données en sortie : 
 *   - Affichage du message de bienvenue.
 *   - Barre d'onglets pour naviguer entre les différentes vues (Synthèse, Élèves, Courriers, etc.).
 *   - Champ de recherche pour filtrer les élèves.
 * 
 * Objectif principal : Créer l'en-tête dynamique du tableau de bord. C'est la première chose que l'enseignant voit : un accueil personnalisé et les outils de navigation pour passer d'une vue pédagogique à une autre (suivi des retards, travaux de classe, etc.).
 */

import React from 'react';
import { Search, LayoutList, Users, Mail, Home as HomeIcon, School, History } from 'lucide-react';
import { Tabs, Input } from '../../../core';

interface DashboardHeaderProps {
    userName: string | null;
    userEmail: string | null;
    currentTab: string;
    setCurrentTab: (tab: string) => void;
    showSearch: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSidebarOpen: boolean;
}

/**
 * Composant d'en-tête pour le tableau de bord principal.
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    userName,
    userEmail,
    currentTab,
    setCurrentTab,
    showSearch,
    searchQuery,
    setSearchQuery,
    isSidebarOpen
}) => {

    // Définition des onglets de navigation du Dashboard
    const tabs = [
        { id: 'overview', label: "Vue d'ensemble", icon: LayoutList },
        { id: 'students', label: 'Élèves', icon: Users },
        { id: 'avant-mail', label: 'Avant Mail', icon: Mail },
        { id: 'vue-retard', label: 'Vue Retard', icon: Mail },
        { id: 'travaux-domicile', label: 'Travaux à Doc', icon: HomeIcon },
        { id: 'travaux-classe', label: 'Travaux Classe', icon: School },
        { id: 'journal', label: 'Journal', icon: History }
    ];

    return (
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Partie Gauche : Message de Bienvenue et Recherche */}
            <div className="flex-1 flex items-center">
                {!isSidebarOpen && (
                    <h1 className="text-2xl font-black text-text-main uppercase tracking-tight leading-none animate-in fade-in pl-16">
                        {/* On affiche le prénom si dispo, sinon le début de l'email */}
                        {userName ? `Bonjour ${userName}` : (userEmail ? `Bonjour ${userEmail.split('@')[0]}` : 'Bienvenue')}
                    </h1>
                )}
                {showSearch && (
                    <div className="ml-4 w-full max-w-sm hidden md:block">
                        <Input
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e: any) => setSearchQuery(e.target.value)}
                            icon={Search}
                        />
                    </div>
                )}
            </div>

            {/* Partie Centrale : Barre d'Onglets (centrée sur les grands écrans) */}
            <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 md:z-10 overflow-x-auto no-scrollbar">
                <Tabs
                    tabs={tabs}
                    activeTab={currentTab}
                    onChange={setCurrentTab}
                    disableCompact={true}
                    smart
                />
            </div>

            {/* Espaceur pour l'équilibre visuel sur desktop */}
            <div className="hidden md:block flex-1"></div>
        </header>
    );
};

export default DashboardHeader;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CHARGEMENT : Le composant reçoit les infos de l'enseignant.
 * 2. AFFICHAGE : Il écrit "Bonjour [Prénom]" en haut à gauche.
 * 3. NAVIGATION : Si l'enseignant clique sur 'Élèves' dans la barre d'onglets, `setCurrentTab` est appelé.
 * 4. RECHERCHE : Si l'enseignant tape un nom dans la loupe, `setSearchQuery` met à jour le filtre global du Dashboard.
 * 5. ADAPTATION : Sur mobile, les onglets deviennent défilants horizontalement (`overflow-x-auto`).
 */
