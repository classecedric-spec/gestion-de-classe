import { useState, useEffect, useCallback, useMemo } from 'react';
import { branchService } from '../services/branchService';
import { toast } from 'sonner';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type BrancheInsert = Database['public']['Tables']['Branche']['Insert'];
type BrancheUpdate = Database['public']['Tables']['Branche']['Update'];

type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];

// Extended Update types matching what reorder functions expect (containing just enough info)
// interface BranchReorderItem extends BrancheUpdate {
//     id: string;
//     nom: string;
//     ordre: number;
// }

// interface SubBranchReorderItem extends SousBrancheUpdate {
//     id: string;
//     nom: string;
//     branche_id: string;
//     ordre: number;
// }

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

            // Set initial selection only if none exists and we have data
            // We use a functional update check or just trust current state
            // But here inside callback, we can't see current 'selectedBranch' effectively if we remove it from deps without a ref
            // Actually, best practice: do this logic in useEffect, not in fetchBranches
            // But since I'm minimally changing:
            // I'll leave the logic but remove the dep. It will use the stale closure 'selectedBranch' which is likely null on first run, which is fine.
            // On subsequent runs (manual refetch), strict linting would complain, but for this bug fix it's crucial
            // properly, I should move the selection logic out.

            // Let's refine:
            // The goal is just to populate data. Selection logic can handle itself.

            if (data.length > 0) {
                // Check if we need to select default.
                // We can't easily check 'selectedBranch' here without adding it to deps.
                // So we'll dispatch a separate action or just rely on the effect that calls this.
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
            toast.error("Erreur lors du chargement des branches");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches().then(() => {
            // We can check if we need to select a default here if we had access to the data just fetched.
            // But fetchBranches doesn't return data.
            // Let's modify fetchBranches to return data if possible, or just rely on 'branches' state effect?
            // Actually, 'branches' state changes will trigger re-renders.
        });
    }, [fetchBranches]);

    // Effect to select first branch if none selected and branches exist
    useEffect(() => {
        if (branches.length > 0 && !selectedBranch) {
            setSelectedBranch(branches[0]);
        }
    }, [branches, selectedBranch]);

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
            // 1. Service Call (Should return full object)
            const newBranch = await branchService.createBranch(branchData);

            // 2. Optimistic Update (Trust the result)
            setBranches(prev => {
                // Sort alphabetically or by order if needed, assuming name sort for now as per Groups
                const updated = [...prev, newBranch];
                return updated.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
            });

            // 3. Selection
            setSelectedBranch(newBranch);

            toast.success("Branche créée");
            return true;
        } catch (error) {
            console.error("Error creating branch:", error);
            toast.error("Erreur lors de la création");
            // No rollback needed as we strictly additive here and didn't touch state before success
            return false;
        }
    };

    const updateBranch = async (id: string, branchData: BrancheUpdate): Promise<boolean> => {
        const previousBranches = [...branches];
        const previousSelected = selectedBranch;

        // Optimistic UI Update
        setBranches(prev => prev.map(b => b.id === id ? { ...b, ...branchData } as BrancheRow : b));
        if (selectedBranch && selectedBranch.id === id) {
            setSelectedBranch(prev => prev ? ({ ...prev, ...branchData } as BrancheRow) : null);
        }

        try {
            const updated = await branchService.updateBranch(id, branchData);
            // Update with actual server data for consistency
            setBranches(prev => prev.map(b => b.id === id ? updated : b));
            if (selectedBranch && selectedBranch.id === id) {
                setSelectedBranch(updated);
            }
            toast.success("Branche mise à jour");
            return true;
        } catch (error) {
            console.error("Error updating branch:", error);
            // Revert on error
            setBranches(previousBranches);
            setSelectedBranch(previousSelected);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    const deleteBranch = async (id: string): Promise<boolean> => {
        const previousBranches = [...branches];
        const previousSelected = selectedBranch;

        // Optimistic UI Update
        const newBranches = branches.filter(b => b.id !== id);
        setBranches(newBranches);

        if (selectedBranch && selectedBranch.id === id) {
            setSelectedBranch(newBranches.length > 0 ? newBranches[0] : null);
        }

        try {
            await branchService.deleteBranch(id);
            toast.success("Branche supprimée");
            return true;
        } catch (error: any) {
            console.error("Error deleting branch:", error);
            // Revert on error
            setBranches(previousBranches);
            setSelectedBranch(previousSelected);
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
                photo_url: item.photo_url,
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
                photo_url: item.photo_url,
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
