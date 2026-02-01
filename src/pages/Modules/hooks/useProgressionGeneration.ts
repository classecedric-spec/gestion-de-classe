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
            const studentIds = students.map(s => s.id);

            setProgress(15);
            setProgressText(`${students.length} élèves trouvés...`);

            // 2. Fetch all activities for this module
            const activities = selectedModule.Activite || [];
            const activityIds = activities.map((a: any) => a.id);

            // 3. Fetch EXISTING progressions to prevent duplicates/errors
            // We need to know which (student, activity) pairs already exist.
            const existingProgressions = await trackingService.getProgressionsForStudentsAndActivities(studentIds, activityIds);
            const existingMap = new Set(
                existingProgressions.map((p: any) => `${p.eleve_id}_${p.activite_id}`)
            );

            const progressionsToInsert: any[] = [];
            const currentUser = await getCurrentUser();

            let activityIndex = 0;
            for (const activity of activities) {
                activityIndex++;
                const currentPercentage = 15 + Math.round((activityIndex / activities.length) * 75);
                setProgress(currentPercentage);
                setProgressText(`Analyse : ${activity.titre}...`);

                // Get levels associated with this activity
                const activityLevels = activity.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];

                for (const student of students) {
                    // Logic:
                    // 1. Check if progression already exists
                    if (existingMap.has(`${student.id}_${activity.id}`)) continue;

                    // 2. Check Level Match
                    // If activity has levels, student MUST match one of them.
                    // If activity has NO levels (generic), we assign to everyone? 
                    // Let's assume Yes for generic activities.
                    const isLevelMatch = activityLevels.length === 0 || activityLevels.includes(student.niveau_id);

                    if (isLevelMatch) {
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
                setProgressText(`Enregistrement de ${progressionsToInsert.length} progressions...`);
                // Use upsert or create? Repository create uses insert.
                // Since we filtered existing, insert should be safe, but concurrent races could happen.
                // We'll trust our filter.
                await trackingService.createProgressions(progressionsToInsert);

                setProgress(100);
                showNotification(`${progressionsToInsert.length} lignes de progression générées avec succès !`, 'success');
                setSelectedGroups([]);
                setDetailTab('progression'); // Switch to progression tab to see results
            } else {
                showNotification("Toutes les progressions nécessaires existent déjà ou aucun niveau ne correspond.", 'success');
                setSelectedGroups([]);
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
