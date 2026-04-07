/**
 * Nom du module/fichier : useGroupPdfGenerator.tsx
 * 
 * Données en entrée : 
 *   - selectedGroup : Le groupe d'élèves pour lequel on veut générer les listes de travail.
 * 
 * Données en sortie : Un ensemble d'états pour suivre la progression :
 *   - isGenerating : Vrai si la génération est en cours.
 *   - progress : Pourcentage d'avancement (0 à 100).
 *   - progressText : Message informatif (ex: "Récupération des données...").
 *   - generateGroupTodoList : La fonction à appeler pour lancer la machine.
 * 
 * Objectif principal : Ce hook gère la création d'un gros fichier PDF regroupant les carnets de suivi de TOUS les élèves d'un groupe. Il utilise le "Mode Éco" (2 pages A5 sur une feuille A4) pour économiser du papier. Comme c'est une opération longue, il fournit tout le nécessaire pour afficher une barre de progression à l'écran.
 */

import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { fetchStudentPdfData } from '../../../lib/pdf';
import StudentTrackingPDFModern, { PDFStudentData } from '../../../components/StudentTrackingPDFModern';
import { Group } from '../../attendance/services/attendanceService';

/**
 * Hook pour piloter la génération du PDF groupé avec suivi visuel de l'avancement.
 */
export const useGroupPdfGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const abortRef = useRef(false);

    // Permet à l'enseignant de stopper la génération s'il s'est trompé de groupe par exemple.
    const cancelGeneration = useCallback(() => {
        if (isGenerating) {
            abortRef.current = true;
            setProgressText('Annulation en cours...');
        }
    }, [isGenerating]);

    /**
     * Cœur du réacteur : génère le PDF fusionné.
     */
    const generateGroupTodoList = useCallback(async (selectedGroup: Group | null) => {
        if (!selectedGroup) return;

        // Configuration par défaut : Mode Éco (format livret) activé.
        const ecoMode = true; 
        const filename = `Listes_Travail_${selectedGroup.nom?.replace(/\s+/g, '_')}_ECO.pdf`;
        let fileHandle: any = null;

        // 1. Tenter d'ouvrir la boîte de dialogue de sauvegarde (Navigateurs modernes type Chrome).
        if ((window as any).showSaveFilePicker) {
            try {
                fileHandle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
            } catch (err: any) {
                if (err.name === 'AbortError') return;
            }
        }

        // Pour les navigateurs plus anciens ou restrictifs (Safari), on pré-ouvre une fenêtre.
        let printWindow: Window | null = null;
        if (!fileHandle) {
            printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head><title>Génération en cours...</title></head>
                        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5;">
                            <h2>Génération du PDF en cours...</h2>
                            <p>Veuillez patienter, le document s'ouvrira automatiquement ici.</p>
                            <div style="margin-top: 20px; font-size: 12px; color: #666;">Ne fermez pas cette fenêtre.</div>
                        </body>
                    </html>
                `);
            }
        }

        setIsGenerating(true);
        abortRef.current = false;
        setProgress(5);
        setProgressText('Récupération des données...');

        try {
            if (abortRef.current) throw new Error('ABORTED');

            // 2. Récupérer la liste des IDs des élèves membres du groupe.
            const { data: links } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', selectedGroup.id);

            const studentIds = links?.map(l => l.eleve_id) || [];
            if (studentIds.length === 0) {
                alert("Aucun élève dans ce groupe.");
                setIsGenerating(false);
                if (printWindow) printWindow.close();
                return;
            }

            // Récupérer les détails des élèves (noms, niveaux).
            const { data: studentsInGroup } = await supabase
                .from('Eleve')
                .select('id, prenom, nom, niveau_id, Niveau(nom, ordre)')
                .in('id', studentIds);

            if (!studentsInGroup) {
                setIsGenerating(false);
                if (printWindow) printWindow.close();
                return;
            }

            // Trier les élèves par Niveau scolaire, puis par Prénom (ordre logique pour un enseignant).
            studentsInGroup.sort((a: any, b: any) => {
                const levelA = a.Niveau?.ordre || 999;
                const levelB = b.Niveau?.ordre || 999;
                if (levelA !== levelB) return levelA - levelB;

                const prenomCompare = (a.prenom || '').localeCompare(b.prenom || '');
                if (prenomCompare !== 0) return prenomCompare;

                return (a.nom || '').localeCompare(b.nom || '');
            });

            setProgress(10);
            setProgressText('Génération des données par élève...');

            // 3. Boucler sur chaque élève pour construire ses données PDF individuelles.
            const bulkData: PDFStudentData[] = [];
            let studentIndex = 0;

            for (const student of studentsInGroup as any[]) {
                if (abortRef.current) throw new Error('ABORTED');

                studentIndex++;
                const percentage = 10 + Math.round((studentIndex / studentsInGroup.length) * 30);
                setProgress(percentage);
                setProgressText(`Récupération: ${student.prenom} ${student.nom}...`);

                // On va chercher toutes les validations et activités pour cet élève précis.
                const pdfData = await fetchStudentPdfData(student.id, student.niveau_id);

                if (pdfData && pdfData.modules.length > 0) {
                    bulkData.push({
                        studentName: `${student.prenom} ${student.nom}`,
                        modules: pdfData.modules as any[],
                        printDate: new Date().toLocaleDateString('fr-FR')
                    });
                }
            }

            if (bulkData.length === 0) {
                alert("Aucun travail à faire trouvé pour ce groupe.");
                setIsGenerating(false);
                if (printWindow) printWindow.close();
                return;
            }

            setProgress(50);
            setProgressText('Préparation de la fusion...');

            // Chargement à la volée des lourdes bibliothèques de manipulation de PDF.
            const renderer = await import('@react-pdf/renderer');
            const { PDFDocument, rgb } = await import('pdf-lib');
            const { saveAs } = await import('file-saver');

            // Création du document final "Maître".
            const mergedPdf = await PDFDocument.create();

            // 4. Fusionner les PDF individuels un par un.
            let processed = 0;
            for (const studentData of bulkData) {
                if (abortRef.current) throw new Error('ABORTED');
                processed++;
                const percentage = 50 + Math.round((processed / bulkData.length) * 30);
                setProgress(percentage);
                setProgressText(`Génération : ${studentData.studentName}...`);

                // Génération du PDF "Réact" de l'élève en mémoire.
                const blob = await renderer.pdf(<StudentTrackingPDFModern data={studentData} />).toBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const studentDoc = await PDFDocument.load(arrayBuffer);
                
                // On copie les pages de l'élève vers le document maître.
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            // 5. Assemblage en Mode Éco (format Livret A5 sur feuilles A4).
            setProgress(85);
            setProgressText('Mise en page LIVRET A5...');
            const bookletPdf = await PDFDocument.create();
            const mergedPdfBytes = await mergedPdf.save();
            const srcDoc = await PDFDocument.load(mergedPdfBytes);
            const embeddedPages = await bookletPdf.embedPdf(srcDoc, srcDoc.getPageIndices());
            const pageCount = embeddedPages.length;

            // On prend les pages 2 par 2 pour les mettre côte à côte sur un A4 paysage.
            for (let i = 0; i < pageCount; i += 2) {
                if (abortRef.current) throw new Error('ABORTED');
                const assemblyPercentage = 85 + Math.round((i / pageCount) * 10);
                setProgress(assemblyPercentage);
                setProgressText(`Assemblage page ${Math.floor(i / 2) + 1}...`);

                const page = bookletPdf.addPage([841.89, 595.28]); // Format A4 Paysage
                const leftPage = embeddedPages[i];
                page.drawPage(leftPage, { x: 0, y: 0, width: 420.945, height: 595.28 });

                if (i + 1 < pageCount) {
                    const rightPage = embeddedPages[i + 1];
                    page.drawPage(rightPage, { x: 420.945, y: 0, width: 420.945, height: 595.28 });
                }
                // Petite ligne de coupe au milieu pour aider l'enseignant.
                page.drawLine({
                    start: { x: 420.945, y: 0 },
                    end: { x: 420.945, y: 595.28 },
                    thickness: 1,
                    color: rgb(0, 0, 0),
                });
            }

            const finalPdfBlob = new Blob([await bookletPdf.save()], { type: 'application/pdf' });

            setProgress(100);
            setProgressText('Terminé !');

            // 6. Livraison du fichier.
            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(finalPdfBlob);
                await writable.close();
            } else {
                if (printWindow) {
                    const url = URL.createObjectURL(finalPdfBlob);
                    printWindow.location.href = url;
                } else {
                    saveAs(finalPdfBlob, filename);
                }
            }

            // Réinitialisation après un court délai pour que l'utilisateur voie le "100%".
            setTimeout(() => {
                setIsGenerating(false);
                setProgress(0);
                setProgressText('');
            }, 2000);

        } catch (error: any) {
            if (error.message !== 'ABORTED') {
                console.error(error);
                alert("Erreur lors de la génération du PDF.");
            }
            if (printWindow) printWindow.close();
        } finally {
            if (!abortRef.current) setIsGenerating(false);
        }
    }, [isGenerating]);

    return {
        generateGroupTodoList,
        cancelGeneration,
        isGenerating,
        progress,
        progressText
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. INITIALISATION : L'enseignant choisit un groupe. Le hook prépare le terrain et affiche une barre de progression.
 * 2. RÉCUPÉRATION : Il liste tous les élèves du groupe et les trie par niveau scolaire (CP avant CE1, etc.).
 * 3. GÉNÉRATION INDIVIDUELLE : Pour chaque enfant, il va chercher ses activités à faire et génère une page PDF virtuelle.
 * 4. FUSION : Il rassemble toutes ces pages isolées dans un seul grand document.
 * 5. MISE EN PAGE ÉCO : Il transforme ce grand document en "livret" (2 pages par feuille) pour réduire la consommation de papier de 50%.
 * 6. TÉLÉCHARGEMENT : Il propose l'enregistrement du fichier final sur l'ordinateur.
 */
