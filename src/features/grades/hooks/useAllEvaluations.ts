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
import { supabase } from '../../../lib/database';

/**
 * Ce "Hook" est indépendant du contexte de classe actuel. Il va tout chercher volontairement pour construire la vue d'ensemble (Excel-like).
 */
export const useAllEvaluations = () => {
    // Délégué (useQuery) qui récupère les données et les garde en mémoire vive pendant 2 minutes (staleTime). Si le prof change d'onglet, le programme ne re-télécharge pas tout inutilement.
    const {
        data: evaluations = [],
        isLoading: loading,
        refetch
    } = useQuery({
        queryKey: ['all_evaluations_detailed'],
        queryFn: async () => {
            const evs = await gradeService.getAllEvaluationsDetailed();
            
            const { data: questions } = await supabase
                .from('EvaluationQuestion')
                .select('evaluation_id, note_max, ratio');
                
            return evs.map((ev: any) => {
                const evQs = questions?.filter((q: any) => q.evaluation_id === ev.id) || [];
                let realNoteMax = ev.note_max;
                if (evQs.length > 0) {
                    realNoteMax = evQs.reduce((acc: number, q: any) => acc + (Number(q.note_max) * (q.ratio != null ? Number(q.ratio) : 1)), 0);
                }
                return { ...ev, _real_note_max: realNoteMax };
            });
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // Traduit les données brutes complexes du serveur dans un vocabulaire de variables (ex: _moyenne, _noteMaxResult) que nos grands tableaux visuels comprennent parfaitement.
    const evaluationsWithStats = evaluations.map((ev: any) => ({
        ...ev,
        _brancheName: ev.Branche?.nom || '-',
        _groupeName: ev.Groupe?.nom || '-',
        _typeNoteName: ev.TypeNote?.nom || '-',
        _nbResultats: ev.nb_resultats || 0,
        _moyenne: ev.moyenne,
        _noteMaxResult: ev.note_max_result,
        _noteMinResult: ev.note_min_result,
        _real_note_max: ev._real_note_max,
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
