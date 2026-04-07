/**
 * Nom du module/fichier : StudentJournalView.tsx
 * 
 * Données en entrée : 
 *   - `studentProgress` : Liste des activités et progrès d'un élève spécifique.
 *   - `expandedModules` : État indiquant quels chapitres sont ouverts ou fermés.
 *   - `showPendingOnly` : Filtre pour n'afficher que les travaux non terminés.
 * 
 * Données en sortie : 
 *   - Une vue détaillée (Carnet de bord) montrant l'avancement d'un élève, module par module.
 * 
 * Objectif principal : Offrir une vision "Rayon X" sur le travail d'un élève. L'enseignant peut voir précisément quels ateliers l'enfant a réussis, lesquels sont en cours, et s'il y a des retards par rapport aux dates limites. C'est l'outil idéal pour les bilans individuels.
 * 
 * Ce que ça affiche : Une liste de modules (chapitres) avec barres de progression. Chaque module peut être déplié pour révéler la liste des exercices avec leurs statuts (Terminé, En cours, Besoin d'aide).
 */

import React from 'react';
import clsx from 'clsx';
import { ChevronRight, CheckCircle2, AlertCircle, Clock, X, ShieldCheck } from 'lucide-react';
import { Badge } from '../../../core';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StudentJournalViewProps {
    studentProgress: any[];
    expandedModules: Record<string, boolean>;
    toggleModuleExpansion: (moduleId: string) => void;
    showPendingOnly: boolean;
    handleUrgentValidation?: (activityId: string, studentId: string, manualIndices?: any) => void;
    handleResetActivity?: (progressionId: string) => void;
}

/**
 * Composant de visualisation du parcours individuel d'un élève.
 */
export const StudentJournalView: React.FC<StudentJournalViewProps> = ({
    studentProgress,
    expandedModules,
    toggleModuleExpansion,
    showPendingOnly,
    handleResetActivity
}) => {
    // REGROUPEMENT : On transforme la liste brute d'activités en groupes par "Module" (ex: "Calcul Mental", "Géométrie").
    const moduleGroups = Object.values(studentProgress.reduce((acc: any, p) => {
        const mod = p.Activite?.Module;
        if (!mod) return acc;
        if (!acc[mod.id]) acc[mod.id] = { ...mod, activities: [] };
        acc[mod.id].activities.push(p);
        return acc;
    }, {}));

    return (
        <>
            {moduleGroups
                .sort((a: any, b: any) => {
                    // TRI : On classe les modules par date de fin, puis par branche et sous-branche.
                    if (a.date_fin && b.date_fin) {
                        if (a.date_fin !== b.date_fin) return new Date(a.date_fin).getTime() - new Date(b.date_fin).getTime();
                    } else if (a.date_fin) return -1;
                    else if (b.date_fin) return 1;
                    const aBOrder = a.SousBranche?.Branche?.ordre || 0;
                    const bBOrder = b.SousBranche?.Branche?.ordre || 0;
                    if (aBOrder !== bBOrder) return aBOrder - bBOrder;
                    const aSBOrder = a.SousBranche?.ordre || 0;
                    const bSBOrder = b.SousBranche?.ordre || 0;
                    if (aSBOrder !== bSBOrder) return aSBOrder - bSBOrder;
                    return a.nom.localeCompare(b.nom);
                })
                .map((module: any) => {
                    // CALCULS DE STATISTIQUES : On compte combien sont terminés pour dessiner la barre de progrès.
                    const activities = module.activities;
                    const completedCount = activities.filter((a: any) => a.etat === 'termine').length;
                    const toVerifyCount = activities.filter((a: any) => a.etat === 'a_verifier').length;
                    const totalCount = activities.length;
                    const percent = Math.round(((completedCount + toVerifyCount) / totalCount) * 100);

                    const progressBarStyle = { width: `${percent}%` } as React.CSSProperties;
                    const withStyle = (style: React.CSSProperties) => ({ style });

                    const isExpanded = expandedModules[module.id];
                    const isModuleOverdue = module.date_fin && new Date(module.date_fin) < new Date() && completedCount < totalCount;

                    // FILTRE : Si le module est 100% fini et qu'on ne veut voir que le travail restant, on cache.
                    if (showPendingOnly && completedCount === totalCount) return null;

                    return (
                        <div key={module.id} className="bg-surface/50 border border-transparent rounded-xl overflow-hidden hover:border-white/10 hover:bg-surface transition-all group">
                            {/* EN-TÊTE DU MODULE (Ligne récapitulative cliquable) */}
                            <div
                                onClick={() => toggleModuleExpansion(module.id)}
                                className="py-2.5 px-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between gap-6"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={clsx(
                                        "transition-all duration-300",
                                        isExpanded ? "rotate-90 text-primary" : "rotate-0 text-grey-dark group-hover:text-grey-medium"
                                    )}>
                                        <ChevronRight size={18} />
                                    </div>
                                    <h3 className={clsx(
                                        "font-bold text-text-main text-lg truncate tracking-tight group-hover:text-white transition-all w-fit",
                                        isModuleOverdue && "border-b-2 border-danger/60 hover:border-danger text-danger/90 hover:text-danger"
                                    )}>
                                        {module.nom}
                                    </h3>
                                </div>

                                {/* BLOC DROIT : Date limite et Barre de progression */}
                                <div className="flex items-center gap-6 w-[40%] shrink-0">
                                    <div className="shrink-0">
                                        {module.date_fin ? (
                                            <Badge variant="primary" size="xs" className="px-2 py-0.5 font-black">
                                                {format(new Date(module.date_fin), 'dd/MM', { locale: fr })}
                                            </Badge>
                                        ) : (
                                            <span className="text-[10px] font-bold text-grey-dark uppercase tracking-widest italic opacity-20 px-2">N/A</span>
                                        )}
                                    </div>

                                    <div className="flex-1 flex items-center gap-4">
                                        <div className="flex-1 h-1.5 bg-background/50 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                                {...withStyle(progressBarStyle)}
                                            />
                                        </div>
                                        <span className="text-xs font-black text-grey-medium min-w-[35px] text-right tabular-nums">
                                            {completedCount}
                                            {toVerifyCount > 0 ? ` (+ ${toVerifyCount})` : ''}
                                            /{totalCount}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* DÉTAILS DÉPLIÉS : La liste des exercices du module */}
                            {isExpanded && (
                                <div className="border-t border-white/5 bg-black/20">
                                    {activities.sort((a: any, b: any) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map((p: any) => (
                                        <div key={p.id} className="p-3 pl-10 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group/item">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Bouton pour réinitialiser un travail (Reset) */}
                                                {p.etat !== 'a_commencer' && handleResetActivity && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleResetActivity(p.id);
                                                        }}
                                                        className="p-1 rounded-md hover:bg-danger/20 text-grey-dark hover:text-danger transition-all opacity-0 group-hover/item:opacity-100"
                                                        title="Remettre en cours"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                <h4 className="text-sm text-grey-light font-medium group-hover/item:text-white transition-colors truncate">{p.Activite?.titre}</h4>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-grey-dark font-mono">{new Date(p.updated_at).toLocaleDateString()}</span>
                                                <Badge
                                                    variant={
                                                        p.etat === 'termine' ? 'success' :
                                                            p.etat === 'besoin_d_aide' ? 'danger' :
                                                                p.etat === 'a_verifier' ? 'purple' :
                                                                    'primary'
                                                    }
                                                    size="xs"
                                                    icon={
                                                        p.etat === 'termine' ? <CheckCircle2 size={12} /> :
                                                            p.etat === 'besoin_d_aide' ? <AlertCircle size={12} /> :
                                                                p.etat === 'a_verifier' ? <ShieldCheck size={12} /> :
                                                                    <Clock size={12} />
                                                    }
                                                    className={p.etat === 'besoin_d_aide' ? 'animate-pulse' : ''}
                                                >
                                                    {p.etat === 'termine' ? 'Terminé' :
                                                        p.etat === 'besoin_d_aide' ? "Besoin d'aide" :
                                                            p.etat === 'a_verifier' ? 'À vérifier' :
                                                                'En cours'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
        </>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant consulte la fiche de Julie pour voir où elle en est.
 * 2. Le composant reçoit toute la liste des progrès de Julie (venant de la base de données).
 * 3. Il trie Julie par "Modules" pour que ce soit plus lisible (ex: tout ce qui touche aux Maths est groupé).
 * 4. Pour chaque module, il dessine une barre de progression bleue. Plus la barre est longue, plus Julie a terminé d'exercices.
 * 5. L'enseignant déplie le module "Grammaire" :
 *    - Il voit que Julie a fini l'exercice "Le sujet", mais qu'elle est bloquée ("Besoin d'aide") sur "Le verbe".
 * 6. L'enseignant peut décider de remettre un exercice à zéro si Julie s'est trompée et doit recommencer.
 * 7. Si le module est en rouge, c'est que Julie a dépassé la date limite de rendu.
 */
export default StudentJournalView;
