/**
 * Nom du module/fichier : AppearanceSection.tsx
 * 
 * Données en entrée : 
 *   - Utilise le contexte `useTheme` pour connaître et changer le style visuel de l'appli.
 * 
 * Données en sortie : 
 *   - Changement immédiat de l'interface (couleurs, ombres, transparences).
 * 
 * Objectif principal : Permettre à l'enseignant de choisir l'ambiance visuelle qui lui convient le mieux. Que ce soit pour réduire la fatigue oculaire (Mode sombre) ou pour avoir un style moderne (Glass/Vision), cette section offre plusieurs "costumes" pour l'application.
 * 
 * Ce que ça gère : 
 *   - Une grille de boutons représentant les différents thèmes disponibles.
 *   - L'état "Actif" pour montrer quel thème est actuellement utilisé.
 *   - Le support du thème "Système" (qui suit les réglages de l'ordinateur/tablette).
 */

import React from 'react';
import { Palette, Sun, Moon, Sparkles, Monitor } from 'lucide-react';
import clsx from 'clsx';
// @ts-ignore
import { useTheme } from '../../../components/ThemeProvider';
import { Card } from '../../../core';

type Theme = 'default' | 'light' | 'dark' | 'neumo-2' | 'glass' | 'system';

/**
 * SECTION : Choix du thème visuel.
 */
export const AppearanceSection: React.FC = () => {
    // On récupère le thème actuel et la fonction pour le changer
    const { theme, setTheme } = useTheme();

    // Liste des thèmes proposés avec leurs icônes et noms
    const themes = [
        { id: 'default', label: 'Défaut', icon: Palette },
        { id: 'light', label: 'Clair', icon: Sun },
        { id: 'dark', label: 'Sombre', icon: Moon },
        { id: 'neumo-2', label: 'Neumorphisme', icon: Sparkles },
        { id: 'glass', label: 'Vision', icon: Sparkles },
        { id: 'system', label: 'Système', icon: Monitor },
    ];

    return (
        <Card variant="glass" className="p-6">
            {/* Titre de la section avec icône de palette */}
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <Palette size={20} className="text-primary" /> Apparence
            </h2>

            {/* Grille de sélection des thèmes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map((t) => {
                    const Icon = t.icon;
                    const isActive = theme === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id as Theme)}
                            className={clsx(
                                "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                                isActive
                                    ? "bg-primary/10 border-primary text-primary" // Style si sélectionné
                                    : "bg-white/5 border-white/10 text-grey-medium hover:text-white" // Style normal
                            )}
                        >
                            <Icon size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

/**
 * LOGIGRAMME DE CHANGEMENT DE THÈME :
 * 
 * 1. CONSULTATION -> L'utilisateur voit les différents thèmes.
 * 2. SÉLECTION -> L'utilisateur clique sur un bloc (ex: 'Sombre').
 * 3. MISE À JOUR -> La fonction `setTheme` est appelée.
 * 4. RÉPERCUSSION -> Le `ThemeProvider` (parent global) change les variables CSS de toute l'application.
 * 5. PERSISTANCE -> Le nouveau choix est mémorisé dans le navigateur pour la prochaine visite.
 */
