import { useState, useEffect, useCallback, useMemo } from 'react';
import { levelService } from '../services/levelService';
import { LevelWithStudentCount } from '../../../types';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export const useLevels = () => {
    const [levels, setLevels] = useState<LevelWithStudentCount[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<LevelWithStudentCount | null>(null);
    const [students, setStudents] = useState<Tables<'Eleve'>[]>([]);
    const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

    // Fetch Levels
    const fetchLevels = useCallback(async () => {
        setLoading(true);
        try {
            const data = await levelService.fetchLevels();
            setLevels(data);

            // Auto-select first if none selected (using functional update to avoid dependency)
            setSelectedLevel(current => {
                if (current) return current;
                return data.length > 0 ? data[0] : null;
            });
        } catch (error) {
            console.error("Error fetching levels:", error);
            toast.error("Erreur lors du chargement des niveaux");
        } finally {
            setLoading(false);
        }
    }, []); // Removed selectedLevel dependency

    useEffect(() => {
        fetchLevels();
    }, [fetchLevels]);

    // Fetch Students when selected level changes
    useEffect(() => {
        if (selectedLevel) {
            const loadStudents = async () => {
                setLoadingStudents(true);
                try {
                    const data = await levelService.fetchStudents(selectedLevel.id);
                    setStudents(data);
                } catch (error) {
                    console.error("Error fetching students:", error);
                    toast.error("Erreur lors du chargement des élèves");
                } finally {
                    setLoadingStudents(false);
                }
            };
            loadStudents();
        } else {
            setStudents([]);
        }
    }, [selectedLevel]);

    // Computed: Filtered levels
    const filteredLevels = useMemo(() => {
        return levels.filter(l =>
            l.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [levels, searchTerm]);

    // Actions
    const createLevel = async (levelData: TablesInsert<'Niveau'>): Promise<boolean> => {
        try {
            const newLevel = await levelService.createLevel(levelData);
            setLevels(prev => [...prev, newLevel]);
            setSelectedLevel(newLevel);
            toast.success("Niveau créé avec succès");
            return true;
        } catch (error) {
            console.error("Error creating level:", error);
            toast.error("Erreur lors de la création");
            return false;
        }
    };

    const updateLevel = async (id: string, levelData: TablesUpdate<'Niveau'>): Promise<boolean> => {
        const previousLevels = [...levels];
        const previousSelected = selectedLevel;

        // Optimistic UI Update
        setLevels(prev => prev.map(l => l.id === id ? { ...l, ...levelData } as LevelWithStudentCount : l));
        if (selectedLevel && selectedLevel.id === id) {
            setSelectedLevel(prev => prev ? ({ ...prev, ...levelData } as LevelWithStudentCount) : null);
        }

        try {
            const updated = await levelService.updateLevel(id, levelData);
            // Replace with server data for consistency
            setLevels(prev => prev.map(l => l.id === id ? updated : l));
            if (selectedLevel && selectedLevel.id === id) {
                setSelectedLevel(updated);
            }
            toast.success("Niveau mis à jour");
            return true;
        } catch (error) {
            console.error("Error updating level:", error);
            // Revert on error
            setLevels(previousLevels);
            setSelectedLevel(previousSelected);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    const deleteLevel = async (id: string): Promise<boolean> => {
        const previousLevels = [...levels];
        const previousSelected = selectedLevel;

        // Optimistic UI Update
        const newLevels = levels.filter(l => l.id !== id);
        setLevels(newLevels);

        if (selectedLevel && selectedLevel.id === id) {
            setSelectedLevel(newLevels.length > 0 ? newLevels[0] : null);
        }

        try {
            await levelService.deleteLevel(id);
            toast.success("Niveau supprimé");
            return true;
        } catch (error) {
            console.error("Error deleting level:", error);
            // Revert on error
            setLevels(previousLevels);
            setSelectedLevel(previousSelected);
            toast.error("Erreur lors de la suppression");
            return false;
        }
    };

    const reorderLevels = async (newLevels: LevelWithStudentCount[]) => {
        // Optimistic update
        setLevels(newLevels);

        try {
            const updates = newLevels.map((item, index) => ({
                id: item.id,
                nom: item.nom,
                user_id: item.user_id,
                ordre: index + 1
            }));
            await levelService.updateOrder(updates);
        } catch (error) {
            console.error("Error reordering levels:", error);
            toast.error("Erreur lors de la réorganisation");
            fetchLevels();
        }
    };

    return {
        levels,
        loading,
        filteredLevels,
        searchTerm,
        setSearchTerm,
        selectedLevel,
        setSelectedLevel,
        students,
        loadingStudents,
        createLevel,
        updateLevel,
        deleteLevel,
        reorderLevels
    };
};
