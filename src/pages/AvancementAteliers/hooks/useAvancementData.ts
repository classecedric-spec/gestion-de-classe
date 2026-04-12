import { useState, useCallback, useEffect } from 'react';
import { groupService } from '../../../features/groups/services/groupService';
import { moduleService } from '../../../features/modules/services/moduleService';
import { getCurrentUser } from '../../../lib/database';

export interface AvancementGroup {
    id: string;
    nom: string;
    acronyme: string | null;
    photo_url: string | null;
}

export interface AvancementBranch {
    id: string;
    nom: string;
    ordre: number;
    photo_url: string | null;
}

export interface AvancementModule {
    id: string;
    nom: string;
    statut: string;
    date_fin: string | null;
    sous_branche_id: string;
    SousBranche?: {
        id: string;
        nom: string;
        ordre: number;
        Branche?: {
            id: string;
            nom: string;
            ordre: number;
        };
    };
}

/**
 * useAvancementData - Hook pour gérer les données de base (groupes, modules, branches)
 */
export const useAvancementData = () => {
    const [groups, setGroups] = useState<AvancementGroup[]>([]);
    const [modules, setModules] = useState<AvancementModule[]>([]);
    const [branches, setBranches] = useState<AvancementBranch[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [selectedBrancheId, setSelectedBrancheId] = useState<string>('');
    const [selectedDateFin, setSelectedDateFin] = useState<string>('');
    const [dateOperator, setDateOperator] = useState<string>('eq');

    const fetchGroups = useCallback(async () => {
        const user = await getCurrentUser();
        if (!user) {
            setGroups([]);
            return;
        }
        // Casting as AvancementGroup[] because service returns Tables<'Groupe'> which is compatible
        const data = await groupService.getGroups(user.id);
        setGroups(data as unknown as AvancementGroup[]);
    }, []);

    const fetchModules = useCallback(async () => {
        const user = await getCurrentUser();
        if (!user) {
            setModules([]);
            return;
        }
        const data = await moduleService.getActiveModules(user.id);

        const sorted = (data as AvancementModule[] || []).sort((a, b) => {
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
        const user = await getCurrentUser();
        if (!user) {
            setBranches([]);
            return;
        }
        const data = await moduleService.getBranches(user.id);
        setBranches(data as unknown as AvancementBranch[]);
    }, []);

    const isModuleInDateRange = useCallback((m: AvancementModule) => {
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

    const isModuleInBranch = useCallback((m: AvancementModule) => {
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
