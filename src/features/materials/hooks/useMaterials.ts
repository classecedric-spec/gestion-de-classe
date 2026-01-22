import { useState, useCallback, useMemo, useEffect } from 'react';
import { materialService, TypeMateriel, MaterialActivity, TypeMaterielInsert, TypeMaterielUpdate } from '../services/materialService';
import { toast } from 'sonner';

export const useMaterials = () => {
    const [materiels, setMateriels] = useState<TypeMateriel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMateriel, setSelectedMateriel] = useState<TypeMateriel | null>(null);

    // Linked activities state
    const [linkedActivities, setLinkedActivities] = useState<MaterialActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Fetch all materials
    const fetchMateriels = useCallback(async () => {
        setLoading(true);
        try {
            const data = await materialService.fetchAll();
            setMateriels(data);

            // Auto-select first if none selected and data exists
            if (data.length > 0 && !selectedMateriel) {
                setSelectedMateriel(data[0]);
            }
        } catch (error) {
            console.error('Error fetching materiels:', error);
            toast.error('Erreur lors du chargement du matériel');
        } finally {
            setLoading(false);
        }
    }, [selectedMateriel]);

    // Fetch linked activities when selected material changes
    const fetchLinkedActivitiesDetails = useCallback(async (id: string | undefined) => {
        if (!id) {
            setLinkedActivities([]);
            return;
        }

        setLoadingActivities(true);
        try {
            const activities = await materialService.fetchLinkedActivities(id);
            setLinkedActivities(activities);
        } catch (error) {
            console.error('Error fetching linked activities:', error);
            setLinkedActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    }, []);

    // Watch for selected material changes
    useEffect(() => {
        if (selectedMateriel) {
            fetchLinkedActivitiesDetails(selectedMateriel.id);
        } else {
            setLinkedActivities([]);
        }
    }, [selectedMateriel, fetchLinkedActivitiesDetails]);

    // Create material
    const createMateriel = useCallback(async (materialData: Omit<TypeMaterielInsert, 'user_id'>) => {
        try {
            const newMateriel = await materialService.create(materialData);
            setMateriels(prev => [...prev, newMateriel].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
            setSelectedMateriel(newMateriel);
            toast.success('Matériel créé avec succès');
            return true;
        } catch (error) {
            console.error('Error creating material:', error);
            toast.error('Erreur lors de la création');
            return false;
        }
    }, []);

    // Update material
    const updateMateriel = useCallback(async (id: string, materialData: TypeMaterielUpdate) => {
        try {
            const updated = await materialService.update(id, materialData);
            setMateriels(prev =>
                prev.map(m => m.id === id ? updated : m).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
            );

            if (selectedMateriel?.id === id) {
                setSelectedMateriel(updated);
            }

            toast.success('Matériel modifié avec succès');
            return true;
        } catch (error) {
            console.error('Error updating material:', error);
            toast.error('Erreur lors de la modification');
            return false;
        }
    }, [selectedMateriel]);

    // Delete material
    const deleteMateriel = useCallback(async (id: string) => {
        try {
            await materialService.delete(id);
            const updatedList = materiels.filter(m => m.id !== id);
            setMateriels(updatedList);

            if (selectedMateriel?.id === id) {
                // Select next available
                setSelectedMateriel(updatedList.length > 0 ? updatedList[0] : null);
            }

            toast.success('Matériel supprimé avec succès');
            return true;
        } catch (error: any) {
            console.error('Error deleting material:', error);
            // Specific error for constraint violation (linked activities)
            if (error.code === '23503') { // Foreign key violation
                toast.error("Impossible de supprimer : ce matériel est lié à des activités.");
            } else {
                toast.error("Erreur lors de la suppression");
            }
            return false;
        }
    }, [selectedMateriel, materiels]);

    // Create filtered list
    const filteredMateriels = useMemo(() => {
        return materiels.filter(m =>
            (m.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.acronyme && m.acronyme.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [materiels, searchTerm]);

    // Load initial data
    useEffect(() => {
        fetchMateriels();
    }, [fetchMateriels]);

    return {
        materiels,
        loading,
        searchTerm,
        setSearchTerm,
        selectedMateriel,
        setSelectedMateriel,
        filteredMateriels,
        linkedActivities,
        loadingActivities,
        createMateriel,
        updateMateriel,
        deleteMateriel,
        fetchMateriels
    };
};

export default useMaterials;
