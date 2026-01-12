import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * useProgressionGeneration
 * Handles progression generation for selected groups
 * 
 * @param {function} showNotification - Notification callback
 * @param {function} setSelectedGroups - Reset groups after generation
 * @param {function} setDetailTab - Navigate tabs after generation
 * @returns {object} Progression generation state and actions
 */
export function useProgressionGeneration(showNotification, setSelectedGroups, setDetailTab) {
    const [generatingProgressions, setGeneratingProgressions] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');

    const generateProgressions = async (selectedGroups, selectedModule) => {
        if (selectedGroups.length === 0 || !selectedModule) return;

        setGeneratingProgressions(true);
        setProgress(5);
        setProgressText('Recherche des élèves...');

        try {
            // 1. Fetch all students from selected groups
            const { data: students, error: studentsError } = await supabase
                .from('Eleve')
                .select('id, prenom, nom, niveau_id, EleveGroupe!inner(groupe_id)')
                .in('EleveGroupe.groupe_id', selectedGroups);

            if (studentsError) throw studentsError;

            setProgress(15);
            setProgressText(`${students.length} élèves trouvés...`);

            // 2. Fetch all activities for this module
            const activities = selectedModule.Activite || [];
            const progressionsToInsert = [];

            let studentIndex = 0;
            for (const student of students) {
                studentIndex++;
                const currentPercentage = 15 + Math.round((studentIndex / students.length) * 75);
                setProgress(currentPercentage);
                setProgressText(`Analyse : ${student.prenom} ${student.nom}...`);

                for (const activity of activities) {
                    // Get levels associated with this activity
                    const activityLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];

                    // STRICT MATCHING RULE: Only if levels exist and match student level
                    if (activityLevels.length === 0) continue;

                    if (activityLevels.includes(student.niveau_id)) {
                        progressionsToInsert.push({
                            eleve_id: student.id,
                            activite_id: activity.id,
                            etat: 'a_commencer',
                            user_id: (await supabase.auth.getUser()).data.user?.id,
                            date_limite: selectedModule.date_fin || null
                        });
                    }
                }
            }

            if (progressionsToInsert.length > 0) {
                setProgress(95);
                setProgressText('Enregistrement en base de données...');
                const { error: insertError } = await supabase
                    .from('Progression')
                    .upsert(progressionsToInsert, {
                        onConflict: 'eleve_id, activite_id',
                        ignoreDuplicates: true
                    });

                if (insertError) throw insertError;

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
