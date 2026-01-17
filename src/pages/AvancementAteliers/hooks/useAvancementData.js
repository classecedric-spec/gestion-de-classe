import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * useAvancementData - Hook pour gérer les données de base (groupes, modules, branches)
 */
export const useAvancementData = () => {
    const [groups, setGroups] = useState([]);
    const [modules, setModules] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedBrancheId, setSelectedBrancheId] = useState('');
    const [selectedDateFin, setSelectedDateFin] = useState('');
    const [dateOperator, setDateOperator] = useState('eq');

    const fetchGroups = useCallback(async () => {
        const { data } = await supabase.from('Groupe').select('id, nom, acronyme, photo_url').order('nom');
        setGroups(data || []);
    }, []);

    const fetchModules = useCallback(async () => {
        const { data } = await supabase
            .from('Module')
            .select('*, SousBranche(id, nom, ordre, Branche(id, nom, ordre))')
            .eq('statut', 'en_cours');

        const sorted = (data || []).sort((a, b) => {
            if (a.date_fin !== b.date_fin) {
                if (!a.date_fin) return 1;
                if (!b.date_fin) return -1;
                return a.date_fin.localeCompare(b.date_fin);
            }

            const aB = a.SousBranche?.Branche;
            const bB = b.SousBranche?.Branche;
            if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
            if (aB?.nom !== bB?.nom) return (aB?.nom || '').localeCompare(bB?.nom || '');

            const aSB = a.SousBranche;
            const bSB = b.SousBranche;
            if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
            if (aSB?.nom !== bSB?.nom) return (aSB?.nom || '').localeCompare(bSB?.nom || '');

            return a.nom.localeCompare(b.nom);
        });

        setModules(sorted);
    }, []);

    const fetchBranches = useCallback(async () => {
        const { data, error } = await supabase.from('Branche').select('id, nom, ordre, photo_url').order('ordre', { ascending: true });
        if (error) {
            console.error('Error fetching branches:', error);
            setBranches([]);
        } else {
            setBranches(data || []);
        }
    }, []);

    const isModuleInDateRange = useCallback((m) => {
        if (!selectedDateFin) return true;
        if (!m.date_fin) return false;

        const mDate = new Date(m.date_fin);
        const sDate = new Date(selectedDateFin);

        const mTime = new Date(mDate.getFullYear(), mDate.getMonth(), mDate.getDate()).getTime();
        const sTime = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();

        if (dateOperator === 'lt') return mTime < sTime;
        if (dateOperator === 'lte') return mTime <= sTime;
        if (dateOperator === 'gt') return mTime > sTime;
        return mTime === sTime;
    }, [selectedDateFin, dateOperator]);

    const isModuleInBranch = useCallback((m) => {
        if (!selectedBrancheId) return true;
        return m.SousBranche?.Branche?.id === selectedBrancheId;
    }, [selectedBrancheId]);

    const getFilteredModules = useCallback(() => {
        return modules.filter(m => isModuleInDateRange(m) && isModuleInBranch(m));
    }, [modules, isModuleInDateRange, isModuleInBranch]);

    useEffect(() => {
        fetchGroups();
        fetchModules();
        fetchBranches();
    }, [fetchGroups, fetchModules, fetchBranches]);

    return {
        groups,
        modules,
        branches,
        selectedGroupId,
        setSelectedGroupId,
        selectedModuleId,
        setSelectedModuleId,
        selectedBrancheId,
        setSelectedBrancheId,
        selectedDateFin,
        setSelectedDateFin,
        dateOperator,
        setDateOperator,
        getFilteredModules
    };
};
