import { useState, useEffect } from 'react';
import { supabase } from '../lib/database';

/**
 * Hook for fetching branches and sub-branches data
 */
export const useBranchesData = (branchId: string) => {
    const [branches, setBranches] = useState<{ id: string; nom: string }[]>([]);
    const [subBranches, setSubBranches] = useState<{ id: string; nom: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (branchId) {
            fetchSubBranches(branchId);
        } else {
            setSubBranches([]);
        }
    }, [branchId]);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('Branche')
                .select('id, nom')
                .order('nom');
            if (error) throw error;
            setBranches(data || []);
        } catch (err) {
            console.error('Error fetching branches:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubBranches = async (bId: string) => {
        try {
            const { data, error } = await supabase
                .from('SousBranche')
                .select('id, nom')
                .eq('branche_id', bId)
                .order('nom');
            if (error) throw error;
            setSubBranches(data || []);
        } catch (err) {
            console.error('Error fetching sub-branches:', err);
        }
    };

    const addBranch = (branch: { id: string; nom: string }) => {
        setBranches(prev => [...prev, branch].sort((a, b) => a.nom.localeCompare(b.nom)));
    };

    const updateSubBranches = (newSubBranches: { id: string; nom: string }[]) => {
        setSubBranches(newSubBranches);
    };

    return {
        branches,
        subBranches,
        loading,
        addBranch,
        updateSubBranches,
        refetchSubBranches: fetchSubBranches
    };
};
