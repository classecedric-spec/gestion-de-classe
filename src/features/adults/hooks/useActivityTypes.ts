import { useState, useEffect, useCallback } from 'react';
import { adultService, ActivityType } from '../services/adultService';
import { toast } from 'sonner';

export const useActivityTypes = () => {
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchActivityTypes = useCallback(async () => {
        setLoading(true);
        try {
            let data = await adultService.fetchActivityTypes();
            if (data.length === 0) {
                // Auto-seed if empty
                const seeded = await adultService.seedDefaultActivityTypes();
                data = seeded || [];
            }
            setActivityTypes(data);
        } catch (error) {
            console.error("Error fetching activity types:", error);
            toast.error("Erreur lors du chargement des types d'actions");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActivityTypes();
    }, [fetchActivityTypes]);

    const createActivityType = async (label: string): Promise<boolean> => {
        try {
            const newType = await adultService.createActivityType(label);
            setActivityTypes(prev => [...prev, newType]);
            toast.success("Action ajoutée");
            return true;
        } catch (error) {
            console.error("Error creating activity type:", error);
            toast.error("Erreur lors de la création");
            return false;
        }
    };

    const updateActivityType = async (id: string, label: string): Promise<boolean> => {
        try {
            const updatedType = await adultService.updateActivityType(id, label);
            setActivityTypes(prev => prev.map(t => t.id === id ? updatedType : t));
            toast.success("Action mise à jour");
            return true;
        } catch (error) {
            console.error("Error updating activity type:", error);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    const deleteActivityType = async (id: string): Promise<boolean> => {
        try {
            await adultService.deleteActivityType(id);
            setActivityTypes(prev => prev.filter(t => t.id !== id));
            toast.success("Action supprimée");
            return true;
        } catch (error) {
            console.error("Error deleting activity type:", error);
            toast.error("Erreur lors de la suppression");
            return false;
        }
    };

    return {
        activityTypes,
        loading,
        fetchActivityTypes,
        createActivityType,
        updateActivityType,
        deleteActivityType
    };
};
