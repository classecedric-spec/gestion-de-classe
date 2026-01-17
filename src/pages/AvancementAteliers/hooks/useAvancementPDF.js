import React from 'react';
import { useState, useCallback } from 'react';
import AvancementPDF from '../../../components/AvancementPDF';

/**
 * useAvancementPDF - Hook pour la génération de PDF d'avancement
 */
export const useAvancementPDF = () => {
    const [generatingPDF, setGeneratingPDF] = useState(false);

    const handleGeneratePDF = useCallback(async (data) => {
        const { students, activities, progressions, groups, modules, branches, selectedGroupId, selectedModuleId, selectedBrancheId, selectedDateFin, dateOperator } = data;

        if (students.length === 0 || activities.length === 0) {
            alert('Veuillez sélectionner un groupe et un module/date avec des données.');
            return;
        }

        const selectedGroup = groups.find(g => g.id === selectedGroupId);
        const selectedModule = modules.find(m => m.id === selectedModuleId);
        const filename = `Avancement_${selectedGroup?.nom || 'Groupe'}_${new Date().toISOString().split('T')[0]}.pdf`;

        let fileHandle = null;

        if (window.showSaveFilePicker) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        setGeneratingPDF(true);
        try {
            //Dynamic import PDF libraries
            const { pdf } = await import('@react-pdf/renderer');
            const { saveAs } = await import('file-saver');

            const blob = await pdf(
                React.createElement(AvancementPDF, {
                    students,
                    activities,
                    progressions,
                    groupName: selectedGroup?.nom,
                    moduleName: selectedModule?.nom,
                    branchName: branches.find(b => b.id === selectedBrancheId)?.nom,
                    date: selectedDateFin,
                    dateOperator
                })
            ).toBlob();

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                saveAs(blob, filename);
            }
        } catch (error) {
            alert('Erreur lors de la génération du PDF.');
        } finally {
            setGeneratingPDF(false);
        }
    }, []);

    return {
        generatingPDF,
        handleGeneratePDF
    };
};
