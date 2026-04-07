/**
 * Nom du module/fichier : useGroupPDF.ts
 * 
 * Données en entrée : 
 *   - `selectedGroup` : Le groupe pour lequel on souhaite imprimer les documents.
 *   - `studentsInGroup` : La liste des élèves membres du groupe.
 *   - `ecoMode` : Option (vrai/faux) permettant d'imprimer deux fiches par feuille pour économiser le papier.
 * 
 * Données en sortie : 
 *   - Un fichier PDF unique (format .pdf) regroupant toutes les "Listes de tâches" des élèves.
 *   - État de progression (`loading`, `progress`, `progressText`) pour informer l'enseignant de l'avancement.
 * 
 * Objectif principal : Automatiser la création de documents de travail personnalisés. Ce Hook est une véritable "usine à PDF" : il analyse le parcours de chaque élève du groupe, identifie les activités qu'ils n'ont pas encore validées dans leurs modules pédagogiques, et génère un document d'impression complet. Son "Mode Éco" intelligent permet de passer du format A4 au format livret (A5) automatiquement pour réduire l'empreinte écologique.
 * 
 * Ce que ça affiche : Une barre de progression visuelle qui avance au fur et à mesure de la création du document.
 */

import React from 'react';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import StudentTrackingPDFModern from '../../../components/StudentTrackingPDFModern';

/**
 * Assistant spécialisé dans la production massive de documents PDF pour les groupes.
 */
export const useGroupPDF = () => {
    // ÉTATS DE CONTRÔLE VISUEL
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');

    // INTERRUPTEUR D'URGENCE : Permet d'arrêter le processus si l'utilisateur annule.
    const abortRef = useRef(false);

    /** 
     * ANNULATION : 
     * Stoppe instantanément toutes les opérations de génération en cours.
     */
    const handleCancelGeneration = useCallback(() => {
        if (loading) {
            abortRef.current = true;
            setProgressText('Annulation en cours...');
        }
    }, [loading]);

    /** 
     * GÉNÉRATION PRINCIPALE : 
     * Orchestre tout le flux, de la récupération des données au téléchargement final.
     */
    const handleGenerateGroupTodoList = useCallback(async (selectedGroup: any, studentsInGroup: any[], ecoMode = false) => {
        if (!selectedGroup || studentsInGroup.length === 0) return;

        const filename = `Listes_Travail_${selectedGroup.nom.replace(/\s+/g, '_')}${ecoMode ? '_ECO' : ''}.pdf`;
        let fileHandle: any = null;

        // ÉTAPE PRÉALABLE : On demande au navigateur où enregistrer le fichier (si disponible).
        // @ts-ignore
        if (window.showSaveFilePicker) {
            try {
                // @ts-ignore
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Document PDF',
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

            /** 
             * ÉTAPE 1 : RÉCUPÉRATION PÉDAGOGIQUE
             * On télécharge les modules actifs et leurs activités pour savoir ce qui doit être fait.
             */
            const { data: modulesData, error: modulesError } = await supabase
                .from('Module')
                .select(`
                    id, nom, date_fin,
                    Activite ( id, titre )
                `)
                .order('date_fin', { ascending: true });

            if (modulesError) throw modulesError;

            /** 
             * ÉTAPE 2 : ANALYSE DES PROGRESSIONS
             * On récupère d'un coup l'état d'avancement de tous les élèves du groupe.
             */
            const { data: progressions, error: progError } = await supabase
                .from('Progression')
                .select('*')
                .in('eleve_id', studentsInGroup.map(s => s.id));

            if (progError) throw progError;

            /** 
             * ÉTAPE 3 : DIAGNOSTIC INDIVIDUEL
             * On calcule pour chaque enfant la liste précise de ses travaux non terminés.
             */
            const bulkData = studentsInGroup.map(student => {
                const studentProgress = progressions?.filter(p => p.eleve_id === student.id) || [];

                const activeModules = modulesData?.map(module => {
                    if (!module.date_fin) return null;

                    const moduleActivities = module.Activite || [];
                    const relevantActivities = moduleActivities.filter((act: any) => {
                        const prog = studentProgress.find(p => p.activite_id === act.id);
                        // On ne retient que les activités entamées mais PAS encore validées.
                        return prog && prog.etat !== 'valide';
                    });

                    if (relevantActivities.length === 0) return null;

                    return {
                        title: module.nom,
                        dueDate: module.date_fin,
                        activities: relevantActivities.map((a: any) => ({ name: a.titre }))
                    };
                }).filter(Boolean);

                // Si l'élève est à jour (rien à faire), on ne génère pas de page pour lui.
                if (!activeModules || activeModules.length === 0) return null;

                return {
                    studentName: `${student.prenom} ${student.nom}`,
                    modules: activeModules,
                    printDate: new Date().toLocaleDateString('fr-FR')
                };
            }).filter(Boolean);

            if (bulkData.length === 0) {
                alert("Tout le monde est à jour ! Aucun travail à faire trouvé pour ce groupe.");
                setLoading(false);
                return;
            }

            /** 
             * ÉTAPE 4 : FABRICATION DU PDF
             * On importe les outils de dessin de PDF et on assemble les pages une à une.
             */
            // Chargement différé pour ne pas ralentir le reste de l'application.
            // @ts-ignore
            const { pdf } = await import('@react-pdf/renderer');
            // @ts-ignore
            const { saveAs } = await import('file-saver');
            // @ts-ignore
            const { PDFDocument, rgb } = await import('pdf-lib');

            const mergedPdf = await PDFDocument.create();

            let processed = 0;
            for (const studentData of bulkData) {
                if (abortRef.current) throw new Error('ABORTED');
                processed++;
                const percentage = 10 + Math.round((processed / bulkData.length) * 70);
                setProgress(percentage);
                setProgressText(`Création de la fiche : ${studentData.studentName}...`);

                // On génère la page de l'élève et on l'ajoute au document global.
                const blob = await pdf(React.createElement(StudentTrackingPDFModern as any, { data: studentData })).toBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const studentDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page: any) => mergedPdf.addPage(page));
            }

            let finalPdfBlob;

            /** 
             * ÉTAPE 5 : OPTIMISATION ÉCOLOGIQUE (MODE ÉCO)
             * Si activé, on réarrange les pages deux par deux sur des feuilles A4 paysage.
             */
            if (ecoMode) {
                setProgress(82);
                setProgressText('Réduction en format livret (économie de papier)...');

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

                    const page = bookletPdf.addPage([841.89, 595.28]); // A4 Paysage
                    
                    // Placement de la fiche 1 (gauche)
                    page.drawPage(embeddedPages[i], { x: 0, y: 0, width: 420.945, height: 595.28 });

                    // Placement de la fiche 2 (droite) si elle existe
                    if (i + 1 < pageCount) {
                        page.drawPage(embeddedPages[i + 1], { x: 420.945, y: 0, width: 420.945, height: 595.28 });
                    }

                    // Une ligne de coupe au milieu pour l'enseignant.
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

            /** 
             * ÉTAPE 6 : FINALISATION ET TÉLÉCHARGEMENT
             */
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
            setProgressText('Le document est prêt !');
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 2000);

        } catch (error: any) {
            if (error.message !== 'ABORTED') {
                console.error('Erreur PDF:', error);
                alert("Une erreur technique empêche la génération du PDF.");
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur "Produire les listes de travail (PDF)" pour son groupe de lecture.
 * 2. Le Hook `useGroupPDF` s'active et affiche une barre de progression.
 * 3. Il contacte le serveur pour faire le point : "Quels exercices Julie, Marc et Basile doivent-ils encore terminer ?".
 * 4. Il reçoit les résultats : Julie a 3 exercices en retard, Marc 0, Basile 2.
 * 5. Le Hook prépare le document :
 *    - Il dessine une page personnalisée pour Julie.
 *    - Il ignore Marc (car il n'a aucun retard).
 *    - Il dessine une page personnalisée pour Basile.
 * 6. Si le "Mode Éco" est actif : 
 *    - Il réduit les pages et les colle deux par deux sur des feuilles A4.
 *    - Il trace un trait pointillé au milieu pour aider au découpage.
 * 7. Le document final est proposé au téléchargement.
 * 8. L'enseignant l'ouvre, l'imprime et distribue les feuilles aux élèves concernés.
 */
