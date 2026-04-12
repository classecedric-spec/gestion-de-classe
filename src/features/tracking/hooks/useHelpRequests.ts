/**
 * Nom du module/fichier : useHelpRequests.ts
 * 
 * Données en entrée : 
 *   - `students` : La liste des élèves de la classe.
 *   - `selectedStudent` : L'élève éventuellement sélectionné.
 * 
 * Données en sortie : 
 *   - `helpRequests` : La liste triée des élèves ayant besoin d'aide ou de suivi.
 *   - `helpersCache` : Les prénoms des élèves "experts" suggérés pour aider.
 *   - `handleExpandHelp` : Fonction pour déplier une demande et voir les tuteurs.
 * 
 * Objectif principal : Gérer la "File d'Attente" de la classe. Ce hook surveille en temps réel qui a besoin d'aide, qui attend une correction, ou qui fait trop d'erreurs (ajustement). Il trie intelligemment cette liste pour mettre en avant les priorités et propose des binômes d'entraide entre élèves pour libérer du temps à l'enseignant.
 * 
 * Ce que ça contient : 
 *   - Une requête automatique vers la base de données pour récupérer les demandes d'aide.
 *   - Un algorithme de tri qui fait "remonter" les élèves qui attendent depuis trop longtemps (Boost d'ajustement).
 *   - Une recherche aleatoire de 3 tuteurs parmi ceux qui ont déjà validé l'exercice.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/database';
import { trackingService } from '../services/trackingService';
import { Student } from '../../attendance/services/attendanceService';

export interface HelpRequest {
    id: string;
    etat: string;
    is_suivi: boolean;
    eleve: {
        id: string;
        prenom: string;
        nom: string;
        importance_suivi: number | null;
    } | null;
    activite: {
        id: string;
        titre: string;
        Module: {
            id: string;
            nom: string;
            date_fin: string | null;
            statut: string | null;
            SousBranche: {
                Branche: {
                    id: string;
                } | null;
            } | null;
        } | null;
        ActiviteMateriel: {
            TypeMateriel: {
                acronyme: string | null;
            } | null;
        }[];
    } | null;
}

export interface Helper {
    id: string;
    prenom: string;
    nom: string;
}

/**
 * Hook de pilotage des demandes d'aide et de l'entraide.
 */
export function useHelpRequests(
    students: Student[],
    selectedStudent: Student | null,
    fetchStudentProgressions?: (studentId: string) => Promise<void>
) {
    const queryClient = useQueryClient();
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [helpersCache, setHelpersCache] = useState<Record<string, Helper[]>>({});
    // Le "Boost" permet de faire remonter les élèves qui stagnent après quelques minutes.
    const [ajustementBoost, setAjustementBoost] = useState(0);

    const studentIds = useMemo(() => students.map(s => s.id), [students]);

    /** 
     * 1. LECTURE DES DEMANDES : 
     * On va chercher en base de données toutes les progressions 
     * marquées 'besoin_d_aide' ou 'ajustement' pour cette classe.
     */
    const { data: helpRequestsRaw = [] } = useQuery({
        queryKey: ['help-requests', studentIds],
        queryFn: async () => {
            if (studentIds.length === 0) return [];

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Seuls 'besoin_d_aide' et 'ajustement' sont affichés dans cette liste (les 'à vérifier' sont ailleurs ou filtrés)
            const allRequests = await trackingService.fetchHelpRequests(studentIds, user.id);
            return allRequests.filter(r => r.etat === 'besoin_d_aide' || r.etat === 'ajustement') as unknown as HelpRequest[];
        },
        enabled: studentIds.length > 0,
        staleTime: 1000 * 30, // On garde les données fraîches pendant 30 secondes.
    });

    /** 
     * 2. FILTRAGE ET TRI INTELLIGENT : 
     * On supprime les demandes hors sujet (modules fermés) 
     * et on applique le "Boost" pour les élèves bloqués.
     */
    const helpRequests = useMemo(() => {
        const validRequests = helpRequestsRaw.filter(req => {
            if (req.is_suivi) return true;
            if (!req.activite?.Module) return true;
            return req.activite.Module.statut === 'en_cours';
        });

        return [...validRequests].sort((a, b) => {
            const aIsAjustement = a.etat === 'ajustement';
            const bIsAjustement = b.etat === 'ajustement';
            // Plus le temps passe, plus les demandes de correction ('ajustement') remontent en haut de pile.
            const aBoost = aIsAjustement ? -(ajustementBoost * 3) : 0;
            const bBoost = bIsAjustement ? -(ajustementBoost * 3) : 0;
            return (validRequests.indexOf(a) + aBoost) - (validRequests.indexOf(b) + bBoost);
        });
    }, [helpRequestsRaw, ajustementBoost]);

    /** 
     * 3. RECHERCHE D'EXPERTS (Entraide) : 
     * Quand l'enseignant clique sur un élève en difficulté, on cherche 3 camarades 
     * qui ont déjà fini cet exercice précis pour aller l'aider.
     */
    const handleExpandHelp = async (requestId: string, activityId: string) => {
        if (expandedRequestId === requestId) {
            setExpandedRequestId(null);
            return;
        }

        setExpandedRequestId(requestId);
        if (helpersCache[requestId]) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const finishers = await trackingService.findHelpers(activityId, studentIds, user.id);
            // On tire au sort 3 élèves parmi tous les experts disponibles.
            const randomHelpers = finishers.sort(() => 0.5 - Math.random()).slice(0, 3);

            setHelpersCache(prev => ({ ...prev, [requestId]: randomHelpers }));
        } catch (err) {
            console.error('Error fetching helpers:', err);
        }
    };

    /** 
     * 4. MISE À JOUR AUTOMATIQUE : 
     * Si l'élève sélectionné fait une action, on rafraichit sa fiche.
     */
    useEffect(() => {
        if (selectedStudent && fetchStudentProgressions) {
            fetchStudentProgressions(selectedStudent.id);
        }
    }, [helpRequestsRaw, selectedStudent, fetchStudentProgressions]);

    /** 
     * 5. HORLOGE DU "BOOST" : 
     * Toutes les 2 minutes, on augmente le boost pour faire bouger la file d'attente.
     */
    useEffect(() => {
        const boostInterval = setInterval(() => {
            setAjustementBoost(prev => prev + 1);
        }, 120000);
        return () => clearInterval(boostInterval);
    }, []);

    return {
        states: { helpRequests, expandedRequestId, helpersCache },
        actions: {
            handleExpandHelp,
            fetchHelpRequests: () => queryClient.invalidateQueries({ queryKey: ['help-requests', studentIds] })
        }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : Bastien bloque sur les "Fractions 2". Il clique sur "Aide".
 * 2. DÉTECTION : Le hook `useHelpRequests` capte sa demande et l'affiche en bas de la file.
 * 3. ATTENTE : Deux minutes passent, l'enseignant ne s'est pas encore libéré.
 * 4. PRIORISATION : Le hook augmente le "Boost" de Bastien. Sa demande remonte en haut de la liste.
 * 5. CLIC ADULTE : L'enseignant clique sur le ticket de Bastien.
 * 6. RECHERCHE : Le hook fouille la classe et voit que Sarah et Marc ont déjà validé les "Fractions 2".
 * 7. ENTRAIDE : L'enseignant demande à Sarah d'aller voir Bastien.
 * 8. FIN : Une fois Bastien débloqué, le ticket disparait de la liste. Gain de temps : 5 minutes pour l'enseignant.
 */
