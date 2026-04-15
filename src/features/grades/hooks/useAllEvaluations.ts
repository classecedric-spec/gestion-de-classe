/**
 * Nom du module/fichier : useAllEvaluations.ts
 * 
 * Données en entrée : Aucune donnée spécifique fournie par l'utilisateur, ce fichier va se brancher de lui-même sur la base de données.
 * 
 * Données en sortie : La liste intégrale de tous les devoirs (évaluations) de l'enseignant, enrichie avec des statistiques précalculées (moyennes, minimum, maximum).
 * 
 * Objectif principal : Agir comme un assistant documentaliste extrêmement rapide ("Hook") qui télécharge l'historique de tous les contrôles et mets en forme leurs moyennes globales.
 * 
 * Ce que ça affiche : Rien visuellement. C'est un moteur invisible de préparation de données de type "Hook" React.
 */

import { useQuery } from '@tanstack/react-query';
import { gradeService } from '../services';
import { supabase, getCurrentUser } from '../../../lib/database';

/**
 * Ce "Hook" est indépendant du contexte de classe actuel. Il va tout chercher volontairement pour construire la vue d'ensemble (Excel-like).
 */
export const useAllEvaluations = () => {
    // Délégué (useQuery) qui récupère les données et les garde en mémoire vive pendant 2 minutes (staleTime). Si le prof change d'onglet, le programme ne re-télécharge pas tout inutilement.
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    const {
        data: evaluations = [],
        isLoading: loading,
        refetch
    } = useQuery({
        queryKey: ['all_evaluations_detailed', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const evs = await gradeService.getAllEvaluationsDetailed(user.id);
            
            if (!evs || evs.length === 0) return [];

            // Fetch data in chunks to avoid URL length limits with the .in() filter
            const fetchInChunks = async (table: string, idField: string, ids: string[], selectString: string = '*') => {
                const CHUNK_SIZE = 100; // ✅ Correction #2 : augmenté de 20 → 100 (PostgREST gère sans problème, réduit drastiquement le nb de requêtes)
                let results: any[] = [];
                for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
                    const chunk = ids.slice(i, i + CHUNK_SIZE);
                    let query = supabase.from(table).select(selectString).in(idField, chunk);
                    // Filter by user_id only for tables that actually have it.
                    // EvaluationQuestion and ResultatQuestion are linked via evaluation_id (already in 'chunk').
                    if (['Resultat'].includes(table)) {
                        query = query.eq('user_id', user.id);
                    }
                    const { data, error } = await query.limit(5000); // Respect limit per chunk
                    if (error) throw error;
                    if (data) results = [...results, ...data];
                }
                return { data: results };
            };

            const evIds = evs.map((e: any) => e.id).filter(id => id != null);
            
            if (evIds.length === 0) {
                return [];
            }

            // ✅ Correction #1 : requêtes parallèles (était séquentiel — chacune attendait l'autre inutilement)
            const [{ data: allQuestions }, { data: allResults }] = await Promise.all([
                fetchInChunks('EvaluationQuestion', 'evaluation_id', evIds),
                fetchInChunks('Resultat', 'evaluation_id', evIds)
            ]);
            
            // Get all unique question IDs to fetch their results directly without complex joins in the filter
            const questionIds = Array.from(new Set(allQuestions?.map((q: any) => q.id) || []));
            const { data: allQuestionResults } = await fetchInChunks(
                'ResultatQuestion', 
                'question_id', 
                questionIds, 
                '*, EvaluationQuestion(evaluation_id)'
            );
                
            return evs.map((ev: any) => {
                const evQs = allQuestions?.filter((q: any) => q.evaluation_id === ev.id) || [];
                const evResults = allResults?.filter((r: any) => r.evaluation_id === ev.id) || [];
                
                // On identifie tous les élèves qui ont "participé" (soit une note globale, soit une note par question)
                const studentIdsFromResults = evResults.map(r => r.eleve_id);
                const evQuestionResults = (allQuestionResults as any[])?.filter(qr => 
                    qr.EvaluationQuestion?.evaluation_id === ev.id
                ) || [];
                const studentIdsFromDetails = evQuestionResults.map(qr => qr.eleve_id);
                
                const uniqueParticipatingStudentIds = Array.from(new Set([...studentIdsFromResults, ...studentIdsFromDetails]));

                const effectiveNotes = uniqueParticipatingStudentIds
                    .map(studentId => {
                        const studentQR = evQuestionResults.filter(qr => qr.eleve_id === studentId);
                        const total = gradeService.calculateStudentTotal(studentId, ev, evQs, evResults, studentQR);
                        return total;
                    })
                    .filter(n => n !== null) as number[];

                // Debug log to pinpoint calculation issues
                if (effectiveNotes.length === 0 && evResults.length > 0) {
                    console.warn(`[DIAGNOSTIC] Moyenne absente pour "${ev.titre}" : ${evResults.length} résultats trouvés, mais 0 notes valides calculées. Statuts :`, evResults.map(r => r.statut));
                }

                // On définit la note maximale théorique (pour l'affichage des points bruts)
                let totalPointsPossibles = ev.note_max;
                if (evQs.length > 0) {
                    totalPointsPossibles = evQs.reduce((acc: number, q: any) => acc + (Number(q.note_max) * (q.ratio != null ? Number(q.ratio) : 1)), 0);
                }

                // La moyenne en pourcentage doit être calculée sur l'échelle globale de l'évaluation (ex: sur 20)
                const evalMaxScale = Number(ev.note_max) || 20;
                
                // Formule demandée : Somme(notes) / (Nombre d'élèves * Max de l'évaluation) * 100 pour avoir le %
                const avg = (effectiveNotes.length > 0 && evalMaxScale > 0) 
                    ? (effectiveNotes.reduce((acc, note) => acc + note, 0) / (effectiveNotes.length * evalMaxScale) * 100) 
                    : null;

                return { 
                    ...ev, 
                    _real_note_max: totalPointsPossibles,
                    _nbQuestions: evQs.length,
                    _nbResultats: effectiveNotes.length,
                    _moyenne: avg
                };
            });
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // Traduit les données brutes complexes du serveur dans un vocabulaire de variables (ex: _moyenne, _noteMaxResult) que nos grands tableaux visuels comprennent parfaitement.
    const evaluationsWithStats = evaluations.map((ev: any) => ({
        ...ev,
        _brancheName: ev.Branche?.nom || '-',
        _groupeName: ev.Groupe?.nom || '-',
        _typeNoteName: ev.TypeNote?.nom || '-',
        _nbResultats: ev._nbResultats,
        _moyenne: ev._moyenne,
        _noteMaxResult: ev.note_max_result,
        _noteMinResult: ev.note_min_result,
        _real_note_max: ev._real_note_max,
        _nbQuestions: ev._nbQuestions,
    }));

    return {
        evaluations: evaluationsWithStats,
        loading,
        refetch
    };
};

/**
 * 1. Une page globale comme "Le tableau façon Excel" s'allume et appelle à l'aide ce fichier.
 * 2. L'assistant mémoriel (`useQuery`) vérifie s'il n'a pas déjà récupéré ces données il y a moins de 2 minutes. Si non, il part les télécharger via la tuyauterie de la base de données (`gradeService.getAllEvaluationsDetailed`).
 * 3. Une fois les centaines de devoirs téléchargés depuis le cloud, le filtre `.map()` formate la donnée pour la rendre ultra-digeste pour l'affichage graphique.
 * 4. Le fichier livre le paquet de données formatées au composant final, qui peut alors se dessiner intégralement.
 */
