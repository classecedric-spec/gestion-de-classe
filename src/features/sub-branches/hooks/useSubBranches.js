import { useState, useCallback, useMemo, useEffect } from 'react';
import { subBranchService } from '../services/subBranchService';
import { toast } from 'sonner';

export const useSubBranches = () => {
    const [subBranches, setSubBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubBranch, setSelectedSubBranch] = useState(null);

    // Fetch all sub-branches
    const fetchSubBranches = useCallback(async () => {
        setLoading(true);
        try {
            const data = await subBranchService.fetchAll();
            setSubBranches(data);

            // Auto-select first if none selected
            if (data.length > 0 && !selectedSubBranch) {
                setSelectedSubBranch(data[0]);
            }
        } catch (error) {
            console.error('Error fetching sub-branches:', error);
            toast.error('Erreur lors du chargement des sous-branches');
        } finally {
            setLoading(false);
        }
    }, [selectedSubBranch]);

    // Create sub-branch
    const createSubBranch = useCallback(async (subBranchData) => {
        try {
            const newSubBranch = await subBranchService.create(subBranchData);
            setSubBranches(prev => [...prev, newSubBranch].sort((a, b) => a.nom.localeCompare(b.nom)));
            setSelectedSubBranch(newSubBranch);
            toast.success('Sous-branche créée avec succès');
            return true;
        } catch (error) {
            console.error('Error creating sub-branch:', error);
            toast.error('Erreur lors de la création');
            return false;
        }
    }, []);

    // Update sub-branch
    const updateSubBranch = useCallback(async (id, subBranchData) => {
        try {
            const updated = await subBranchService.update(id, subBranchData);
            setSubBranches(prev =>
                prev.map(sb => sb.id === id ? updated : sb).sort((a, b) => a.nom.localeCompare(b.nom))
            );

            if (selectedSubBranch?.id === id) {
                setSelectedSubBranch(updated);
            }

            toast.success('Sous-branche modifiée avec succès');
            return true;
        } catch (error) {
            console.error('Error updating sub-branch:', error);
            toast.error('Erreur lors de la modification');
            return false;
        }
    }, [selectedSubBranch]);

    // Delete sub-branch
    const deleteSubBranch = useCallback(async (id) => {
        try {
            await subBranchService.delete(id);
            setSubBranches(prev => prev.filter(sb => sb.id !== id));

            if (selectedSubBranch?.id === id) {
                setSelectedSubBranch(null);
            }

            toast.success('Sous-branche supprimée avec succès');
            return true;
        } catch (error) {
            console.error('Error deleting sub-branch:', error);
            toast.error(error.message || 'Erreur lors de la suppression');
            return false;
        }
    }, [selectedSubBranch]);

    // Filtered sub-branches based on search
    const filteredSubBranches = useMemo(() => {
        return subBranches.filter(sb =>
            sb.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sb.Branche?.nom && sb.Branche.nom.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [subBranches, searchTerm]);

    // Initial fetch
    useEffect(() => {
        fetchSubBranches();
    }, [fetchSubBranches]);

    return {
        subBranches,
        loading,
        searchTerm,
        setSearchTerm,
        selectedSubBranch,
        setSelectedSubBranch,
        filteredSubBranches,
        createSubBranch,
        updateSubBranch,
        deleteSubBranch,
        fetchSubBranches,
    };
};

export default useSubBranches;
