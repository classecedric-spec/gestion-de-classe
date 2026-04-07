/**
 * Nom du module/fichier : useStudentPhoto.ts
 * 
 * Données en entrée : 
 *   - setSelectedStudent : Fonction permettant de mettre à jour l'élève actuellement affiché en détail.
 *   - setStudents : Fonction permettant de rafraîchir la liste globale de tous les élèves.
 * 
 * Données en sortie : 
 *   - Des outils pour gérer le "glisser-déposer" (Drag & Drop) d'une photo sur une fiche élève.
 *   - Des indicateurs d'état (isDraggingPhoto, draggingPhotoId) pour changer l'apparence visuelle au survol d'une image.
 *   - Un indicateur de chargement (updatingPhotoId) pour afficher une icône d'attente pendant l'envoi.
 * 
 * Objectif principal : Simplifier au maximum l'ajout de photos d'identité pour les élèves. Ce Hook permet à l'enseignant de prendre une image sur son ordinateur et de la "lâcher" directement sur le portrait d'un enfant pour l'enregistrer. Il s'occupe de compresser l'image automatiquement (pour économiser de la place) et de l'envoyer dans le coffre-fort numérique (Cloud) de l'application. 
 * 
 * Ce que ça affiche : Rien (fournisseur de logique pour les cartes élèves et le panneau de détails).
 */

import { useState, useCallback } from 'react';
import { studentService } from '../services/studentService';
// @ts-ignore
import { resizeAndConvertToBase64 } from '../../../lib/storage';

/**
 * Assistant pour la gestion simplifiée des portraits d'élèves.
 */
export const useStudentPhoto = (setSelectedStudent: any, setStudents: any) => {
    // États pour savoir si une photo est en cours de "vol" au-dessus de l'écran
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
    const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
    const [updatingPhotoId, setUpdatingPhotoId] = useState<string | null>(null);

    /**
     * CŒUR DU TRAITEMENT : 
     * Cette fonction prend une photo brute, la réduit à une petite taille (pour la rapidité)
     * et l'envoie sur le serveur avant de mettre à jour l'affichage.
     */
    const processAndSavePhoto = useCallback(async (file: File, student: any) => {
        if (!student) return;

        // VÉRIFICATION : On n'accepte que des images (pas de PDF ou de fichiers divers).
        if (!file.type.match('image.*')) {
            alert("Format non supporté. Veuillez déposer une image (JPG ou PNG).");
            return;
        }

        setUpdatingPhotoId(student.id);
        try {
            /** 
             * OPTIMISATION : On compresse la photo à 200x200 pixels.
             * Cela permet de garder une application fluide, même pour les classes avec beaucoup d'enfants.
             */
            const base64 = await resizeAndConvertToBase64(file, 200, 200);

            // ENVOI PHYSIQUE : On demande au service d'envoyer l'image au stockage distant.
            const publicUrl = await studentService.uploadStudentPhoto(student.id, base64);

            if (publicUrl) {
                // MISE À JOUR BASE DE DONNÉES : On enregistre le nouveau lien de la photo.
                await studentService.updateStudent(student.id, { photo_url: publicUrl });

                // RAFRAÎCHISSEMENT VISUEL : On met à jour Julie immédiatement sur l'écran.
                const updated = { ...student, photo_url: publicUrl };
                if (setSelectedStudent) {
                    setSelectedStudent((prev: any) => prev?.id === student.id ? updated : prev);
                }
                if (setStudents) {
                    setStudents((prev: any[]) => prev.map(s => s.id === updated.id ? updated : s));
                }
            }
        } catch (err) {
            console.error("Erreur technique lors du traitement de la photo:", err);
            alert("Désolé, impossible d'enregistrer la photo pour le moment.");
        } finally {
            setUpdatingPhotoId(null);
        }
    }, [setSelectedStudent, setStudents]);

    /**
     * GESTION DU "DROP" : 
     * Se déclenche quand l'enseignant relâche enfin sa souris avec le fichier au-dessus de l'élève.
     */
    const handlePhotoDrop = useCallback(async (e: React.DragEvent, student: any) => {
        e.preventDefault();
        setIsDraggingPhoto(false);
        setDraggingPhotoId(null);
        const file = e.dataTransfer.files[0];
        if (file) await processAndSavePhoto(file, student);
    }, [processAndSavePhoto]);

    /**
     * GESTION DU "SURVOL" : 
     * Prévient l'interface qu'une photo est en train d'être déplacée au-dessus d'un élève.
     * Cela permet d'afficher un cadre bleu d'invitation ("Déposer ici").
     */
    const handlePhotoDragOver = useCallback((e: React.DragEvent, studentId: string | null = null) => {
        e.preventDefault();
        if (studentId) {
            setDraggingPhotoId(studentId);
        } else {
            setIsDraggingPhoto(true);
        }
    }, []);

    const handlePhotoDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingPhoto(false);
        setDraggingPhotoId(null);
    }, []);

    /**
     * GESTION CLASSIQUE : 
     * Si le professeur préfère cliquer sur le bouton "Choisir un fichier" plutôt que de glisser.
     */
    const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, student: any) => {
        const file = e.target.files?.[0];
        if (file) await processAndSavePhoto(file, student);
    }, [processAndSavePhoto]);

    return {
        isDraggingPhoto,
        draggingPhotoId,
        updatingPhotoId,
        setDraggingPhotoId,
        processAndSavePhoto,
        handlePhotoDrop,
        handlePhotoDragOver,
        handlePhotoDragLeave,
        handlePhotoChange
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant a une photo de l'élève "Julie" sur son bureau.
 * 2. Il fait glisser ce fichier au-dessus du trombinoscope de l'application.
 * 3. En passant sur Julie, le Hook `useStudentPhoto` fait briller sa carte pour dire : "C'est ici !".
 * 4. L'enseignant lâche le fichier (Drop).
 * 5. Le Hook bloque la carte de Julie avec une petite icône de chargement.
 * 6. Il réduit discrètement la photo pour qu'elle s'affiche vite, puis l'envoie sur le serveur sécurisé.
 * 7. Une fois l'envoi terminé, la nouvelle photo de Julie apparaît instantanément sur l'écran du prof.
 * 8. L'opération est terminée en moins de 2 secondes.
 */
