/**
 * Nom du module/fichier : ResultsExplorer.tsx
 * 
 * Données en entrée : La base de données complète contenant absolument toutes les cotes/notes de tous les élèves.
 * 
 * Données en sortie : Un tableau de recherche ultra-rapide permettant de croiser les notes par élève, par branche ou par classe.
 * 
 * Objectif principal : Offrir un moteur de recherche global (un explorateur) pour retrouver la note d'un élève précis ou filtrer les résultats d'une classe.
 * 
 * Ce que ça affiche : Une barre d'outils avec un champ de recherche texte et des menus déroulants (Groupe, Matière, Période), suivie d'un grand tableau listant chaque note individuelle.
 */

import React, { useState, useMemo } from 'react';
import { 
    Users, 
    BookOpen, 
    Calendar, 
    ClipboardList, 
    Filter, 
    Search, 
    ChevronRight, 
    ArrowUpDown,
    Download
} from 'lucide-react';
import { Badge } from '../../../core';
import clsx from 'clsx';

interface ResultsExplorerProps {
    results: any[];
    onSelectEvaluation: (evalId: string, groupId: string, branchId: string, period: string) => void;
}

const ResultsExplorer: React.FC<ResultsExplorerProps> = ({ results, onSelectEvaluation }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        groupe: 'all',
        branche: 'all',
        periode: 'all'
    });
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
        key: 'Evaluation.date',
        direction: 'desc'
    });

    // Le système fouille dans la grande mémoire des notes pour lister intelligemment quels filtres il peut proposer (ex: lister toutes les matières existantes sans créer de doublon).
    const groups = useMemo(() => Array.from(new Set(results.map(r => r.Evaluation?.Groupe?.nom))).filter(Boolean).sort() as string[], [results]);
    const availableBranches = useMemo(() => Array.from(new Set(results.map(r => r.Evaluation?.Branche?.nom))).filter(Boolean).sort() as string[], [results]);
    const periods = useMemo(() => Array.from(new Set(results.map(r => r.Evaluation?.periode))).filter(Boolean).sort() as string[], [results]);

    // C'est le cœur du réacteur : cette fonction prend toute la liste des notes, et ne garde de façon invisible que celles qui correspondent à ce que le professeur recherche.
    const filteredResults = useMemo(() => {
        return results.filter(r => {
            const matchesSearch = 
                r.Eleve?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.Eleve?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.Evaluation?.titre?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesGroupe = filters.groupe === 'all' || r.Evaluation?.Groupe?.nom === filters.groupe;
            const matchesBranche = filters.branche === 'all' || r.Evaluation?.Branche?.nom === filters.branche;
            const matchesPeriode = filters.periode === 'all' || r.Evaluation?.periode === filters.periode;

            return matchesSearch && matchesGroupe && matchesBranche && matchesPeriode;
        }).sort((a, b) => {
            if (!sortConfig.direction) return 0;
            
            let valA: any = a;
            let valB: any = b;
            
            // Handle nested keys like 'Evaluation.date'
            sortConfig.key.split('.').forEach(k => {
                valA = valA?.[k];
                valB = valB?.[k];
            });

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [results, searchTerm, filters, sortConfig]);

    // Inverse le sens de la liste affichée (de A à Z ou de Z à A) quand le professeur clique sur le titre d'une colonne (ex: "Élève").
    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    if (results.length === 0) {
        return (
            <div className="py-20 text-center bg-surface rounded-3xl border border-dashed border-border/20">
                <p className="text-grey-medium font-bold">Aucune note enregistrée pour le moment.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            {/* Filters Bar */}
            <div className="bg-surface p-4 rounded-2xl border border-border/10 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                    <input 
                        type="text" 
                        placeholder="Rechercher un élève ou une évaluation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-grey-light/5 border border-border/10 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-colors"
                    />
                </div>

                <div className="flex gap-2 items-center">
                    <Filter size={14} className="text-grey-medium" />
                    <select 
                        value={filters.groupe}
                        title="Filtrer par groupe"
                        onChange={(e) => setFilters(prev => ({ ...prev, groupe: e.target.value }))}
                        className="bg-grey-light/5 border border-border/10 rounded-lg px-3 py-1.5 text-xs font-bold text-grey-dark focus:outline-none cursor-pointer"
                    >
                        <option value="all">Tous les groupes</option>
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <select 
                        value={filters.branche}
                        title="Filtrer par branche"
                        onChange={(e) => setFilters(prev => ({ ...prev, branche: e.target.value }))}
                        className="bg-grey-light/5 border border-border/10 rounded-lg px-3 py-1.5 text-xs font-bold text-grey-dark focus:outline-none cursor-pointer"
                    >
                        <option value="all">Toutes les branches</option>
                        {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>

                    <select 
                        value={filters.periode}
                        title="Filtrer par période"
                        onChange={(e) => setFilters(prev => ({ ...prev, periode: e.target.value }))}
                        className="bg-grey-light/5 border border-border/10 rounded-lg px-3 py-1.5 text-xs font-bold text-grey-dark focus:outline-none cursor-pointer"
                    >
                        <option value="all">Toutes les périodes</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <button 
                    onClick={() => {/* Export Logic if needed */}}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-colors"
                >
                    <Download size={14} />
                    Exporter
                </button>
            </div>

            {/* Table Container */}
            <div className="bg-surface rounded-3xl border border-border/10 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-grey-light/5 backdrop-blur-md">
                            <tr>
                                <th className="py-4 px-6 border-b border-border/5">
                                    <button onClick={() => handleSort('Evaluation.Groupe.nom')} className="flex items-center gap-2 group">
                                        <Users size={14} className="text-grey-medium" />
                                        <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Groupe</span>
                                        <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </th>
                                <th className="py-4 px-6 border-b border-border/5">
                                    <button onClick={() => handleSort('Eleve.nom')} className="flex items-center gap-2 group">
                                        <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Élève</span>
                                        <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </th>
                                <th className="py-4 px-6 border-b border-border/5">
                                    <button onClick={() => handleSort('Evaluation.Branche.nom')} className="flex items-center gap-2 group">
                                        <BookOpen size={14} className="text-grey-medium" />
                                        <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Matière</span>
                                        <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </th>
                                <th className="py-4 px-6 border-b border-border/5">
                                    <button onClick={() => handleSort('Evaluation.periode')} className="flex items-center gap-2 group">
                                        <Calendar size={14} className="text-grey-medium" />
                                        <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Trimestre</span>
                                    </button>
                                </th>
                                <th className="py-4 px-6 border-b border-border/5">
                                    <button onClick={() => handleSort('Evaluation.titre')} className="flex items-center gap-2 group">
                                        <ClipboardList size={14} className="text-grey-medium" />
                                        <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Évaluation</span>
                                    </button>
                                </th>
                                <th className="py-4 px-6 border-b border-border/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Note</span>
                                    </div>
                                </th>
                                <th className="py-4 px-6 border-b border-border/5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                            {filteredResults.map(res => (
                                <tr 
                                    key={res.id} 
                                    className="hover:bg-primary/5 transition-all group"
                                >
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-bold text-grey-dark">{res.Evaluation?.Groupe?.nom}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-grey-dark uppercase">{res.Eleve?.nom}</span>
                                            <span className="text-xs font-medium text-grey-medium">{res.Eleve?.prenom}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-grey-medium">{res.Evaluation?.Branche?.nom}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest">{res.Evaluation?.periode}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-grey-dark">{res.Evaluation?.titre}</span>
                                            <span className="text-[10px] text-grey-medium font-bold uppercase">
                                                {new Date(res.Evaluation?.date).toLocaleDateString('fr-CH')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            {res.is_absent ? (
                                                <Badge variant="default" size="xs">ABS</Badge>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <span className={clsx(
                                                        "text-sm font-black",
                                                        res.note / (res.Evaluation?.max_note_evaluation || 1) >= 0.8 ? "text-emerald-600" :
                                                        res.note / (res.Evaluation?.max_note_evaluation || 1) >= 0.5 ? "text-blue-600" :
                                                        "text-rose-600"
                                                    )}>
                                                        {res.note}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-grey-light uppercase">/ {res.Evaluation?.max_note_evaluation}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button 
                                            onClick={() => onSelectEvaluation(
                                                res.evaluation_id, 
                                                res.Evaluation?.group_id, 
                                                res.Evaluation?.branche_id, 
                                                res.Evaluation?.periode
                                            )}
                                            className="p-2 rounded-lg hover:bg-primary/20 text-grey-medium hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                            title="Ouvrir l'évaluation"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredResults.length === 0 && (
                    <div className="py-10 text-center">
                        <p className="text-xs text-grey-medium font-bold uppercase">Aucun résultat ne correspond à votre recherche.</p>
                    </div>
                )}
                
                <div className="p-4 bg-grey-light/5 border-t border-border/5 flex justify-between items-center">
                    <p className="text-[10px] text-grey-medium font-black uppercase tracking-widest">
                        {filteredResults.length} sur {results.length} notes affichées
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * 1. L'explorateur s'ouvre, il absorbe l'intégralité des milliers de notes sauvegardées.
 * 2. Il analyse tout ce volume pour générer les options des menus déroulants en haut (pour que l'enseignant ne puisse filtrer que par des classes ou branches qui existent et ont des cotes).
 * 3. L'enseignant tape "Jean" dans la barre de recherche.
 * 4. La fonction intelligente "filteredResults" réagit instantanément, traverse toute la base et ne conserve pour l'affichage que les lignes contenant le nom de Jean.
 * 5. Le tableau se réduit immédiatement. L'enseignant trouve la note qu'il cherchait.
 * 6. S'il le souhaite, il peut cliquer sur le bouton "Flèche" situé tout au bout de la ligne pour être téléporté à travers le site directement vers la grille de correction du devoir concerné.
 */
export default ResultsExplorer;
