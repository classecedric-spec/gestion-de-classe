import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardContextType } from '../DashboardContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/database';
import { format, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const AvantMail: React.FC = () => {
    const { students } = useOutletContext<DashboardContextType>();
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    // Calculate target date (Last Friday)
    const lastFridayDate = useMemo(() => {
        const today = new Date();
        const day = today.getDay(); // 0-6 (Sun-Sat)
        const diff = (day + 7 - 5) % 7 || 7;
        return format(subDays(today, diff), 'yyyy-MM-dd');
    }, []);

    const studentIds = useMemo(() => students?.map(s => s.id) || [], [students]);


    // Fetch ALL incomplete work for ALL students in the list
    // Fetch ALL incomplete work for ALL students in the list
    // Fetch ALL incomplete work for ALL students in the list
    // ENTRY POINT: Progression table (Strictly as requested)
    const { data: allIncompleteData = [], isLoading } = useQuery({
        queryKey: ['all-incomplete-progressions-strict-v2', studentIds.join(','), lastFridayDate],
        queryFn: async () => {
            if (studentIds.length === 0) return [];

            // Fetch Progressions that are NOT 'termine' (finished) or 'a_verifier' (to verify)
            // Join all necessary sorting info: Appending Module Info
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
                .lte('date_limite', lastFridayDate);

            if (error) throw error;

            // In-memory cleanup (e.g. if Module is archived, we might still want to exclude it?)
            // User said "Only thing you look for elsewhere is Module Name". 
            // I'll keep the "Module Active" check just to be safe so we don't show archived stuff, 
            // but the primary date filter is done.

            return data.filter((p: any) => {
                const mod = p.Activite?.Module;
                return !!mod; // Just ensure linkage exists
            });
        },
        enabled: studentIds.length > 0
    });

    // Group activities by Student -> Module (UI Mapping)
    const studentsWithWork = useMemo(() => {
        if (!students) return [];

        const workByStudent: Record<string, any[]> = {};

        allIncompleteData.forEach((prog: any) => {
            const sId = prog.eleve_id;
            const activity = prog.Activite;
            const module = activity.Module;

            // USER EXPLICIT REQUEST: DO NOT FILTER BY LEVEL.
            // If the row exists in Progression, it must be done.

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

        // Now map original students to include this work
        return students.map(s => {
            const modules = workByStudent[s.id] || [];

            // Sort Modules Per Student
            // Criteria: 
            // 1. Date Fin (from Module? Or Progression? Grouping by Module implies Module Date usually)
            // But we have mixed dates if we use Progression date.
            // However, User asked to group by Module.
            // I'll filter/sort modules by the *earliest* activity due date or just Module date?
            // "cette liste est triée selon les dates de fin" -> usually Module.date_fin.

            modules.sort((a: any, b: any) => {
                // 1. Date Fin
                // User mentioned "Module End Date" in previous prompt.
                // But simplified request says "info from Progression".
                // I will use `date_limite` from the FIRST activity in the module group as proxy, or fallback to alphabetical?
                // Actually `allIncompleteData` has individual dates.
                // The `module` object in `workByStudent` comes from `activity.Module`.
                // So `a` here is the Module object.
                // Does Module object have date_fin? Yes, joined in query.
                // But wait, the date filter was on Progression.
                // If Progression.date_limite differs from Module.date_fin, the Module might not technically be "due" but the student is.
                // I'll assume sorting by the Module's intrinsic date is acceptable for the Group Header.

                // Wait, `a` in `modules` array. `modules` contains `modEntry`.
                // `modEntry` is spread from `module` returned by Supabase.
                // My SELECT included `Module(id, nom, statut)`. I REMOVED `date_fin` from Module Select above inadvertently?
                // No, I should keep it for Sorting purposes.
                // Using `p.date_limite` for filtering, but `m.date_fin` for sorting seems safest if we group by Module.

                // Oops, I didn't select `date_fin` in the `Module` join in the snippet above! 
                // "Module (id, nom, statut, SousBranche...)"
                // I MUST add `date_fin` to Module select to allow sorting.

                const dateA = a.date_fin || '';
                const dateB = b.date_fin || '';
                // If dates are equal or missing, proceed to Branch...
                // (Sorting logic continues below...)
                if (dateA !== dateB) return dateA.localeCompare(dateB);

                // 2. Branch Order
                const branchOrderA = a.SousBranche?.Branche?.ordre ?? 999;
                const branchOrderB = b.SousBranche?.Branche?.ordre ?? 999;
                if (branchOrderA !== branchOrderB) return branchOrderA - branchOrderB;

                // 3. Sub-Branch Order
                const subBranchOrderA = a.SousBranche?.ordre ?? 999;
                const subBranchOrderB = b.SousBranche?.ordre ?? 999;
                if (subBranchOrderA !== subBranchOrderB) return subBranchOrderA - subBranchOrderB;

                // 4. Module Name
                return (a.nom || '').localeCompare(b.nom || '');
            });

            // Iterate modules to sort their Activities
            // Criteria: Activity Order
            modules.forEach((mod: any) => {
                mod.activities.sort((actA: any, actB: any) => {
                    return (actA.ordre ?? 999) - (actB.ordre ?? 999);
                });
            });

            return {
                ...s,
                modules
            };
        }).sort((a, b) => {
            // Student Sort: Has work desc, then usual
            const hasWorkA = a.modules.length > 0 ? 1 : 0;
            const hasWorkB = b.modules.length > 0 ? 1 : 0;
            if (hasWorkA !== hasWorkB) return hasWorkB - hasWorkA;

            const orderA = a.Niveau?.ordre ?? 999;
            const orderB = b.Niveau?.ordre ?? 999;
            if (orderA !== orderB) return orderA - orderB;

            const levelA = a.Niveau?.nom || '';
            const levelB = b.Niveau?.nom || '';
            if (levelA !== levelB) return levelA.localeCompare(levelB);

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
                        <h2 className="text-2xl font-black text-white">Avant Mail</h2>
                        <p className="text-sm text-grey-medium mt-1">
                            Travail en retard au {format(parseISO(lastFridayDate), 'dd MMMM yyyy', { locale: fr })}
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
                                        {/* Avatar with Activity Badge */}
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

                                        {/* Info with Module Count */}
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

                                {/* Expanded Content (Inside Card) */}
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

export default AvantMail;
