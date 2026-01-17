import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { activityService } from '../services/activityService';

export const useMaterialTypes = () => {
    const [materialTypes, setMaterialTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchMaterialTypes = async () => {
        setLoading(true);
        try {
            const data = await activityService.getMaterialTypes();
            setMaterialTypes(data);
        } catch (error) {
            console.error("Error fetching material types:", error);
        } finally {
            setLoading(false);
        }
    };

    const createMaterialType = async (name) => {
        if (!name.trim()) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const newType = await activityService.createMaterialType(name.trim(), user.id);
            setMaterialTypes(prev => [...prev, newType].sort((a, b) => a.nom.localeCompare(b.nom)));
            return newType;
        } catch (error) {
            console.error("Error creating material type:", error);
            throw error;
        }
    };

    const updateMaterialType = async (id, name) => {
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

    const deleteMaterialType = async (id) => {
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
    }, []);

    return {
        materialTypes,
        loading,
        createMaterialType,
        updateMaterialType,
        deleteMaterialType,
        refresh: fetchMaterialTypes
    };
};
