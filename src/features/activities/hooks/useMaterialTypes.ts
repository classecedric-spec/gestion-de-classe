import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { activityService } from '../services/activityService';
import { Tables } from '../../../types/supabase';

export type MaterialType = Tables<'TypeMateriel'>;

interface UseMaterialTypesReturn {
    materialTypes: MaterialType[];
    loading: boolean;
    createMaterialType: (name: string) => Promise<MaterialType | undefined>;
    updateMaterialType: (id: string, name: string) => Promise<void>;
    deleteMaterialType: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export const useMaterialTypes = (): UseMaterialTypesReturn => {
    const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMaterialTypes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await activityService.getMaterialTypes();
            setMaterialTypes(data);
        } catch (error) {
            console.error("Error fetching material types:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const createMaterialType = async (name: string) => {
        if (!name.trim()) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");
            const newType = await activityService.createMaterialType(name.trim(), user.id);
            setMaterialTypes(prev => [...prev, newType].sort((a, b) => a.nom.localeCompare(b.nom)));
            return newType;
        } catch (error) {
            console.error("Error creating material type:", error);
            throw error;
        }
    };

    const updateMaterialType = async (id: string, name: string) => {
        if (!name.trim()) return;
        try {
            await activityService.updateMaterialType(id, name.trim());
            setMaterialTypes(prev => prev.map(mt =>
                mt.id === id ? { ...mt, nom: name.trim() } : mt
            ).sort((a, b) => a.nom.localeCompare(b.nom)));
        } catch (error) {
            console.error("Error updating material type:", error);
            throw error;
        }
    };

    const deleteMaterialType = async (id: string) => {
        try {
            await activityService.deleteMaterialType(id);
            setMaterialTypes(prev => prev.filter(mt => mt.id !== id));
        } catch (error) {
            console.error("Error deleting material type:", error);
            throw error;
        }
    };

    useEffect(() => {
        fetchMaterialTypes();
    }, [fetchMaterialTypes]);

    return {
        materialTypes,
        loading,
        createMaterialType,
        updateMaterialType,
        deleteMaterialType,
        refresh: fetchMaterialTypes
    };
};
