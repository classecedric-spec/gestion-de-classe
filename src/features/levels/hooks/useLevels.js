import { useState, useEffect, useCallback, useMemo } from 'react';
import { levelService } from '../services/levelService';
import { toast } from 'sonner';

export const useLevels = () => {
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Fetch Levels
    const fetchLevels = useCallback(async () => {
        setLoading(true);
        try {
            const data = await levelService.fetchLevels();
            setLevels(data);

            // Auto-select first if none selected
            if (data.length > 0 && !selectedLevel) {
                // Check if the current selected level still exists, if not select first
                setSelectedLevel(data[0]);
            }
        } catch (error) {
            console.error("Error fetching levels:", error);
            toast.error("Erreur lors du chargement des niveaux");
        } finally {
            setLoading(false);
        }
    }, [selectedLevel]);

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
    const createLevel = async (levelData) => {
        try {
            const newLevel = await levelService.createLevel(levelData);
            setLevels(prev => [...prev, newLevel]); // Order might be issue, but normally appended
            setSelectedLevel(newLevel);
            toast.success("Niveau créé avec succès");
            return true;
        } catch (error) {
            console.error("Error creating level:", error);
            toast.error("Erreur lors de la création");
            return false;
        }
    };

    const updateLevel = async (id, levelData) => {
        try {
            const updated = await levelService.updateLevel(id, levelData);
            setLevels(prev => prev.map(l => l.id === id ? updated : l));
            if (selectedLevel && selectedLevel.id === id) {
                setSelectedLevel(updated);
            }
            toast.success("Niveau mis à jour");
            return true;
        } catch (error) {
            console.error("Error updating level:", error);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    const deleteLevel = async (id) => {
        try {
            await levelService.deleteLevel(id);
            const newLevels = levels.filter(l => l.id !== id);
            setLevels(newLevels);

            if (selectedLevel && selectedLevel.id === id) {
                setSelectedLevel(newLevels.length > 0 ? newLevels[0] : null);
            }
            toast.success("Niveau supprimé");
            return true;
        } catch (error) {
            console.error("Error deleting level:", error);
            toast.error("Erreur lors de la suppression");
            return false;
        }
    };

    const reorderLevels = async (newLevels) => {
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
            // Revert would be nice here but keeping it simple for now
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
