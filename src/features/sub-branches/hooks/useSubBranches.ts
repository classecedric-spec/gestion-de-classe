import { useState, useCallback, useMemo, useEffect } from 'react';
import { subBranchService, SubBranchWithParent, SousBrancheInsert, SousBrancheUpdate } from '../services/subBranchService';
import { toast } from 'sonner';

export const useSubBranches = () => {
    const [subBranches, setSubBranches] = useState<SubBranchWithParent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedSubBranch, setSelectedSubBranch] = useState<SubBranchWithParent | null>(null);

    // Fetch all sub-branches
    const fetchSubBranches = useCallback(async () => {
        setLoading(true);
        try {
            const data = await subBranchService.fetchAll();
            setSubBranches(data);

            // Auto-select first if none selected
            if (data.length > 0 && !selectedSubBranch) {
                // Determine if we should really auto-select. Original code says yes.
                // Keeping original behavior.
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
    const createSubBranch = useCallback(async (subBranchData: SousBrancheInsert): Promise<boolean> => {
        try {
            const newSubBranch = await subBranchService.create(subBranchData);
            setSubBranches(prev => [...prev, newSubBranch].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
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
    const updateSubBranch = useCallback(async (id: string, subBranchData: SousBrancheUpdate): Promise<boolean> => {
        try {
            const updated = await subBranchService.update(id, subBranchData);
            setSubBranches(prev =>
                prev.map(sb => sb.id === id ? updated : sb).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
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
    const deleteSubBranch = useCallback(async (id: string): Promise<boolean> => {
        try {
            await subBranchService.delete(id);
            setSubBranches(prev => prev.filter(sb => sb.id !== id));

            if (selectedSubBranch?.id === id) {
                setSelectedSubBranch(null);
            }

            toast.success('Sous-branche supprimée avec succès');
            return true;
        } catch (error: any) {
            console.error('Error deleting sub-branch:', error);
            toast.error(error.message || 'Erreur lors de la suppression');
            return false;
        }
    }, [selectedSubBranch]);

    // Filtered sub-branches based on search
    const filteredSubBranches = useMemo(() => {
        return subBranches.filter(sb =>
            (sb.nom && sb.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
