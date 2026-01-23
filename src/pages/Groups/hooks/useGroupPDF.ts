import React from 'react';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import StudentTrackingPDFModern from '../../../components/StudentTrackingPDFModern';

/**
 * useGroupPDF - Hook pour la génération de PDF de groupe
 */
export const useGroupPDF = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const abortRef = useRef(false);

    const handleCancelGeneration = useCallback(() => {
        if (loading) {
            abortRef.current = true;
            setProgressText('Annulation en cours...');
        }
    }, [loading]);

    const handleGenerateGroupTodoList = useCallback(async (selectedGroup: any, studentsInGroup: any[], ecoMode = false) => {
        if (!selectedGroup || studentsInGroup.length === 0) return;

        const filename = `Listes_Travail_${selectedGroup.nom.replace(/\s+/g, '_')}${ecoMode ? '_ECO' : ''}.pdf`;
        let fileHandle: any = null;

        // Try to open Save Dialog
        // @ts-ignore
        if (window.showSaveFilePicker) {
            try {
                // @ts-ignore
                fileHandle = await window.showSaveFilePicker({
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

        setLoading(true);
        abortRef.current = false;
        setProgress(10);
        setProgressText('Récupération des données...');

        try {
            if (abortRef.current) throw new Error('ABORTED');

            // Fetch data
            const { data: modulesData, error: modulesError } = await supabase
                .from('Module')
                .select(`
                    id,
                    nom,
                    date_fin,
                    Activite (
                        id,
                        titre
                    )
                `)
                .order('date_fin', { ascending: true });

            if (modulesError) throw modulesError;

            const { data: progressions, error: progError } = await supabase
                .from('Progression')
                .select('*')
                .in('eleve_id', studentsInGroup.map(s => s.id));

            if (progError) throw progError;

            // Build bulk data
            const bulkData = studentsInGroup.map(student => {
                const studentProgress = progressions?.filter(p => p.eleve_id === student.id) || [];

                const activeModules = modulesData?.map(module => {
                    if (!module.date_fin) return null;

                    const moduleActivities = module.Activite || [];
                    const relevantActivities = moduleActivities.filter((act: any) => {
                        const prog = studentProgress.find(p => p.activite_id === act.id);
                        return prog && prog.etat !== 'valide';
                    });

                    if (relevantActivities.length === 0) return null;

                    return {
                        title: module.nom,
                        dueDate: module.date_fin,
                        activities: relevantActivities.map((a: any) => ({ name: a.titre }))
                    };
                }).filter(Boolean);

                if (!activeModules || activeModules.length === 0) return null;

                return {
                    studentName: `${student.prenom} ${student.nom}`,
                    modules: activeModules,
                    printDate: new Date().toLocaleDateString('fr-FR')
                };
            }).filter(Boolean);

            if (bulkData.length === 0) {
                alert("Aucun travail à faire trouvé pour ce groupe.");
                setLoading(false);
                return;
            }

            setProgress(10);
            setProgressText('Préparation de la fusion...');

            // Dynamic import PDF libraries
            // @ts-ignore
            const { pdf } = await import('@react-pdf/renderer');
            // @ts-ignore
            const { saveAs } = await import('file-saver');
            // @ts-ignore
            const { PDFDocument, rgb } = await import('pdf-lib');

            // Generate & Merge PDFs
            const mergedPdf = await PDFDocument.create();

            let processed = 0;
            for (const studentData of bulkData) {
                if (abortRef.current) throw new Error('ABORTED');
                processed++;
                const percentage = 10 + Math.round((processed / bulkData.length) * 70);
                setProgress(percentage);
                setProgressText(`Génération : ${studentData.studentName}...`);

                const blob = await pdf(React.createElement(StudentTrackingPDFModern as any, { data: studentData })).toBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const studentDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page: any) => mergedPdf.addPage(page));
            }

            let finalPdfBlob;

            // Eco Mode (2 pages per sheet)
            if (ecoMode) {
                setProgress(82);
                setProgressText('Mise en page LIVRET A5...');

                const bookletPdf = await PDFDocument.create();
                const mergedPdfBytes = await mergedPdf.save();
                const srcDoc = await PDFDocument.load(mergedPdfBytes);
                const embeddedPages = await bookletPdf.embedPdf(srcDoc, srcDoc.getPageIndices());
                const pageCount = embeddedPages.length;

                for (let i = 0; i < pageCount; i += 2) {
                    if (abortRef.current) throw new Error('ABORTED');

                    const assemblyPercentage = 82 + Math.round((i / pageCount) * 13);
                    setProgress(assemblyPercentage);
                    setProgressText(`Assemblage page ${Math.floor(i / 2) + 1}...`);

                    const page = bookletPdf.addPage([841.89, 595.28]);
                    const leftPage = embeddedPages[i];

                    page.drawPage(leftPage, {
                        x: 0,
                        y: 0,
                        width: 420.945,
                        height: 595.28
                    });

                    if (i + 1 < pageCount) {
                        const rightPage = embeddedPages[i + 1];
                        page.drawPage(rightPage, {
                            x: 420.945,
                            y: 0,
                            width: 420.945,
                            height: 595.28
                        });
                    }

                    page.drawLine({
                        start: { x: 420.945, y: 0 },
                        end: { x: 420.945, y: 595.28 },
                        thickness: 1,
                        color: rgb(0, 0, 0),
                    });
                }

                const bookletBytes = await bookletPdf.save();
                finalPdfBlob = new Blob([bookletBytes], { type: 'application/pdf' });
            } else {
                const mergedPdfBytes = await mergedPdf.save();
                finalPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            }

            setProgress(90);
            setProgressText('Finalisation du fichier...');

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(finalPdfBlob);
                await writable.close();
            } else {
                saveAs(finalPdfBlob, filename);
            }

            setProgress(100);
            setProgressText('Téléchargement terminé !');
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 2000);

        } catch (error: any) {
            if (error.message !== 'ABORTED') {
                alert("Erreur lors de la génération du PDF.");
            }
        } finally {
            setLoading(false);
            setProgress(0);
        }
    }, []);

    return {
        loading,
        progress,
        progressText,
        handleGenerateGroupTodoList,
        handleCancelGeneration
    };
};
