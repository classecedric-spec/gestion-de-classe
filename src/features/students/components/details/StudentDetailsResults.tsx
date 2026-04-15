/**
 * Nom du module/fichier : StudentDetailsResults.tsx
 * 
 * Données en entrée : 
 *   - `studentId` : Identifiant de l'élève pour lequel on affiche les résultats.
 * 
 * Données en sortie : 
 *   - Une interface en accordéon sur 4 niveaux affichant les synthèses de notes.
 * 
 * Objectif principal : Offrir un "Bulletin Dynamique" permettant de voir les moyennes par période et par matière, 
 * puis de plonger dans le détail de chaque évaluation jusqu'aux questions précises.
 */

import React, { useState } from 'react';
import { 
    ChevronRight, 
    Layers, 
    BookOpen, 
    FileText, 
    XOctagon, 
    Loader2, 
    BarChart3,
    ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useStudentResults, ResultPeriodeView, ResultBrancheView, ResultEvalView } from '../../hooks/useStudentResults';

interface StudentDetailsResultsProps {
    studentId: string;
}

export const StudentDetailsResults: React.FC<StudentDetailsResultsProps> = ({ studentId }) => {
    const { loading, data } = useStudentResults(studentId);
    
    // États d'expansion pour les 3 premiers niveaux (Périodes, Branches, Évaluations)
    const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
    const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
    const [expandedEvals, setExpandedEvals] = useState<Record<string, boolean>>({});

    const togglePeriod = (id: string) => {
        setExpandedPeriods(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleBranch = (id: string) => {
        setExpandedBranches(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleEval = (id: string) => {
        setExpandedEvals(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const closeAll = () => {
        setExpandedPeriods({});
        setExpandedBranches({});
        setExpandedEvals({});
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-primary gap-3">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-sm font-medium opacity-70">Calcul de la synthèse...</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-grey-dark opacity-40 italic text-center gap-4">
                <BarChart3 size={48} strokeWidth={1} />
                <p>Aucun résultat d'évaluation enregistré pour cet élève.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Barre d'outils de l'onglet */}
            <div className="flex justify-end pr-2">
                <button
                    onClick={closeAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-grey-light hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-white/5"
                >
                    <XOctagon size={12} />
                    Tout fermer
                </button>
            </div>

            <div className="space-y-3 pb-8">
                {data.map((periode) => (
                    <div key={periode.nom} className="space-y-2">
                        {/* NIVEAU 0 : Période */}
                        <div 
                            onClick={() => togglePeriod(periode.nom)}
                            className={clsx(
                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                                expandedPeriods[periode.nom] ? "bg-primary/20 border-primary/30" : "bg-white/5 border-white/5 hover:bg-white/10",
                                "border"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <ChevronRight 
                                    size={18} 
                                    className={clsx("transition-transform duration-300", expandedPeriods[periode.nom] && "rotate-90 text-primary")} 
                                />
                                <Layers size={18} className="text-primary-light opacity-50" />
                                <span className="font-bold text-lg text-text-main">{periode.nom}</span>
                            </div>
                        </div>

                        {/* NIVEAU 1 : Branches */}
                        {expandedPeriods[periode.nom] && (
                            <div className="pl-4 space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                {periode.branches.map((branche) => {
                                    const branchKey = `${periode.nom}-${branche.nom}`;
                                    return (
                                        <div key={branche.nom} className="space-y-1">
                                            <div 
                                                onClick={() => toggleBranch(branchKey)}
                                                className={clsx(
                                                    "flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all",
                                                    expandedBranches[branchKey] ? "bg-white/10 border-white/10" : "bg-white/5 border-transparent hover:bg-white/10",
                                                    "border"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ChevronRight 
                                                        size={16} 
                                                        className={clsx("transition-transform duration-300 opacity-40", expandedBranches[branchKey] && "rotate-90 opacity-100 text-primary-light")} 
                                                    />
                                                    <BookOpen size={16} className="text-primary-light opacity-40" />
                                                    <span className="font-bold text-grey-light">{branche.nom}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "text-xs font-black px-2 py-0.5 rounded-full",
                                                        branche.pourcentageMoyen !== null && branche.pourcentageMoyen >= 80 ? "bg-success/20 text-success" :
                                                        branche.pourcentageMoyen !== null && branche.pourcentageMoyen >= 60 ? "bg-warning/20 text-warning" :
                                                        branche.pourcentageMoyen !== null ? "bg-danger/20 text-danger" : "text-grey-dark"
                                                    )}>
                                                        {branche.pourcentageMoyen !== null ? `${branche.pourcentageMoyen}%` : '-- %'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* NIVEAU 2 : Évaluations */}
                                            {expandedBranches[branchKey] && (
                                                <div className="pl-6 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                                    {branche.evaluations.map((ev) => {
                                                        const evalKey = `${branchKey}-${ev.id}`;
                                                        return (
                                                            <div key={ev.id} className="space-y-1">
                                                                <div 
                                                                    onClick={() => toggleEval(evalKey)}
                                                                    className={clsx(
                                                                        "flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-all group",
                                                                        expandedEvals[evalKey] ? "bg-white/5" : "hover:bg-white/5"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <ChevronRight 
                                                                            size={14} 
                                                                            className={clsx("transition-transform duration-300 opacity-30", expandedEvals[evalKey] && "rotate-90 opacity-100")} 
                                                                        />
                                                                        <FileText size={14} className="text-grey-dark opacity-30 group-hover:opacity-60" />
                                                                        <span className="text-sm text-grey-medium group-hover:text-grey-light truncate">{ev.titre}</span>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-grey-dark tabular-nums">
                                                                        {ev.pourcentage !== null ? `${ev.pourcentage}%` : '-- %'}
                                                                    </span>
                                                                </div>

                                                                {/* NIVEAU 3 : Questions */}
                                                                {expandedEvals[evalKey] && (
                                                                    <div className="pl-8 pb-2 space-y-0.5 animate-in slide-in-from-top-1 fade-in duration-150">
                                                                        {ev.questions.length > 0 ? (
                                                                            ev.questions.map((q) => (
                                                                                <div key={q.id} className="flex items-center justify-between px-4 py-1.5 border-l border-white/5 hover:bg-white/5 transition-colors">
                                                                                    <span className="text-xs text-grey-dark italic">{q.titre}</span>
                                                                                    <span className="text-[10px] font-mono font-bold text-primary-light/60">
                                                                                        {q.points !== null ? q.points : '?'} / {q.points_max !== null ? q.points_max : '?'}
                                                                                    </span>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="px-4 py-1 text-[10px] text-grey-dark opacity-40 italic">Aucun critère détaillé.</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
