/**
 * Nom du module/fichier : AdultColumnWrapper.tsx
 * 
 * Données en entrée : 
 *   - `adultActivities` : Liste des binômes "Adulte + Atelier" en cours dans la classe.
 *   - `allAdults`, `availableActivityTypes` : Listes des intervenants et types d'ateliers disponibles pour la sélection.
 *   - `currentAdultSelection`, `currentActivityTypeSelection` : L'adulte et l'atelier choisis temporairement dans la fenêtre d'ajout.
 *   - `loadingAdults` : État de chargement des données.
 * 
 * Données en sortie : 
 *   - Une colonne (la n°4 du dashboard) dédiée au suivi des adultes et aux actions interactives.
 * 
 * Objectif principal : Organiser l'occupation des adultes présents dans la classe (Enseignant, AESH, ATSEM, parent d'élève). Elle permet de savoir instantanément "qui fait quoi". Elle intègre aussi un bouton ludique "La Main Innocente" pour tirer un élève au sort.
 * 
 * Ce que ça affiche : 
 *   - Un grand bouton "La Main Innocente" violet pour ramener de l'équité dans le choix des élèves.
 *   - Un panneau listant les binômes adultes/ateliers avec la possibilité d'en ajouter ou d'en supprimer.
 */

import React from 'react';
import { Zap } from 'lucide-react';
import AdultTrackingPanel from '../../desktop/AdultTrackingPanel';

interface AdultColumnWrapperProps {
    adultActivities: any[];
    showAdultModal: boolean;
    allAdults: any[];
    availableActivityTypes: any[];
    currentAdultSelection: any;
    currentActivityTypeSelection: any;
    loadingAdults: boolean;
    // Actions utilisateur
    onOpenRandomPicker: () => void;
    onAddClick: () => void;
    onAdultChange: (adult: any) => void;
    onActivityChange: (type: any) => void;
    onSave: () => void;
    onDelete: (id: string) => void;
    onCloseModal: () => void;
}

/**
 * Conteneur pour la colonne de suivi des adultes et des outils interactifs (ex: Tirage au sort).
 */
export const AdultColumnWrapper: React.FC<AdultColumnWrapperProps> = ({
    adultActivities,
    showAdultModal,
    allAdults,
    availableActivityTypes,
    currentAdultSelection,
    currentActivityTypeSelection,
    loadingAdults,
    onOpenRandomPicker,
    onAddClick,
    onAdultChange,
    onActivityChange,
    onSave,
    onDelete,
    onCloseModal
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* BOUTON TIRAGE AU SORT (La Main Innocente) */}
            <div className="p-4 border-b border-white/5 shrink-0">
                <button
                    onClick={onOpenRandomPicker}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                >
                    <Zap size={18} />
                    <span>La Main Innocente</span>
                </button>
            </div>

            {/* PANNEAU DE SUIVI DES ADULTES : On délègue l'affichage au composant spécialisé */}
            <div className="flex-1 overflow-hidden">
                <AdultTrackingPanel
                    adultActivities={adultActivities}
                    showModal={showAdultModal}
                    allAdults={allAdults}
                    activityTypes={availableActivityTypes}
                    currentAdult={currentAdultSelection}
                    currentActivity={currentActivityTypeSelection}
                    loadingAdults={loadingAdults}
                    onAddClick={onAddClick}
                    onAdultChange={onAdultChange}
                    onActivityChange={onActivityChange}
                    onSave={onSave}
                    onDelete={onDelete}
                    onCloseModal={onCloseModal}
                />
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ARRIVÉE DES ADULTES : Une AESH entre dans la classe pour aider sur l'atelier de Maths.
 * 2. ACTION : L'enseignant clique sur le petit "+" dans cette colonne.
 * 3. SÉLECTION : Il choisit le nom de l'AESH et l'atelier "Maths - Numération".
 * 4. VALIDATION : Le binôme apparaît dans la liste. Toute l'équipe sait désormais quel adulte supervise quel atelier.
 * 5. TIRAGE AU SORT : Un exercice demande qu'un élève aille au tableau.
 * 6. ACTION : L'enseignant appuie sur "La Main Innocente".
 * 7. RÉSULTAT : Le visage d'un élève choisi au hasard s'affiche dans une animation féérique au centre de l'écran. 
 *    Cela calme instantanément les "C'est pas moi !" ou "C'est toujours les mêmes !".
 */
export default AdultColumnWrapper;
