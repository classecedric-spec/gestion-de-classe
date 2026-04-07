/**
 * Nom du module/fichier : EnvironmentSection.tsx
 * 
 * Données en entrée : 
 *   - `handleGenerateDemoData` : Fonction pour créer des élèves et cours factices.
 *   - `isGenerating` : État de chargement durant la création.
 *   - `handleCheckAndFixProgressions` : Fonction de maintenance pour "réparer" les données.
 * 
 * Données en sortie : 
 *   - Déclenchement d'actions de maintenance ou de démonstration sur la base de données.
 * 
 * Objectif principal : Fournir des outils de "laboratoire" et de "secours" à l'enseignant. Soit pour découvrir l'application avec des données de test sans risque (Générer), soit pour corriger de petits bugs d'affichage ou de calcul dans les suivis d'élèves (Réparer).
 * 
 * Ce que ça gère : 
 *   - Le bouton de génération de données de démonstration.
 *   - Le bouton de maintenance préventive pour la base de données.
 */

import React from 'react';
import { Database, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { Card, Button } from '../../../core';

interface EnvironmentSectionProps {
    handleGenerateDemoData: () => void | Promise<void>;
    isGenerating: boolean;
    handleCheckAndFixProgressions: () => void | Promise<void>;
}

/**
 * SECTION : Outils d'administration et de maintenance.
 */
export const EnvironmentSection: React.FC<EnvironmentSectionProps> = ({
    handleGenerateDemoData,
    isGenerating,
    handleCheckAndFixProgressions
}) => {
    return (
        <Card variant="glass" className="p-6">
            {/* Titre de section avec icône de Base de données */}
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <Database size={20} className="text-primary" /> Environnement
            </h2>

            <div className="space-y-4">
                {/* BLOC 1 : Apprentissage (Données de test) */}
                <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Générer des données de test</h3>
                        <p className="text-xs text-grey-medium">Créez une classe fictive avec des élèves et des activités pour tester l'outil.</p>
                    </div>
                    <Button
                        onClick={handleGenerateDemoData}
                        loading={isGenerating}
                        icon={Sparkles}
                    >
                        Générer
                    </Button>
                </div>

                {/* BLOC 2 : Maintenance (Réparation) */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Maintenance des Données</h3>
                        <p className="text-xs text-grey-medium">Corrige les états de progression invalides ou les petits décalages de calcul.</p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleCheckAndFixProgressions}
                        icon={SettingsIcon}
                    >
                        Réparer
                    </Button>
                </div>
            </div>
        </Card>
    );
};

/**
 * LOGIGRAMME DE MAINTENANCE :
 * 
 * 1. BESOIN -> L'enseignant veut tester ou remarque un problème de calcul.
 * 2. ACTION -> Il clique sur "Générer" ou "Réparer".
 * 3. TRAITEMENT -> L'application communique avec le serveur (Supabase) pour effectuer les changements massifs.
 * 4. FEEDBACK -> Le bouton affiche un sablier pour indiquer que le travail est en cours.
 * 5. FIN -> Une fois terminé, l'interface se rafraîchit avec les nouvelles données saines.
 */
