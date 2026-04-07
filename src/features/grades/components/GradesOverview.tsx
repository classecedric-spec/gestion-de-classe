/**
 * Nom du module/fichier : GradesOverview.tsx
 * 
 * Données en entrée : Un tableau contenant le résumé de toutes les évaluations existantes créées par l'enseignant.
 * 
 * Données en sortie : Un tableau d'affichage "Métrique" (Overview) permettant de visualiser rapidement la liste et de cliquer sur un élément pour l'ouvrir.
 * 
 * Objectif principal : Offrir une vue d'ensemble basique et compacte (un tableau simple) listant tous les devoirs enregistrés, sans la complexité de la vue "Excel".
 * 
 * Ce que ça affiche : Si le prof n'a rien, un joli message d'accueil. Sinon, un tableau avec les colonnes : Groupe, Matière, Trimestre, Évaluation et Critère (Barème).
 */

import React from 'react';
import { ClipboardList, Users, BookOpen, Calendar, Target } from 'lucide-react';

interface GradesOverviewProps {
    evaluations: any[]; // Detailed evaluations with Groupe, Branche, TypeNote
    onSelect: (evaluationId: string, groupId: string, brancheId: string, periode: string) => void;
}

const GradesOverview: React.FC<GradesOverviewProps> = ({ 
    evaluations, 
    onSelect
}) => {
    // Si la machine constate que le professeur déballe son application pour la première fois (ou qu'il a tout effacé), elle lui affiche un message d'accueil vide.
    if (evaluations.length === 0) {
        return (
            <div className="py-20 text-center bg-surface rounded-3xl border border-dashed border-border/20 animate-in fade-in duration-500">
                <div className="w-16 h-16 rounded-full bg-grey-light/10 flex items-center justify-center text-grey-light mx-auto mb-4">
                    <ClipboardList size={32} strokeWidth={1} />
                </div>
                <p className="text-grey-medium uppercase tracking-widest text-[10px] font-black">Aucune évaluation</p>
                <p className="text-grey-dark font-bold mt-2 text-lg">Vous n'avez pas encore créé d'évaluations.</p>
            </div>
        );
    }

    // S'il existe des évaluations enregistrées, dessine l'immense tableau listant tous les travaux.
    return (
        <div className="bg-surface rounded-3xl border border-border/10 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-grey-light/5">
                            <th className="py-4 px-6 border-b border-border/5">
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-grey-medium" />
                                    <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Groupe</span>
                                </div>
                            </th>
                            <th className="py-4 px-6 border-b border-border/5">
                                <div className="flex items-center gap-2">
                                    <BookOpen size={14} className="text-grey-medium" />
                                    <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Matière</span>
                                </div>
                            </th>
                            <th className="py-4 px-6 border-b border-border/5">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-grey-medium" />
                                    <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Trimestre</span>
                                </div>
                            </th>
                            <th className="py-4 px-6 border-b border-border/5">
                                <div className="flex items-center gap-2">
                                    <ClipboardList size={14} className="text-grey-medium" />
                                    <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Évaluation</span>
                                </div>
                            </th>
                            <th className="py-4 px-6 border-b border-border/5">
                                <div className="flex items-center gap-2">
                                    <Target size={14} className="text-grey-medium" />
                                    <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Critère</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/5">
                        {evaluations.map(ev => (
                            <tr 
                                key={ev.id} 
                                onClick={() => onSelect(ev.id, ev.group_id, ev.branche_id, ev.periode)}
                                className="hover:bg-primary/5 transition-all cursor-pointer group active:scale-[0.99]"
                            >
                                <td className="py-4 px-6">
                                    <span className="text-sm font-bold text-grey-dark group-hover:text-primary transition-colors">
                                        {ev.Groupe?.nom || 'N/A'}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-sm font-medium text-grey-medium">
                                        {ev.Branche?.nom || 'N/A'}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-xs font-black text-primary/80 uppercase tracking-wider">
                                        {ev.periode}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-grey-dark">
                                            {ev.titre}
                                        </span>
                                        <span className="text-[10px] text-grey-medium font-bold uppercase">
                                            {new Date(ev.date).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-grey-light/10 text-grey-medium text-[10px] font-black uppercase tracking-widest border border-border/5">
                                        {ev.TypeNote?.nom || 'Standard'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 bg-grey-light/5 border-t border-border/5">
                <p className="text-[10px] text-grey-medium font-bold uppercase tracking-widest text-center">
                    {evaluations.length} Évaluations au total • Cliquez sur une ligne pour l'ouvrir
                </p>
            </div>
        </div>
    );
};

/**
 * 1. La page d'accueil "Aperçu de toutes les notes" se monte et observe la base de données.
 * 2a. S'il n'y a absolument rien dans le système, elle affiche l'écran vide central ("Vous n'avez pas encore créé d'évaluations").
 * 2b. Dès qu'il y a un devoir trouvé, elle trace un grand tableau et y insire une ligne de résumé par contrôle.
 * 3. Le visiteur peut survoler ce registre (les lignes s'illuminent) et s'il clique sur une évaluation précise, ce fichier enverra l'ordre au programme principal d'ouvrir la page de correction du devoir choisi.
 */
export default GradesOverview;
