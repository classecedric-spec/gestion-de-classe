import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { calculateModuleProgress, filterModules, sortModules, extractBranches, extractSubBranches } from '../utils/moduleHelpers';

/**
 * useModuleManagement
 * Manages modules CRUD, filters, and selection
 * 
 * @returns {object} Module management state and actions
 */
export function useModuleManagement() {
    // Module data
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [subBranchFilter, setSubBranchFilter] = useState('all');

    // Modals
    const [moduleToEdit, setModuleToEdit] = useState(null);
    const [moduleToDelete, setModuleToDelete] = useState(null);

    // Fetch modules with stats
    const fetchModules = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Module')
                .select(`
                    *,
                    SousBranche:sous_branche_id (
                        id,
                        nom,
                        branche_id,
                        ordre,
                        Branche:branche_id (
                            id,
                            nom,
                            ordre
                        )
                    ),
                    Activite (
                        *,
                        ActiviteNiveau (
                            *,
                            Niveau (*)
                        ),
                        ActiviteMateriel (
                            TypeMateriel (
                                acronyme
                            )
                        ),
                        Progression (etat)
                    )
                `)
                .order('nom')
                .order('ordre', { foreignTable: 'Activite', ascending: true });

            if (error) throw error;

            // Calculate progress for each module
            const modulesWithStats = (data || []).map(m => ({
                ...m,
                ...calculateModuleProgress(m)
            }));

            setModules(modulesWithStats);

            // Maintain or set selected module
            if (data && data.length > 0) {
                const stillExists = selectedModule && data.find(m => m.id === selectedModule.id);
                if (stillExists) {
                    setSelectedModule(stillExists);
                } else if (!selectedModule) {
                    setSelectedModule(data[0]);
                }
            } else {
                setSelectedModule(null);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    };

    // Delete module
    const handleDelete = async () => {
        const targetModule = moduleToDelete;
        if (!targetModule) return;

        setLoading(true);
        try {
            // Determine next selection BEFORE delete to preserve context
            let nextSelection = null;

            // Should we update selection? Yes if we are deleting the currently selected one
            // or if we want to ensure stability (though usually checks selectedModule.id)
            if (selectedModule?.id === targetModule.id) {
                const currentIndex = modules.findIndex(m => m.id === targetModule.id);
                if (currentIndex !== -1) {
                    // Try next selection (below), or previous (above) if acting on last item
                    if (currentIndex < modules.length - 1) {
                        nextSelection = modules[currentIndex + 1];
                    } else if (currentIndex > 0) {
                        nextSelection = modules[currentIndex - 1];
                    }
                }
            } else {
                // If we deleted something other than selected, keep current selection
                // But wait, if we don't touch setSelectedModule, it stays as is.
                // However, we need to handle the case where fetchModules runs.
                nextSelection = selectedModule;
            }

            const { error } = await supabase.from('Module').delete().eq('id', targetModule.id);
            if (error) throw error;

            // Apply new selection immediately
            if (nextSelection) {
                setSelectedModule(nextSelection);
            } else {
                setSelectedModule(null);
            }

            setModuleToDelete(null);

            // Update local state directly to ensure instant removal without waiting for fetch
            setModules(prev => prev.filter(m => m.id !== targetModule.id));
        } catch (err) {
            console.error('Error deleting module:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Toggle module status
    const toggleStatus = async (module) => {
        if (!module) return;
        const currentStatus = module.statut || 'en_preparation';
        let newStatus = 'en_cours';

        if (currentStatus === 'en_preparation') newStatus = 'en_cours';
        else if (currentStatus === 'en_cours') newStatus = 'archive';
        else if (currentStatus === 'archive') newStatus = 'en_cours';

        // Optimistic UI update
        const updatedModule = { ...module, statut: newStatus };
        setSelectedModule(updatedModule);
        setModules(prev => prev.map(m => m.id === module.id ? updatedModule : m));

        try {
            const { error } = await supabase.from('Module').update({ statut: newStatus }).eq('id', module.id);
            if (error) throw error;
        } catch (err) {
            // Revert on error
            fetchModules();
        }
    };

    // Computed values
    const availableBranches = useMemo(() => extractBranches(modules), [modules]);
    const availableSubBranches = useMemo(() => extractSubBranches(modules, branchFilter), [modules, branchFilter]);

    const filteredModules = useMemo(() => {
        const filtered = filterModules(modules, searchTerm, statusFilter, branchFilter, subBranchFilter);
        return sortModules(filtered);
    }, [modules, searchTerm, statusFilter, branchFilter, subBranchFilter]);

    // Reset sub-branch when branch changes
    useEffect(() => {
        setSubBranchFilter('all');
    }, [branchFilter]);

    // Load modules on mount
    useEffect(() => {
        fetchModules();
    }, []);

    // Callback after module created/edited
    const handleCreated = async (newModule) => {
        // Reload modules and get fresh list
        setLoading(true);

        let attempts = 0;
        const maxRetries = 3;
        let finalModules = [];
        let foundModule = null;

        while (attempts < maxRetries) {
            try {
                attempts++;
                const { data, error } = await supabase
                    .from('Module')
                    .select(`
                        *,
                        SousBranche:sous_branche_id (
                            id,
                            nom,
                            branche_id,
                            ordre,
                            Branche:branche_id (
                                id,
                                nom,
                                ordre
                            )
                        ),
                        Activite (
                            *,
                            ActiviteNiveau (
                                *,
                                Niveau (*)
                            ),
                            ActiviteMateriel (
                                TypeMateriel (
                                    acronyme
                                )
                            ),
                            Progression (etat)
                        )
                    `)
                    .order('nom')
                    .order('ordre', { foreignTable: 'Activite', ascending: true });

                if (error) throw error;

                // Calculate progress for each module
                const modulesWithStats = (data || []).map(m => ({
                    ...m,
                    ...calculateModuleProgress(m)
                }));

                finalModules = modulesWithStats;

                // If we are looking for a specific new module, check if it's there
                if (newModule) {
                    foundModule = modulesWithStats.find(m => m.id === newModule.id);
                    if (foundModule) {
                        break; // Found it, exit loop
                    } else {
                        await new Promise(r => setTimeout(r, 500)); // Wait before retry
                    }
                } else {
                    break; // No specific module to find, just one fetch is enough
                }

            } catch (error) {
                console.error('Error fetching modules attempt ' + attempts, error);
                if (attempts === maxRetries) break;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        setModules(finalModules);

        // Select the new module
        if (foundModule) {
            setSelectedModule(foundModule);
            // Reset filters to ensure the new module is visible in the list
            setSearchTerm('');
            setStatusFilter('all');
            setBranchFilter('all');
            setSubBranchFilter('all');
        } else if (newModule) {
            console.warn("Could not find new module after retries:", newModule.id);
        }

        setLoading(false);
        setModuleToEdit(null);
    };

    return {
        states: {
            modules,
            selectedModule,
            loading,
            searchTerm,
            statusFilter,
            branchFilter,
            subBranchFilter,
            moduleToEdit,
            moduleToDelete,
            filteredModules,
            availableBranches,
            availableSubBranches
        },
        actions: {
            setSelectedModule,
            setSearchTerm,
            setStatusFilter,
            setBranchFilter,
            setSubBranchFilter,
            setModuleToEdit,
            setModuleToDelete,
            setModules,
            fetchModules,
            handleDelete,
            toggleStatus,
            handleCreated
        }
    };
}
