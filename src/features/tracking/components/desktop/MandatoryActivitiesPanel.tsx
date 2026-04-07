/**
 * Nom du module/fichier : MandatoryActivitiesPanel.tsx
 * 
 * Données en entrée : 
 *   - `mandatoryGroups` : Liste des chapitres/modules marqués comme "Obligatoires" par l'enseignant.
 *   - `onAddClick` : Action pour ouvrir la fenêtre de sélection de nouveaux modules.
 *   - `onRemove` : Action pour retirer un module de la liste des obligations.
 * 
 * Données en sortie : 
 *   - Un panneau (colonne n°3 du dashboard) montrant l'avancement global de la classe sur les priorités.
 * 
 * Objectif principal : Visualiser la "Température" de la classe sur les objectifs essentiels. C'est ici que l'enseignant voit si la majorité de ses élèves a terminé les exercices obligatoires (ex: Leçon de calcul mental du jour). Cela permet de décider s'il peut passer à la leçon suivante ou s'il doit encore laisser du temps d'atelier.
 * 
 * Ce que ça affiche : 
 *   - Des cartes par niveau (ex: CE1, CE2) contenant des barres de progression.
 *   - Un pourcentage global de réussite pour chaque module obligatoire.
 *   - Une info-bulle (icône "i") pour voir la liste précise des élèves n'ayant pas encore fini.
 */

import React, { useState } from 'react';
import { Layers, Plus, CheckCircle2, Info, X, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResolvedMandatoryModule } from '../../hooks/useMandatoryActivities';

interface MandatoryActivitiesPanelProps {
    mandatoryGroups: ResolvedMandatoryModule[];
    onAddClick: () => void;
    onRemove: (levelId: string, moduleId: string) => void;
}

/** 
 * Interface interne pour stocker les détails de l'info-bulle (quels élèves sont en retard).
 */
interface SelectedInfo {
    name: string;
    students: {
        name: string;
        prenom: string;
        completed: number;
        total: number;
        percentage: number;
    }[];
    level: string;
}

/**
 * Panneau d'affichage des modules prioritaires (ceux que tout le monde doit finir).
 */
const MandatoryActivitiesPanel: React.FC<MandatoryActivitiesPanelProps> = ({
    mandatoryGroups,
    onAddClick,
    onRemove
}) => {
    // ÉTAT : On mémorise quel module est "loupé" pour afficher la liste des élèves restants.
    const [selectedInfo, setSelectedInfo] = useState<SelectedInfo | null>(null);
    const [draggedItem, setDraggedItem] = useState<{ levelId: string, moduleId: string } | null>(null);

    /** 
     * GESTION DU RANGEMENT (Drag & Drop) : 
     * Les fonctions ci-dessous permettent de changer l'ordre des modules à la souris.
     */
    const handleDragStart = (e: React.DragEvent, levelId: string, moduleId: string) => {
        setDraggedItem({ levelId, moduleId });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetLevelId: string, targetModuleId: string) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.levelId !== targetLevelId) return;
        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col h-full">
            {/* EN-TÊTE : Titre et bouton d'ajout "+" */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 h-[60px]">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-light">Modules Obligatoires</span>
                </div>
                <button
                    onClick={onAddClick}
                    className="p-1 px-2.5 bg-primary/20 text-primary border border-primary/20 rounded-md hover:bg-primary/30 transition-all active:scale-95"
                    title="Ajouter des modules obligatoires"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* ZONE DE CONTENU : Liste des modules classés par niveau scolaire */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {mandatoryGroups.length === 0 ? (
                    // Message si aucun objectif n'est défini
                    <div className="h-full flex flex-col items-center justify-center text-grey-medium opacity-30 gap-3 grayscale py-10">
                        <Layers size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">Aucun module obligatoire sélectionné</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-6 items-start">
                        {mandatoryGroups.map((group) => (
                            <div
                                key={group.levelId}
                                className="flex-1 min-w-[240px] max-w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                            >
                                {/* Ligne du Niveau (ex: Niveau : CE2) */}
                                <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
                                        Niveau : {group.levelName}
                                    </h3>
                                    <div className="h-px flex-1 bg-white/5" />
                                    <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full">
                                        {group.modules.length}
                                    </span>
                                </div>

                                {/* Liste des Cartes de modules */}
                                <div className="grid grid-cols-1 gap-2.5">
                                    {group.modules.map((module) => {
                                        const displayDate = module.date_fin || module.created_at;
                                        const formattedDate = displayDate ? format(new Date(displayDate), 'dd/MM', { locale: fr }) : '';

                                        return (
                                            <div
                                                key={`${module.id}-${group.levelId}`}
                                                draggable={module.percent !== 100}
                                                onDragStart={(e) => handleDragStart(e, group.levelId, module.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, group.levelId, module.id)}
                                                onDragEnd={handleDragEnd}
                                                className={clsx(
                                                    "bg-surface/30 border border-white/5 rounded-xl p-3 flex flex-col gap-3 hover:bg-surface/50 transition-colors group relative cursor-grab active:cursor-grabbing",
                                                    draggedItem?.moduleId === module.id && draggedItem?.levelId === group.levelId && "opacity-50"
                                                )}
                                            >
                                                {/* Bouton de retrait (Croix discrète au survol) */}
                                                <button
                                                    onClick={() => onRemove(group.levelId, module.id)}
                                                    className="absolute -top-2 -right-2 z-10 p-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                                    title="Retirer ce module"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>

                                                <div className="flex items-start gap-3">
                                                    {/* Poignée pour bouger le module */}
                                                    {module.percent !== 100 && (
                                                        <div className="mt-0.5 shrink-0 cursor-move opacity-0 group-hover:opacity-100 transition-opacity text-grey-medium hover:text-primary">
                                                            <GripVertical size={16} />
                                                        </div>
                                                    )}

                                                    {/* Bouton "i" : Ouvre la liste des élèves en retard */}
                                                    <button
                                                        onClick={() => setSelectedInfo({
                                                            name: module.nom,
                                                            students: module.remainingStudents,
                                                            level: group.levelName
                                                        })}
                                                        className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-primary/70 hover:text-primary transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] active:scale-95"
                                                        title="Élèves restants"
                                                    >
                                                        <Info size={12} />
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[12px] font-bold text-white leading-tight">
                                                            {module.nom} {formattedDate && <span className="text-primary/70 font-black ml-1">({formattedDate})</span>}
                                                        </p>
                                                    </div>

                                                    {/* Affichage du pourcentage ou d'une coche verte */}
                                                    <div className={clsx(
                                                        "shrink-0",
                                                        module.percent === 100 ? "text-success" : "text-primary"
                                                    )}>
                                                        {module.percent === 100 ? (
                                                            <CheckCircle2 size={18} />
                                                        ) : (
                                                            <span className="text-lg font-black leading-none drop-shadow-sm">
                                                                {module.percent}<span className="text-[10px] opacity-60 ml-0.5">%</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Barre de progression visuelle */}
                                                <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden shadow-inner border border-white/5">
                                                    <div
                                                        className={clsx(
                                                            "h-full transition-all duration-700 ease-out",
                                                            module.percent === 100 ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-primary shadow-[0_0_8px_rgba(30,174,219,0.5)]"
                                                        )}
                                                        style={{ width: `${module.percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FENÊTRE SURGISSANTE (Info-bulle détaillée) : Affiche qui doit encore finir */}
            {selectedInfo && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-white/5">
                            <div className="flex flex-col">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                                    Niveau {selectedInfo.level}
                                </h4>
                                <h3 className="text-sm font-bold text-white truncate max-w-[240px]">
                                    {selectedInfo.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedInfo(null)}
                                className="p-1.5 text-grey-medium hover:text-white hover:bg-white/5 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Liste des prénoms des élèves n'ayant pas validé */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-grey-medium">
                                <span>Élèves à terminer</span>
                                <span className="bg-white/5 px-2 py-0.5 rounded-full">{selectedInfo.students.length}</span>
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 gap-2">
                                {selectedInfo.students.length === 0 ? (
                                    // Cascade de confetti si tout le monde a fini
                                    <div className="py-8 text-center bg-success/5 border border-success/10 rounded-xl">
                                        <CheckCircle2 className="mx-auto text-success mb-2" size={24} />
                                        <p className="text-[11px] font-bold text-success uppercase tracking-wider">Tous les élèves ont terminé !</p>
                                    </div>
                                ) : (
                                    selectedInfo.students.map((student, idx) => (
                                        <div
                                            key={idx}
                                            className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[12px] font-medium text-grey-light flex items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                                <span className="truncate">{student.name}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-primary shrink-0">
                                                {student.completed}/{student.total}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedInfo(null)}
                            className="w-full mt-6 py-3.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-primary/20 transition-all active:scale-95"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MandatoryActivitiesPanel;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. PRÉPARATION : Le matin, l'enseignant choisit les 3 exercices de "Verbes" et "Additions" que tout le monde doit faire aujourd'hui.
 * 2. AFFICHAGE : Ces exercices apparaissent dans ce panneau avec une progression à 0%.
 * 3. SÉANCE : Au fur et à mesure que les enfants valident les exercices sur leurs tablettes, le pourcentage grimpe (visible par l'adulte).
 * 4. BILAN : L'enseignant voit que le module "Additions" est bloqué à 85%.
 * 5. ACTION : Il clique sur le bouton "i" du module.
 * 6. RÉPONSE : Une fenêtre surgit et liste 3 prénoms : "Bastien, Julie, Thomas". Ce sont les seuls qui n'ont pas fini.
 * 7. INTERVENTION : L'enseignant va directement voir ces 3 élèves pour les débloquer avant la fin du temps imparti.
 * 8. FIN : Une fois que le dernier a validé, le panneau affiche une coche verte Étincelante. Objectif atteint !
 */
