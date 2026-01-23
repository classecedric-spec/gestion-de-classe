import { useState } from 'react';
import { getCurrentUser } from '../../../lib/database';
import { studentService } from '../../../features/students/services/studentService';
import { trackingService } from '../../../features/tracking/services/trackingService';

/**
 * useProgressionGeneration
 * Handles progression generation for selected groups
 * 
 * @param {function} showNotification - Notification callback
 * @param {function} setSelectedGroups - Reset groups after generation
 * @param {function} setDetailTab - Navigate tabs after generation
 * @returns {object} Progression generation state and actions
 */
export function useProgressionGeneration(
    showNotification: (msg: string, type?: 'success' | 'error') => void,
    setSelectedGroups: (groups: string[]) => void,
    setDetailTab: (tab: string) => void
) {
    const [generatingProgressions, setGeneratingProgressions] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');

    const generateProgressions = async (selectedGroups: string[], selectedModule: any) => {
        if (selectedGroups.length === 0 || !selectedModule) return;

        setGeneratingProgressions(true);
        setProgress(5);
        setProgressText('Recherche des élèves...');

        try {
            // 1. Fetch all students from selected groups
            const students = await studentService.getStudentsByGroups(selectedGroups);

            setProgress(15);
            setProgressText(`${students.length} élèves trouvés...`);

            // 2. Fetch all activities for this module
            const activities = selectedModule.Activite || [];
            const progressionsToInsert: any[] = [];

            let studentIndex = 0;
            for (const student of students) {
                studentIndex++;
                const currentPercentage = 15 + Math.round((studentIndex / students.length) * 75);
                setProgress(currentPercentage);
                setProgressText(`Analyse : ${student.prenom} ${student.nom}...`);

                for (const activity of activities) {
                    // Get levels associated with this activity
                    const activityLevels = activity.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];

                    // STRICT MATCHING RULE: Only if levels exist and match student level
                    if (activityLevels.length === 0) continue;

                    if (activityLevels.includes(student.niveau_id)) {
                        const currentUser = await getCurrentUser();
                        progressionsToInsert.push({
                            eleve_id: student.id,
                            activite_id: activity.id,
                            etat: 'a_commencer',
                            user_id: currentUser?.id,
                            date_limite: selectedModule.date_fin || null
                        });
                    }
                }
            }

            if (progressionsToInsert.length > 0) {
                setProgress(95);
                setProgressText('Enregistrement en base de données...');
                await trackingService.createProgressions(progressionsToInsert);

                setProgress(100);
                showNotification(`${progressionsToInsert.length} lignes de progression générées !`);
                setSelectedGroups([]);
                setDetailTab('activities');
            } else {
                showNotification("Aucun élève correspondant aux niveaux des activités n'a été trouvé dans ces groupes.", 'error');
            }
        } catch (err) {
            showNotification("Erreur lors de la génération des progressions.", 'error');
            console.error('Progression generation error:', err);
        } finally {
            setGeneratingProgressions(false);
            setProgress(0);
            setProgressText('');
        }
    };

    return {
        states: {
            generatingProgressions,
            progress,
            progressText
        },
        actions: {
            generateProgressions
        }
    };
}
