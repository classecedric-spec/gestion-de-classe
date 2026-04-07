/**
 * Nom du module/fichier : useGroupStudents.ts
 * 
 * Données en entrée : 
 *   - `selectedGroup` : Le groupe actuellement sélectionné par l'enseignant (ou "null" si aucun n'est choisi).
 * 
 * Données en sortie : 
 *   - `studentsInGroup` : La liste de tous les élèves inscrits dans ce groupe (avec leurs détails : nom, prénom, classe).
 *   - `loadingStudents` : Indicateur de chargement (pour afficher un spinner pendant que les données arrivent).
 *   - Outils de gestion : Fonctions pour retirer un élève du groupe avec confirmation visuelle.
 * 
 * Objectif principal : Gérer la "composition" d'un groupe d'élèves. Ce Hook est responsable de charger la liste des membres d'un groupe précis depuis la base de données. Il gère également le processus de "désinscription" (retrait d'un élève d'un groupe), en s'assurant que l'interface reste réactive et fluide grâce à des mises à jour instantanées ("optimistes").
 * 
 * Ce que ça affiche : Rien visuellement (fournisseur de données pour la section "Membres du groupe").
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';

// Type enrichi : un élève classique auquel on ajoute l'information de sa classe.
export interface StudentWithClass extends Tables<'Eleve'> {
    Classe?: { nom: string };
}

/**
 * Assistant spécialisé dans la gestion des élèves au sein d'un groupe.
 */
export const useGroupStudents = (selectedGroup: Tables<'Groupe'> | null) => {
    // ÉTATS LOCAUX
    const [studentsInGroup, setStudentsInGroup] = useState<StudentWithClass[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentToRemove, setStudentToRemove] = useState<StudentWithClass | null>(null);
    const [showRemoveModal, setShowRemoveModal] = useState(false);

    /** 
     * CHARGEMENT DES MEMBRES : 
     * Cette fonction interroge la base de données en deux temps pour récupérer 
     * les fiches complètes des élèves inscrits dans le groupe.
     */
    const fetchStudentsInGroup = useCallback(async (groupId: string) => {
        if (!groupId) {
            setStudentsInGroup([]);
            return;
        }

        setLoadingStudents(true);
        try {
            /** 
             * ÉTAPE 1 : RÉCUPÉRATION DES LIENS
             * On cherche d'abord dans la "table de liaison" (EleveGroupe) 
             * pour savoir quels identifiants d'élèves sont associés à ce groupe.
             */
            const { data: links, error: linkError } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            if (linkError) throw linkError;

            // On extrait simplement la liste des identifiants (IDs).
            const studentIds = links.map(l => l.eleve_id);

            // Si le groupe est vide, on s'arrête ici.
            if (studentIds.length === 0) {
                setStudentsInGroup([]);
                return;
            }

            /** 
             * ÉTAPE 2 : RÉCUPÉRATION DES FICHES DÉTAILLÉES
             * On télécharge les informations (nom, prénom, classe) de tous les élèves identifiés.
             */
            const { data, error } = await supabase
                .from('Eleve')
                .select('*, Classe(nom), niveau_id')
                .in('id', studentIds)
                .order('nom'); // Tri alphabétique pour un affichage ordonné.

            if (error) throw error;
            setStudentsInGroup(data as StudentWithClass[] || []);
        } catch (error) {
            console.error('Erreur lors de la récupération des élèves du groupe:', error);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    /**
     * PRÉPARATION DU RETRAIT : 
     * Mémorise l'élève que l'enseignant souhaite enlever et affiche la confirmation.
     */
    const handleRemoveClick = useCallback((e: React.MouseEvent, student: StudentWithClass) => {
        e.stopPropagation();
        setStudentToRemove(student);
        setShowRemoveModal(true);
    }, []);

    /**
     * CONFIRMATION DU RETRAIT : 
     * Désinscrit officiellement l'élève du groupe dans le Cloud.
     */
    const confirmRemoveStudent = useCallback(async () => {
        if (!selectedGroup || !studentToRemove) return;

        const previousStudents = [...studentsInGroup];
        const studentId = studentToRemove.id;

        /** 
         * MISE À JOUR OPTIMISTE : 
         * On retire l'élève de l'écran immédiatement pour que l'enseignant n'attende pas le serveur.
         */
        setStudentsInGroup(prev => prev.filter(s => s.id !== studentId));
        setShowRemoveModal(false);
        setStudentToRemove(null);

        try {
            // Suppression effective du lien dans la base de données.
            const { error } = await supabase
                .from('EleveGroupe')
                .delete()
                .match({ eleve_id: studentId, groupe_id: selectedGroup.id });

            if (error) throw error;
        } catch (error: any) {
            console.error('Erreur lors du retrait de l\'élève:', error);
            // En cas d'échec technique (ex: coupure internet), on remet l'élève dans la liste.
            setStudentsInGroup(previousStudents);
            alert('Impossible de retirer l\'élève pour le moment. Vérifiez votre connexion.');
        }
    }, [selectedGroup, studentToRemove, studentsInGroup]);

    /** 
     * SURVEILLANCE DE SÉLECTION : 
     * Dès que l'enseignant clique sur un autre groupe dans la liste, 
     * on déclenche automatiquement le chargement de ses membres.
     */
    useEffect(() => {
        if (selectedGroup) {
            fetchStudentsInGroup(selectedGroup.id);
        } else {
            setStudentsInGroup([]);
        }
    }, [selectedGroup, fetchStudentsInGroup]);

    return {
        studentsInGroup,
        loadingStudents,
        studentToRemove,
        showRemoveModal,
        setShowRemoveModal,
        handleRemoveClick,
        confirmRemoveStudent,
        fetchStudentsInGroup
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur le groupe "Besoin Soutien" dans la barre latérale.
 * 2. Le Hook `useGroupStudents` détecte le changement de sélection.
 * 3. Il vide la liste actuelle et affiche une icône de chargement.
 * 4. Il demande au Cloud : "Quels élèves appartiennent au groupe 'Besoin Soutien' ?".
 * 5. Il reçoit les fiches de "Julien", "Sarah" et "Basile" (avec leurs noms de classe respectifs).
 * 6. Les fiches s'affichent sous forme de cartes dans la vue détaillée.
 * 7. L'enseignant clique sur la croix pour retirer "Basile" :
 *    - Une fenêtre surgit : "Voulez-vous retirer Basile du groupe ?".
 *    - L'enseignant confirme.
 * 8. Basile disparaît instantanément de l'affichage (grâce à la mise à jour optimiste).
 * 9. Le Hook ordonne à la base de données de supprimer le lien de parenté entre Basile et ce groupe.
 */
