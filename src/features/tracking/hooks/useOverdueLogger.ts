import { useEffect } from 'react';

export const useOverdueLogger = (
    loadingProgress: boolean,
    selectedStudent: any,
    studentProgress: any[]
) => {
    useEffect(() => {
        if (!loadingProgress && selectedStudent && studentProgress.length > 0) {
            const now = new Date();
            interface OverdueModule {
                id: string;
                nom: string;
                date_fin: string | null;
                SousBranche?: {
                    ordre: number | null;
                    Branche: {
                        nom: string;
                        ordre: number | null;
                    } | null;
                } | null;
                activities: string[];
            }
            const overdueModules: Record<string, OverdueModule> = {};
            let hasOverdueWork = false;

            studentProgress.forEach(p => {
                const module = p.Activite?.Module;
                const status = p.etat;

                if (!module || !module.date_fin || status === 'termine') return;

                const endDate = new Date(module.date_fin);
                if (endDate >= now) return;

                if (!overdueModules[module.id]) {
                    overdueModules[module.id] = {
                        ...module,
                        activities: []
                    };
                }
                overdueModules[module.id].activities.push(p.Activite?.titre || 'Activité sans titre');
                hasOverdueWork = true;
            });

            if (hasOverdueWork) {
                const sortedModules = Object.values(overdueModules).sort((a, b) => {
                    if (!a.date_fin && !b.date_fin) return 0;
                    if (!a.date_fin) return 1;
                    if (!b.date_fin) return -1;
                    const dateA = new Date(a.date_fin!);
                    const dateB = new Date(b.date_fin!);
                    const dateDiff = dateA.getTime() - dateB.getTime();
                    if (dateDiff !== 0) return dateDiff;
                    const branchA = a.SousBranche?.Branche?.nom || '';
                    const branchB = b.SousBranche?.Branche?.nom || '';
                    if (branchA.localeCompare(branchB) !== 0) return branchA.localeCompare(branchB);
                    return a.nom.localeCompare(b.nom);
                });

                const totalOverdueActivities = sortedModules.reduce((acc, mod) => acc + mod.activities.length, 0);
                console.groupCollapsed(`%c📅 Travaux en retard pour ${selectedStudent.prenom} ${selectedStudent.nom} (${totalOverdueActivities} ateliers)`, 'font-size: 14px; font-weight: bold; color: #e11d48; background: #ffe4e6; padding: 4px 8px; border-radius: 4px;');
                sortedModules.forEach(mod => {
                    const dateStr = mod.date_fin ? new Date(mod.date_fin).toLocaleDateString('fr-FR') : 'Date inconnue';
                    const branchName = mod.SousBranche?.Branche?.nom ? `[${mod.SousBranche.Branche.nom}] ` : '';
                    console.groupCollapsed(`%c${branchName}${mod.nom} %c(${dateStr}) - ${mod.activities.length} atelier(s) restant(s)`, 'font-weight: bold; color: #2563eb;', 'color: #dc2626; font-weight: bold;');
                    mod.activities.forEach((actName: string) => { console.log(`%c• ${actName}`, 'color: #4b5563; margin-left: 10px;'); });
                    console.groupEnd();
                });
                console.groupEnd();
            }
        }
    }, [loadingProgress, selectedStudent, studentProgress]);
};
