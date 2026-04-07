/**
 * Nom du module/fichier : useStudentPDF.ts
 * 
 * Données en entrée : L'objet complet de l'élève dont on souhaite générer le document (nom, prénom, identifiant).
 * 
 * Données en sortie : Un fichier PDF professionnel et imprimable, téléchargé directement sur l'ordinateur de l'enseignant.
 * 
 * Objectif principal : Transformer les données de suivi numérique en documents papier concrets. Ce Hook permet de générer en un clic un "Plan de Travail" ou un "Bilan de Suivi" (To-Do List) personnalisé pour un enfant. Il va chercher les activités que l'élève doit encore accomplir et les met en page de façon élégante et lisible pour une impression de qualité, facilitant ainsi le travail en autonomie dans la classe.
 * 
 * Ce que ça affiche : Rien directement à l'écran (déclenche le téléchargement du fichier par le navigateur).
 */

import { useCallback } from 'react';
import React from 'react';
import { fetchStudentPdfData } from '../../../lib/pdf';
import { downloadFile } from '../../../lib/helpers/download';
import StudentTrackingPDFModern from '../../../components/StudentTrackingPDFModern';

/**
 * Assistant pour la génération de documents PDF personnalisés pour les élèves.
 */
export const useStudentPDF = () => {
    
    /**
     * MOTEUR DE GÉNÉRATION : 
     * Cette fonction orchestre la récupération des données pédagogiques et leur "dessin" dans un fichier PDF.
     */
    const generatePDF = useCallback(async (selectedStudent: any) => {
        if (!selectedStudent) {
            alert("Veuillez d'abord sélectionner un élève.");
            return;
        }

        try {
            /** 
             * ÉTAPE 1 : COLLECTE DES DONNÉES
             * On va chercher l'intégralité du parcours pédagogique de l'élève 
             * (ateliers restants, modules, niveaux de difficulté).
             */
            const pdfResult = await fetchStudentPdfData(selectedStudent.id);
            if (!pdfResult || pdfResult.modules.length === 0) {
                alert("Cet élève n'a actuellement aucune activité prévue dans son plan de travail.");
                return;
            }

            // Préparation du paquet d'informations pour la mise en page
            const pdfData = {
                studentName: `${selectedStudent.prenom} ${selectedStudent.nom}`,
                printDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                modules: pdfResult.modules
            };

            /** 
             * ÉTAPE 2 : CHARGEMENT DU MOTEUR DE DESSIN
             * On n'importe la bibliothèque `@react-pdf/renderer` que maintenant (chargement différé). 
             * Cela permet de ne pas alourdir l'application tant que le prof ne clique pas sur le bouton.
             */
            const { pdf } = await import('@react-pdf/renderer');

            /** 
             * ÉTAPE 3 : MISE EN PAGE
             * On utilise le modèle visuel `StudentTrackingPDFModern` pour transformer nos données en un document élégant.
             */
            const blob = await pdf(React.createElement(StudentTrackingPDFModern, { data: pdfData }) as any).toBlob();
            
            // Nommage intelligent du fichier pour que l'enseignant le retrouve facilement
            const fileName = `Plan_de_travail_${selectedStudent.prenom}_${selectedStudent.nom}.pdf`;

            /** 
             * ÉTAPE 4 : LIVRAISON
             * Ordonne au navigateur d'enregistrer le fichier final sur le disque dur.
             */
            await downloadFile(blob, fileName, "Document PDF");

        } catch (error) {
            console.error("Échec technique de la génération du PDF:", error);
            alert("Désolé, une erreur technique a empêché la création du document PDF.");
        }
    }, []);

    return { generatePDF };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant consulte la fiche de "Lucas" et clique sur le bouton "Générer son Plan de Travail".
 * 2. Le Hook `useStudentPDF` se réveille et interroge la base de données : "Quelles activités Lucas doit-il encore valider ?".
 * 3. Il reçoit la liste (ex: 4 ateliers de Mathématiques, 2 de Français).
 * 4. Le Hook démarre l'usine à PDF en arrière-plan.
 * 5. Il dessine une belle page avec le portrait (si possible), le nom de Lucas, et ses cases à cocher pour chaque atelier.
 * 6. Il transforme ce dessin virtuel en un fichier informatique réel.
 * 7. Une fenêtre de téléchargement s'ouvre sur l'ordinateur du professeur : "Lucas_Plan_Travail.pdf" est prêt à être imprimé.
 */
