import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardContextType } from '../DashboardContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/database';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const VueRetard: React.FC = () => {
    const { students } = useOutletContext<DashboardContextType>();
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    // Calculate target date (Today)
    const todayDate = useMemo(() => {
        return format(new Date(), 'yyyy-MM-dd');
    }, []);

    const studentIds = useMemo(() => students?.map(s => s.id) || [], [students]);

    // Fetch ALL incomplete work for ALL students in the list
    const { data: allIncompleteData = [], isLoading } = useQuery({
        queryKey: ['vue-retard-progressions', studentIds.join(','), todayDate],
        queryFn: async () => {
            if (studentIds.length === 0) return [];

            const { data, error } = await supabase
                .from('Progression')
                .select(`
                    *,
                    Activite!inner (
                        id, titre, ordre,
                        Module!inner (
                            id, nom, date_fin, statut,
                            SousBranche (
                                id, nom, ordre,
                                Branche (id, nom, ordre)
                            )
                        )
                    )
                `)
                .in('eleve_id', studentIds)
                .eq('Activite.Module.statut', 'en_cours')
                .not('etat', 'in', '("termine","valide","a_verifier")')
                .lte('date_limite', todayDate);

            if (error) throw error;

            return data.filter((p: any) => {
                const mod = p.Activite?.Module;
                return !!mod;
            });
        },
        enabled: studentIds.length > 0
    });

    const studentsWithWork = useMemo(() => {
        if (!students) return [];

        const workByStudent: Record<string, any[]> = {};

        allIncompleteData.forEach((prog: any) => {
            const sId = prog.eleve_id;
            const activity = prog.Activite;
            const module = activity.Module;

            if (!workByStudent[sId]) {
                workByStudent[sId] = [];
            }

            let modEntry = workByStudent[sId].find((m: any) => m.id === module.id);
            if (!modEntry) {
                modEntry = {
                    ...module,
                    activities: []
                };
                workByStudent[sId].push(modEntry);
            }

            modEntry.activities.push({
                ...activity,
                progression: prog
            });
        });

        return students.map(s => {
            const modules = workByStudent[s.id] || [];

            modules.sort((a: any, b: any) => {
                const dateA = a.date_fin || '';
                const dateB = b.date_fin || '';
                if (dateA !== dateB) return dateA.localeCompare(dateB);

                const branchOrderA = a.SousBranche?.Branche?.ordre ?? 999;
                const branchOrderB = b.SousBranche?.Branche?.ordre ?? 999;
                if (branchOrderA !== branchOrderB) return branchOrderA - branchOrderB;

                const subBranchOrderA = a.SousBranche?.ordre ?? 999;
                const subBranchOrderB = b.SousBranche?.ordre ?? 999;
                if (subBranchOrderA !== subBranchOrderB) return subBranchOrderA - subBranchOrderB;

                return (a.nom || '').localeCompare(b.nom || '');
            });

            modules.forEach((mod: any) => {
                mod.activities.sort((actA: any, actB: any) => {
                    return (actA.ordre ?? 999) - (actB.ordre ?? 999);
                });
            });

            // Pre-calculate sorting metrics
            const totalActivities = modules.reduce((sum: number, mod: any) => sum + (mod.activities?.length || 0), 0);
            const totalModules = modules.length;
            const maxActivitiesInOneModule = modules.reduce((max: number, mod: any) => Math.max(max, mod.activities?.length || 0), 0);

            return {
                ...s,
                modules,
                sortMetrics: {
                    totalActivities,
                    totalModules,
                    maxActivitiesInOneModule
                }
            };
        }).sort((a, b) => {
            // Priority 1: Total Late Activities
            if (a.sortMetrics.totalActivities !== b.sortMetrics.totalActivities) {
                return b.sortMetrics.totalActivities - a.sortMetrics.totalActivities;
            }

            // Priority 2: Total Late Modules
            if (a.sortMetrics.totalModules !== b.sortMetrics.totalModules) {
                return b.sortMetrics.totalModules - a.sortMetrics.totalModules;
            }

            // Priority 3: Max activities on a single module
            if (a.sortMetrics.maxActivitiesInOneModule !== b.sortMetrics.maxActivitiesInOneModule) {
                return b.sortMetrics.maxActivitiesInOneModule - a.sortMetrics.maxActivitiesInOneModule;
            }

            // Fallback: Alphabetical
            return a.prenom.localeCompare(b.prenom);
        });
    }, [students, allIncompleteData]);

    const toggleStudent = (id: string) => {
        setExpandedStudentId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white">Vue Retard</h2>
                        <p className="text-sm text-grey-medium mt-1">
                            Travail en retard au {format(parseISO(todayDate), 'dd MMMM yyyy', { locale: fr })} (Aujourd'hui)
                        </p>
                    </div>
                    <span className="text-sm font-bold text-grey-medium px-3 py-1 bg-white/5 rounded-full">
                        {students?.length || 0} élèves
                    </span>
                </div>

                <div className="space-y-2">
                    {isLoading ? (
                        <div className="py-12 text-center text-grey-medium">Chargement des données...</div>
                    ) : studentsWithWork.map((student) => {
                        const hasWork = student.modules.length > 0;
                        const isExpanded = expandedStudentId === student.id;
                        const totalActivities = student.modules.reduce((sum: number, mod: any) => sum + (mod.activities?.length || 0), 0);

                        return (
                            <div key={student.id} className={`bg-background/50 border ${hasWork ? (isExpanded ? 'border-primary' : 'border-amber-500/30') : 'border-white/5'} rounded-xl overflow-hidden transition-all mb-2`}>
                                <div
                                    onClick={() => hasWork && toggleStudent(student.id)}
                                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 ${!hasWork ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="relative shrink-0">
                                            {student.photo_url ? (
                                                <img
                                                    src={student.photo_url}
                                                    alt={`${student.prenom} ${student.nom}`}
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border-2 border-white/10">
                                                    <span className="text-xs font-black text-grey-medium">
                                                        {student.prenom.substring(0, 1)}{student.nom.substring(0, 1)}
                                                    </span>
                                                </div>
                                            )}
                                            {hasWork && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                                                    <span className="text-[10px] font-bold text-black">
                                                        {totalActivities}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-bold text-white truncate">
                                                    {student.prenom} {student.nom}
                                                </span>
                                                <span className="text-xs text-grey-medium truncate uppercase">
                                                    {student.Niveau?.nom}
                                                </span>
                                            </div>
                                            <div className="text-xs">
                                                {hasWork ? (
                                                    <span className="text-amber-500/90 font-medium">
                                                        {student.modules.length} module{student.modules.length > 1 ? 's' : ''} en retard
                                                    </span>
                                                ) : (
                                                    <span className="text-green-500/70">À jour</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {hasWork && (
                                        <div className="text-grey-medium ml-2">
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 space-y-3">
                                        <div className="h-px bg-white/5 mb-3" />
                                        {student.modules.sort((a: any, b: any) => {
                                            if (!a.date_fin) return 1;
                                            if (!b.date_fin) return -1;
                                            return new Date(a.date_fin).getTime() - new Date(b.date_fin).getTime();
                                        }).map((module: any) => (
                                            <div key={module.id} className="bg-surface/50 rounded-lg p-3 border border-white/5">
                                                <div className="mb-2">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <h4 className="text-sm font-bold text-white">
                                                            {module.nom} <span className="text-grey-medium font-normal ml-1">
                                                                ({format(parseISO(module.date_fin), 'dd/MM', { locale: fr })})
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">
                                                        {module.SousBranche?.Branche?.nom} • {module.SousBranche?.nom}
                                                    </div>
                                                </div>

                                                <div className="space-y-1 pl-2 border-l-2 border-white/10">
                                                    {module.activities.map((act: any) => (
                                                        <div key={act.id} className="text-xs text-grey-light flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${act.progression.etat === 'en_cours' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                            {act.titre}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {studentsWithWork.length === 0 && !isLoading && (
                        <div className="py-12 text-center">
                            <p className="text-grey-medium">Aucun élève trouvé.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VueRetard;
