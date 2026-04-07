/**
 * Nom du module/fichier : MobileFilterBar.tsx
 * 
 * Données en entrée : 
 *   - `students` : Liste des élèves disponibles pour le filtrage.
 *   - `modules` : Liste des chapitres/ateliers pour le filtrage thématique.
 *   - `selectedFilter`, `selectedModuleFilter` : Les filtres actuellement appliqués.
 *   - `onFilterChange`, `onModuleFilterChange` : Actions pour mettre à jour la vue mobile.
 * 
 * Données en sortie : 
 *   - Une barre d'outils flottante fixée en bas de l'écran sur mobile/tablette.
 * 
 * Objectif principal : Faciliter la navigation sur petit écran. En mode tablette (Kiosque ou Enseignant mobile), l'espace est limité. Cette barre permet de basculer rapidement entre "Voir un élève précis" et "Voir tous les élèves sur un atelier précis". C'est l'outil de recherche rapide de l'application mobile.
 * 
 * Ce que ça affiche : 
 *   - Un bouton d'inversion pour basculer entre le mode "Élève" et le mode "Module".
 *   - Une liste déroulante stylisée (Select) pour choisir l'élément à filtrer.
 *   - Un bouton "X" rouge pour annuler le filtre et revenir à la vue globale.
 */

import React, { useState } from 'react';
import { Users, ChevronDown, X, BookOpen, ArrowLeftRight } from 'lucide-react';

interface MobileFilterBarProps {
    students: {
        id: string;
        prenom: string | null;
        nom: string | null;
        Niveau?: { nom: string } | null;
    }[];
    modules: {
        id: string;
        nom: string;
    }[];
    selectedFilter: string | null;
    selectedModuleFilter: string | null;
    onFilterChange: (id: string | null) => void;
    onModuleFilterChange: (id: string | null) => void;
}

/**
 * Composant de filtrage optimisé pour le tactile (Tablettes/Smartphones).
 */
const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
    students,
    modules,
    selectedFilter,
    selectedModuleFilter,
    onFilterChange,
    onModuleFilterChange
}) => {
    // ÉTAT : On mémorise si l'enseignant cherche par élève ou par matière.
    const [mode, setMode] = useState<'student' | 'module'>(selectedModuleFilter ? 'module' : 'student');

    // Sécurité : si aucune donnée n'est chargée, on ne montre rien pour ne pas encombrer l'écran.
    if ((!students || students.length === 0) && (!modules || modules.length === 0)) return null;

    // PRÉPARATION : On groupe les élèves par niveau (ex: CP, CE1) pour que le menu déroulant soit lisible.
    const groupedStudents: Record<string, typeof students> = {};
    students.forEach(student => {
        const levelName = student.Niveau?.nom || 'Sans Niveau';
        if (!groupedStudents[levelName]) {
            groupedStudents[levelName] = [];
        }
        groupedStudents[levelName].push(student);
    });

    /** 
     * BASCULE : Change la thématique de recherche.
     */
    const handleModeToggle = () => {
        const newMode = mode === 'student' ? 'module' : 'student';
        setMode(newMode);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-white/5 z-30 pb-safe">
            <div className="flex items-center gap-2">
                {/* Bouton de permutation de mode (Élève <-> Module) */}
                <button
                    onClick={handleModeToggle}
                    className="w-11 h-11 bg-surface border border-white/10 rounded-xl flex items-center justify-center shrink-0 text-primary hover:bg-white/5 transition-colors"
                    title={mode === 'student' ? "Passer aux modules" : "Passer aux élèves"}
                >
                    <ArrowLeftRight size={18} />
                </button>

                <div className="relative flex-1">
                    {mode === 'student' ? (
                        <>
                            {/* MENU ÉLÈVES */}
                            <select
                                value={selectedFilter || ''}
                                onChange={(e) => onFilterChange(e.target.value || null)}
                                title="Filtrer par élève"
                                className="w-full bg-background border border-white/10 text-white rounded-xl py-3 pl-10 pr-8 appearance-none text-sm font-bold shadow-lg"
                            >
                                <option value="">Tous les élèves ({students.length})</option>
                                {Object.entries(groupedStudents).map(([level, levelStudents]) => (
                                    <optgroup key={level} label={level} className="bg-surface text-primary font-black uppercase text-[10px]">
                                        {levelStudents.map(student => (
                                            <option key={student.id} value={student.id} className="bg-background text-white text-sm py-1">
                                                {student.prenom} {student.nom}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={16} />
                        </>
                    ) : (
                        <>
                            {/* MENU MODULES */}
                            <select
                                value={selectedModuleFilter || ''}
                                onChange={(e) => onModuleFilterChange(e.target.value || null)}
                                title="Filtrer par module"
                                className="w-full bg-background border border-white/10 text-white rounded-xl py-3 pl-10 pr-8 appearance-none text-sm font-bold shadow-lg"
                            >
                                <option value="">Tous les modules ({modules.length})</option>
                                {modules.map(module => (
                                    <option key={module.id} value={module.id} className="bg-background text-white text-sm py-1">
                                        {module.nom}
                                    </option>
                                ))}
                            </select>
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={16} />
                        </>
                    )}
                    {/* Petite flèche visuelle pour indiquer que c'est une liste */}
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={14} />
                </div>

                {/* BOUTON ANNULER : Apparait seulement si un filtre est actif */}
                {(selectedFilter || selectedModuleFilter) && (
                    <button
                        onClick={() => {
                            onFilterChange(null);
                            onModuleFilterChange(null);
                        }}
                        title="Réinitialiser le filtre"
                        className="w-11 h-11 bg-danger text-white rounded-xl flex items-center justify-center shadow-lg border border-white/10 shrink-0"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default MobileFilterBar;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. SITUATION : L'enseignant utilise sa tablette pour faire le tour des tables.
 * 2. ACTION : Il veut voir uniquement où en est Lucas. Il clique sur le menu et choisit "Lucas".
 * 3. RÉSULTAT : Tous les autres élèves disparaissent de l'écran pour ne laisser que le parcours de Lucas.
 * 4. NOUVELLE ACTION : Il veut maintenant voir tous les élèves qui travaillent sur le module "Calcul mental".
 * 5. BASCULE : Il appuie sur le bouton "Inverser" (flèches). Le menu passe en mode "Modules".
 * 6. SÉLECTION : Il choisit "Calcul mental". 
 * 7. RÉSULTAT : L'écran affiche uniquement les fiches de progression liées au calcul mental pour toute la classe.
 * 8. FIN : Il appuie sur la croix "X" rouge pour retrouver la vue complète de sa classe.
 */
