import { useCallback } from 'react';
import React from 'react';
import { fetchStudentPdfData } from '../../../lib/pdf';
import { downloadFile } from '../../../lib/helpers/download';
import StudentTrackingPDFModern from '../../../components/StudentTrackingPDFModern';

export const useStudentPDF = () => {
    const generatePDF = useCallback(async (selectedStudent: any) => {
        if (!selectedStudent) {
            alert("Aucun élève sélectionné.");
            return;
        }

        try {
            const pdfResult = await fetchStudentPdfData(selectedStudent.id);
            if (!pdfResult || pdfResult.modules.length === 0) {
                alert("Aucune activité à faire trouvée.");
                return;
            }

            const pdfData = {
                studentName: `${selectedStudent.prenom} ${selectedStudent.nom}`,
                printDate: new Date().toLocaleDateString('fr-FR'),
                modules: pdfResult.modules
            };

            const { pdf } = await import('@react-pdf/renderer');
            const blob = await pdf(React.createElement(StudentTrackingPDFModern, { data: pdfData }) as any).toBlob();
            const fileName = `ToDoList_Suivi_${selectedStudent.prenom} _${selectedStudent.nom}.pdf`;

            await downloadFile(blob, fileName, "Document PDF");
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la génération du PDF.");
        }
    }, []);

    return { generatePDF };
};
