import { useState, useEffect, useCallback, useMemo } from 'react';
import { branchService } from '../services/branchService';
import { toast } from 'sonner';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type BrancheInsert = Database['public']['Tables']['Branche']['Insert'];
type BrancheUpdate = Database['public']['Tables']['Branche']['Update'];

type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];
type SousBrancheInsert = Database['public']['Tables']['SousBranche']['Insert'];
type SousBrancheUpdate = Database['public']['Tables']['SousBranche']['Update'];

// Extended Update types matching what reorder functions expect (containing just enough info)
interface BranchReorderItem extends BrancheUpdate {
    id: string;
    nom: string;
    ordre: number;
}

interface SubBranchReorderItem extends SousBrancheUpdate {
    id: string;
    nom: string;
    branche_id: string;
    ordre: number;
}

export const useBranches = () => {
    const [branches, setBranches] = useState<BrancheRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<BrancheRow | null>(null);
    const [subBranches, setSubBranches] = useState<SousBrancheRow[]>([]);
    const [loadingSub, setLoadingSub] = useState<boolean>(false);

    // Fetch Branches
    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const data = await branchService.fetchBranches();
            setBranches(data);

            if (data.length > 0 && !selectedBranch) {
                setSelectedBranch(data[0]);
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
            toast.error("Erreur lors du chargement des branches");
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    // Fetch SubBranches
    const fetchSubBranches = useCallback(async (branchId: string) => {
        if (!branchId) {
            setSubBranches([]);
            return;
        }
        setLoadingSub(true);
        try {
            const data = await branchService.fetchSubBranches(branchId);
            setSubBranches(data);
        } catch (error) {
            console.error("Error fetching sub-branches:", error);
            // toast.error("Erreur chargement sous-branches"); // Optional, might be too noisy
        } finally {
            setLoadingSub(false);
        }
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            fetchSubBranches(selectedBranch.id);
        } else {
            setSubBranches([]);
        }
    }, [selectedBranch, fetchSubBranches]);

    // Computed
    const filteredBranches = useMemo(() => {
        return branches.filter(b =>
            b.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [branches, searchTerm]);

    // Actions
    const createBranch = async (branchData: BrancheInsert): Promise<boolean> => {
        try {
            const newBranch = await branchService.createBranch(branchData);
            setBranches(prev => [...prev, newBranch]);
            setSelectedBranch(newBranch);
            toast.success("Branche créée");
            return true;
        } catch (error) {
            console.error("Error creating branch:", error);
            toast.error("Erreur lors de la création");
            return false;
        }
    };

    const updateBranch = async (id: string, branchData: BrancheUpdate): Promise<boolean> => {
        try {
            const updated = await branchService.updateBranch(id, branchData);
            setBranches(prev => prev.map(b => b.id === id ? updated : b));
            if (selectedBranch && selectedBranch.id === id) {
                setSelectedBranch(updated);
            }
            toast.success("Branche mise à jour");
            return true;
        } catch (error) {
            console.error("Error updating branch:", error);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    const deleteBranch = async (id: string): Promise<boolean> => {
        try {
            await branchService.deleteBranch(id);
            const newBranches = branches.filter(b => b.id !== id);
            setBranches(newBranches);

            if (selectedBranch && selectedBranch.id === id) {
                setSelectedBranch(newBranches.length > 0 ? newBranches[0] : null);
            }
            toast.success("Branche supprimée");
            return true;
        } catch (error: any) {
            console.error("Error deleting branch:", error);
            toast.error(error.message || "Erreur lors de la suppression");
            return false;
        }
    };

    const reorderBranches = async (newBranches: BrancheRow[]) => {
        setBranches(newBranches);
        try {
            const updates = newBranches.map((item, index) => ({
                id: item.id,
                nom: item.nom,
                user_id: item.user_id,
                photo_base64: item.photo_base64,
                ordre: index + 1
            }));
            await branchService.updateOrder(updates);
        } catch (error) {
            console.error("Error reordering:", error);
            toast.error("Erreur réorganisation");
            fetchBranches();
        }
    };

    const reorderSubBranches = async (newSubBranches: SousBrancheRow[]) => {
        setSubBranches(newSubBranches);
        try {
            const updates = newSubBranches.map((item, index) => ({
                id: item.id,
                nom: item.nom,
                branche_id: item.branche_id,
                user_id: item.user_id,
                photo_base64: item.photo_base64,
                ordre: index + 1
            }));
            await branchService.updateSubBranchOrder(updates);
        } catch (error) {
            console.error("Error reordering sub-branches:", error);
            toast.error("Erreur réorganisation sous-branches");
            if (selectedBranch) fetchSubBranches(selectedBranch.id);
        }
    };

    const refreshSubBranches = () => {
        if (selectedBranch) fetchSubBranches(selectedBranch.id);
    };

    return {
        branches,
        loading,
        filteredBranches,
        searchTerm,
        setSearchTerm,
        selectedBranch,
        setSelectedBranch,
        subBranches,
        loadingSub,
        createBranch,
        updateBranch,
        deleteBranch,
        reorderBranches,
        reorderSubBranches,
        refreshSubBranches
    };
};
