/**
 * Nom du module/fichier : MandatoryActivitiesModal.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Commande l'ouverture de la fenêtre.
 *   - `levels` : Liste des niveaux de la classe (ex: CP, CE1).
 *   - `availableModules` : Liste des chapitres disponibles pour ce niveau.
 *   - `mandatoryModules` : Liste des modules déjà marqués comme obligatoires.
 *   - `onToggle` : Action pour cocher/décocher un module comme obligatoire.
 * 
 * Données en sortie : 
 *   - Une grande fenêtre de sélection (modale) permettant de définir les objectifs du jour.
 * 
 * Objectif principal : Servir d'interface de configuration pour les priorités de la classe. L'enseignant choisit ici quels ateliers sont "le passage obligé" pour ses élèves. Cela alimente ensuite la barre de progression globale du panneau `MandatoryActivitiesPanel`.
 * 
 * Ce que ça affiche : 
 *   - Un menu déroulant pour choisir le niveau scolaire.
 *   - Une liste de modules avec des cases à cocher.
 *   - Le pourcentage de réussite actuel pour chaque module pour aider l'enseignant dans son choix.
 */

import React from 'react';
import { X, Check, Layers, ChevronDown, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Level, MandatoryModuleReference } from '../../hooks/useMandatoryActivities';

interface MandatoryActivitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    levels: Level[];
    selectedLevelId: string;
    onLevelChange: (levelId: string) => void;
    availableModules: any[]; 
    mandatoryModules: MandatoryModuleReference[];
    onToggle: (moduleId: string, levelId: string) => void;
    loading?: boolean;
}

/**
 * Fenêtre de sélection des modules obligatoires par niveau.
 */
const MandatoryActivitiesModal: React.FC<MandatoryActivitiesModalProps> = ({
    isOpen,
    onClose,
    levels,
    selectedLevelId,
    onLevelChange,
    availableModules,
    mandatoryModules,
    onToggle,
    loading
}) => {
    // Si la fenêtre ne doit pas être affichée, on s'arrête là.
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-surface border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* EN-TÊTE : Titre et bouton de fermeture */}
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <Layers className="text-primary" />
                        Modules Obligatoires
                    </h2>
                    <button onClick={onClose} className="text-grey-medium hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-hidden flex flex-col">
                    {/* SÉLECTION DU NIVEAU : Menu déroulant pour filtrer les modules */}
                    <div className="space-y-2 shrink-0">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium ml-1 text-primary">Niveau</label>
                        <div className="relative group">
                            <select
                                value={selectedLevelId}
                                onChange={(e) => onLevelChange(e.target.value)}
                                className="w-full bg-surface/40 border border-white/10 rounded-xl px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-text-main appearance-none focus:outline-none focus:border-primary/50 transition-all cursor-pointer hover:bg-surface/60 group-hover:border-primary/30"
                            >
                                <option value="" disabled>Sélectionner un niveau...</option>
                                {levels.map(lvl => (
                                    <option key={lvl.id} value={lvl.id}>{lvl.nom}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none group-hover:text-primary transition-colors">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    {/* LISTE DES MODULES : On affiche les chapitres que l'enseignant peut rendre obligatoires */}
                    <div className="flex-1 overflow-y-auto px-1 space-y-2 custom-scrollbar pr-2">
                        {!selectedLevelId ? (
                            // Message d'attente si aucun niveau n'est choisi
                            <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-4 grayscale">
                                <Layers size={40} />
                                <p className="text-xs font-bold uppercase tracking-widest text-center">Choisissez un niveau pour voir les modules</p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        ) : availableModules.length === 0 ? (
                            <div className="text-center py-10 text-grey-medium text-sm italic">
                                Aucun module disponible (tous terminés ou non trouvés).
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {availableModules.map(mod => {
                                    // On vérifie si ce module est déjà dans la liste des obligations
                                    const isSelected = mandatoryModules.some(mm => mm.module_id === mod.id && mm.level_id === selectedLevelId);
                                    const displayDate = mod.date_fin || mod.created_at;
                                    const formattedDate = displayDate ? format(new Date(displayDate), 'dd/MM', { locale: fr }) : '';

                                    return (
                                        <button
                                            key={mod.id}
                                            onClick={() => onToggle(mod.id, selectedLevelId)}
                                            className={clsx(
                                                "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left group",
                                                isSelected
                                                    ? "bg-primary/20 border-primary text-white"
                                                    : "bg-surface/40 border-white/5 text-grey-medium hover:border-white/10"
                                            )}
                                        >
                                            {/* Case à cocher visuelle */}
                                            <div className={clsx(
                                                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                                isSelected ? "bg-primary text-black" : "bg-black/40 text-grey-medium group-hover:text-white"
                                            )}>
                                                {isSelected && <Check size={14} strokeWidth={3} />}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className={clsx(
                                                    "text-[11px] font-bold leading-tight",
                                                    isSelected ? "text-white" : "text-grey-light"
                                                )}>
                                                    {mod.nom} {formattedDate && <span className="text-primary/70 font-black ml-1">({formattedDate})</span>}
                                                </p>
                                            </div>
                                            
                                            {/* Score d'avancement pour guider l'enseignant */}
                                            <div className={clsx(
                                                "px-2 py-1 rounded-lg text-[10px] font-black shrink-0",
                                                mod.percent > 70 ? "text-success bg-success/10" : "text-primary bg-primary/10"
                                            )}>
                                                {mod.percent}%
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* BAS DE FENÊTRE : Bouton de validation final */}
                <div className="p-6 border-t border-white/5 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Terminer la sélection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MandatoryActivitiesModal;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant clique sur le petit "+" du panneau "Modules Obligatoires".
 * 2. OUVERTURE : Cette fenêtre surgit au milieu de l'écran.
 * 3. SÉLECTION : L'enseignant choisit le niveau "CM1" dans la liste.
 * 4. CHARGEMENT : Le logiciel affiche tous les exercices de CM1 (Grammaire, Calcul, etc.).
 * 5. ACTION : L'enseignant clique sur "Accord de l'adjectif" et "Table de 7". Des coches vertes apparaissent.
 * 6. BILAN VISUEL : L'enseignant voit que "Table de 7" est déjà à 90% (presque tout le monde a fini), il décide peut-être d'en choisir un autre à la place.
 * 7. VALIDATION : Il clique sur "Terminer la sélection".
 * 8. MISE À JOUR : Les nouveaux objectifs apparaissent alors sur son tableau de bord principal et sur les tablettes des élèves.
 */
