import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { fetchStudentPdfData } from '../../../lib/pdf';
import StudentTrackingPDFModern, { PDFStudentData } from '../../../components/StudentTrackingPDFModern';
import { Group } from '../../attendance/services/attendanceService';

/**
 * useGroupPdfGenerator
 * Hook to handle group PDF generation with progress tracking
 */
export const useGroupPdfGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const abortRef = useRef(false);

    const cancelGeneration = useCallback(() => {
        if (isGenerating) {
            abortRef.current = true;
            setProgressText('Annulation en cours...');
        }
    }, [isGenerating]);

    const generateGroupTodoList = useCallback(async (selectedGroup: Group | null) => {
        if (!selectedGroup) return;

        const ecoMode = true; // Always Eco Mode for Home Quick Access
        const filename = `Listes_Travail_${selectedGroup.nom?.replace(/\s+/g, '_')}_ECO.pdf`;
        let fileHandle: any = null;

        // 1. Try to open Save Dialog immediately
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

        // If no file handle (e.g. Safari), open window immediately to bypass popup blockers
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

            // 2. Fetch students in group
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

            // Fetch students with their level info
            const { data: studentsInGroup } = await supabase
                .from('Eleve')
                .select('id, prenom, nom, niveau_id, Niveau(nom, ordre)')
                .in('id', studentIds);

            if (!studentsInGroup) {
                setIsGenerating(false);
                if (printWindow) printWindow.close();
                return;
            }

            // Sort students: Niveau (ordre) -> Prénom -> Nom
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

            // 3. Fetch PDF data for each student
            const bulkData: PDFStudentData[] = [];
            let studentIndex = 0;

            for (const student of studentsInGroup as any[]) {
                if (abortRef.current) throw new Error('ABORTED');

                studentIndex++;
                const percentage = 10 + Math.round((studentIndex / studentsInGroup.length) * 30);
                setProgress(percentage);
                setProgressText(`Récupération: ${student.prenom} ${student.nom}...`);

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

            // Dynamic import PDF libraries
            const renderer = await import('@react-pdf/renderer');
            const { PDFDocument, rgb } = await import('pdf-lib');
            const { saveAs } = await import('file-saver');

            const mergedPdf = await PDFDocument.create();

            let processed = 0;
            for (const studentData of bulkData) {
                if (abortRef.current) throw new Error('ABORTED');
                processed++;
                const percentage = 50 + Math.round((processed / bulkData.length) * 30);
                setProgress(percentage);
                setProgressText(`Génération : ${studentData.studentName}...`);

                const blob = await renderer.pdf(<StudentTrackingPDFModern data={studentData} />).toBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const studentDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            // Eco Mode Assembly
            setProgress(85);
            setProgressText('Mise en page LIVRET A5...');
            const bookletPdf = await PDFDocument.create();
            const mergedPdfBytes = await mergedPdf.save();
            const srcDoc = await PDFDocument.load(mergedPdfBytes);
            const embeddedPages = await bookletPdf.embedPdf(srcDoc, srcDoc.getPageIndices());
            const pageCount = embeddedPages.length;

            for (let i = 0; i < pageCount; i += 2) {
                if (abortRef.current) throw new Error('ABORTED');
                const assemblyPercentage = 85 + Math.round((i / pageCount) * 10);
                setProgress(assemblyPercentage);
                setProgressText(`Assemblage page ${Math.floor(i / 2) + 1}...`);

                const page = bookletPdf.addPage([841.89, 595.28]); // A4 Landscape
                const leftPage = embeddedPages[i];
                page.drawPage(leftPage, { x: 0, y: 0, width: 420.945, height: 595.28 });

                if (i + 1 < pageCount) {
                    const rightPage = embeddedPages[i + 1];
                    page.drawPage(rightPage, { x: 420.945, y: 0, width: 420.945, height: 595.28 });
                }
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

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(finalPdfBlob);
                await writable.close();
            } else {
                // Should now work for Safari: redirect the pre-opened window
                if (printWindow) {
                    const url = URL.createObjectURL(finalPdfBlob);
                    printWindow.location.href = url;
                } else {
                    // Fallback using saveAs if window failed to open
                    saveAs(finalPdfBlob, filename);
                }
            }

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
