import { useState } from 'react';
import { supabase } from '../lib/database';
import { toast } from 'sonner';

/**
 * Hook for updating activity status
 */
export const useActivityStatus = (
    studentId: string | null,
    onUpdate: (activityId: string, newStatus: string) => void
) => {
    const [savingActivity, setSavingActivity] = useState<string | null>(null);

    const updateStatus = async (activityId: string, newStatus: string) => {
        if (!studentId) return;
        setSavingActivity(activityId);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Check if progression exists
            const { data: existing } = await supabase
                .from('Progression')
                .select('id')
                .eq('eleve_id', studentId)
                .eq('activite_id', activityId)
                .maybeSingle();

            if (existing) {
                // Update
                await supabase
                    .from('Progression')
                    .update({
                        etat: newStatus,
                        updated_at: new Date().toISOString(),
                        user_id: user?.id
                    })
                    .eq('id', existing.id);
            } else {
                // Insert
                await supabase
                    .from('Progression')
                    .insert({
                        eleve_id: studentId,
                        activite_id: activityId,
                        etat: newStatus,
                        user_id: user?.id
                    });
            }

            // Update local state
            onUpdate(activityId, newStatus);

            const statusLabels: Record<string, string> = {
                'a_commencer': 'À commencer',
                'en_cours': 'En cours',
                'termine': 'Terminé'
            };
            toast.success(statusLabels[newStatus] || 'Mis à jour');
        } catch (error: any) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setSavingActivity(null);
        }
    };

    return { updateStatus, savingActivity };
};
