/**
 * Nom du module/fichier : useHomeworkTracking.ts
 * 
 * Données en entrée : 
 *   - `selectedGroupId` : La classe concernée.
 *   - `date` : Le jour pour lequel on veut voir les devoirs.
 *   - `lieu` : 'classe' ou 'domicile' (par défaut 'domicile').
 * 
 * Données en sortie : 
 *   - `students` : Liste des élèves ayant des devoirs prévus, avec le détail des leçons et exercices.
 *   - `loading` : État de chargement des données.
 * 
 * Objectif principal : Suivre le travail personnel de l'élève en dehors du temps de classe. Ce hook permet à l'enseignant de voir d'un coup d'œil ce que chaque élève a prévu de faire à la maison pour la journée demandée. Il croise les données de planification (ce que l'élève a choisi de faire sur son "kiosque") avec les exercices réellement disponibles pour s'assurer de la cohérence du suivi.
 * 
 * Ce que ça contient : 
 *   - Le calcul automatique du début de semaine (Lundi) pour interroger la bonne période.
 *   - La récupération des élèves du groupe.
 *   - Le croisement entre la table 'PlanificationHebdo' (les choix de l'élève) et 'Progression' (l'état réel de l'exercice).
 *   - Le filtrage pour ne montrer que les élèves "actifs" (ceux qui ont effectivement des devoirs ce jour-là).
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { studentService } from '../../students/services/studentService';
import { startOfWeek, format } from 'date-fns';

export interface HomeworkActivity {
    id: string;
    titre: string;
    statut: string;
}

export interface HomeworkModule {
    id: string;
    nom: string;
    activities: HomeworkActivity[];
}

export interface HomeworkStudent {
    id: string;
    prenom: string;
    nom: string;
    modules: HomeworkModule[];
}

/**
 * Hook de suivi des travaux à domicile (Devoirs).
 */
export const useHomeworkTracking = (selectedGroupId: string | null, date: Date | null, lieu: 'classe' | 'domicile' = 'domicile') => {
    const [students, setStudents] = useState<HomeworkStudent[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedGroupId || !date) {
                setStudents([]);
                return;
            }

            setLoading(true);
            try {
                // 1. On récupère d'abord tous les élèves de la classe sélectionnée.
                const groupStudents = await studentService.getStudentsByGroup(selectedGroupId);
                if (!groupStudents || groupStudents.length === 0) {
                    setStudents([]);
                    return;
                }

                const studentIds = groupStudents.map(s => s.id);
                
                // On calcule le Lundi de la semaine en cours (standard de planification du logiciel).
                const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                const dayName = days[date.getDay()];

                /** 
                 * 2. RÉCUPÉRATION DU PLAN : 
                 * On regarde ce que les élèves ont noté dans leur agenda numérique (PlanificationHebdo).
                 */
                const { data: plans, error: planError } = await supabase
                    .from('PlanificationHebdo')
                    .select('eleve_id, activite_id, statut')
                    .in('eleve_id', studentIds)
                    .eq('semaine_debut', weekStart)
                    .eq('jour', dayName)
                    .eq('lieu', lieu);

                if (planError) throw planError;
                
                // On crée une table de recherche rapide pour savoir qui a prévu quoi.
                const plannedSet = new Set(plans.map(p => `${p.eleve_id}_${p.activite_id}`));
                const planStatusMap = new Map(plans.map(p => [`${p.eleve_id}_${p.activite_id}`, p.statut]));

                /** 
                 * 3. RÉCUPÉRATION DES ÉTATS RÉELS : 
                 * On va chercher la liste des exercices en cours ('Progression') pour ces élèves.
                 */
                const { data: progressions, error: progError } = await supabase
                    .from('Progression')
                    .select(`
                        eleve_id,
                        activite_id,
                        etat,
                        Activite!inner (
                            id,
                            titre,
                            ordre,
                            Module!inner (
                                id,
                                nom,
                                statut
                            )
                        )
                    `)
                    .in('eleve_id', studentIds)
                    .eq('Activite.Module.statut', 'en_cours');

                if (progError) throw progError;

                /** 
                 * 4. MISE EN FORME : 
                 * On regroupe les exercices par élève et par module pour un affichage propre.
                 */
                const studentsMap = new Map<string, HomeworkStudent>();

                // On initialise la liste avec tous nos élèves.
                groupStudents.forEach(s => {
                    studentsMap.set(s.id, { id: s.id, prenom: s.prenom || '', nom: s.nom || '', modules: [] });
                });

                if (progressions) {
                    progressions.forEach((prog: any) => {
                        const key = `${prog.eleve_id}_${prog.activite_id}`;
                        // CONDITION : On n'affiche QUE si l'élève avait prévu cet exercice ce jour-là.
                        if (!plannedSet.has(key)) return;

                        const student = studentsMap.get(prog.eleve_id);
                        if (!student || !prog.Activite || !prog.Activite.Module) return;

                        const modId = prog.Activite.Module.id;
                        const modNom = prog.Activite.Module.nom;
                        
                        let moduleObj = student.modules.find(m => m.id === modId);
                        if (!moduleObj) {
                            moduleObj = { id: modId, nom: modNom, activities: [] };
                            student.modules.push(moduleObj);
                        }

                        // On affiche le statut choisi par l'élève dans son kiosque.
                        const kioskStatut = planStatusMap.get(key) || 'non_demarre';

                        moduleObj.activities.push({
                            id: prog.activite_id,
                            titre: prog.Activite.titre,
                            statut: kioskStatut
                        });
                    });
                }

                // Pour finir, on ne garde que les élèves qui ont effectivement quelque chose à faire.
                const activeStudents = Array.from(studentsMap.values())
                    .filter(s => s.modules.length > 0)
                    .sort((a, b) => a.prenom.localeCompare(b.prenom));

                setStudents(activeStudents);
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };

        fetchData();
    }, [selectedGroupId, date]); // On relance le calcul si on change de classe ou de date.

    return { students, loading };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. PRÉPARATION : Lundi matin, Julie utilise son Kiosque et choisit de faire "Grammaire" et "Table de 5" à la maison le mardi soir.
 * 2. ACTION : Le mardi soir, l'enseignant ouvre le suivi "Domicile".
 * 3. ANALYSE : Le hook `useHomeworkTracking` cherche toutes les Julie de la classe.
 * 4. FILTRAGE : Le hook voit que pour Julie, le mardi soir, les exercices prévus sont "Grammaire" et "Table de 5".
 * 5. RÉSULTAT : Le dashboard de l'enseignant affiche : "Julie - Devoirs prévus : 2 (Grammaire, Table de 5)".
 * 6. CONTRÔLE : Le lendemain, l'enseignant pourra vérifier si Julie a effectivement validé ces exercices.
 */
