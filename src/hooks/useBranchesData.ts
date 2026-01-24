import { useState, useEffect } from 'react';
import { supabase } from '../lib/database';
import { Tables } from '../types/supabase';

/**
 * Hook for fetching branches and sub-branches data
 */
export const useBranchesData = (branchId: string) => {
    const [branches, setBranches] = useState<Tables<'Branche'>[]>([]);
    const [subBranches, setSubBranches] = useState<Tables<'SousBranche'>[]>([]);
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
                .select('*')
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
                .select('*')
                .eq('branche_id', bId)
                .order('nom');
            if (error) throw error;
            setSubBranches(data || []);
        } catch (err) {
            console.error('Error fetching sub-branches:', err);
        }
    };

    const addBranch = (branch: Tables<'Branche'>) => {
        setBranches(prev => [...prev, branch].sort((a, b) => a.nom.localeCompare(b.nom)));
    };

    const updateSubBranches = (newSubBranches: Tables<'SousBranche'>[]) => {
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
