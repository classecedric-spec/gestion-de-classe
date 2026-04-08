import { useState, useEffect, useCallback, useMemo } from 'react';
import { filterModules, sortModules, extractBranches, extractSubBranches, ModuleWithRelations } from '../utils/moduleHelpers';
import { toast } from 'react-hot-toast';
import { moduleService } from '../../../features/modules/services/moduleService';

/**
 * useModuleManagement
 * Manages modules CRUD using simple local state strategy (like Groups page)
 */
export function useModuleManagement() {
    // Local Data State
    const [modules, setModules] = useState<ModuleWithRelations[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter & Selection State
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [subBranchFilter, setSubBranchFilter] = useState('all');

    // Modals
    const [moduleToEdit, setModuleToEdit] = useState<ModuleWithRelations | null>(null);
    const [moduleToDelete, setModuleToDelete] = useState<ModuleWithRelations | null>(null);

    // 1. Fetch Modules
    const fetchModules = useCallback(async () => {
        setLoading(true);
        try {
            const data = await moduleService.getAllModules();
            setModules(data || []);
        } catch (error) {
            console.error("Error fetching modules:", error);
            toast.error("Impossible de charger les modules");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial Fetch
    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    // Handle initial selection
    const selectedModule = useMemo(() => {
        if (!modules || modules.length === 0) return null;

        let found = null;
        if (selectedModuleId) {
            found = modules.find(m => m.id === selectedModuleId);
        }

        if (!found) {
            return modules[0];
        }
        return found;
    }, [modules, selectedModuleId]);


    // 2. Delete Action
    const handleDelete = async () => {
        if (!moduleToDelete) return;
        const idToDelete = moduleToDelete.id;

        // Optimistic Update: Remove immediately
        const previousModules = [...modules];
        setModules(prev => prev.filter(m => m.id !== idToDelete));

        // Handle selection logic
        if (selectedModule?.id === idToDelete) {
            const currentIndex = modules.findIndex(m => m.id === idToDelete);
            let nextModule = null;
            if (currentIndex !== -1) {
                if (currentIndex < modules.length - 1) nextModule = modules[currentIndex + 1];
                else if (currentIndex > 0) nextModule = modules[currentIndex - 1];
            }
            setSelectedModuleId(nextModule ? nextModule.id : null);
        }

        setModuleToDelete(null); // Close modal

        try {
            await moduleService.deleteModule(idToDelete);
            toast.success("Module supprimé");
        } catch (err) {
            console.error('Error deleting module:', err);
            // Rollback
            setModules(previousModules);
            toast.error("Erreur lors de la suppression du module");
        }
    };

    // 3. Toggle Status Action
    const toggleStatus = async (module: ModuleWithRelations) => {
        // Calculate new status locally
        const currentStatus = module.statut || 'en_preparation';
        let newStatus = 'en_cours';
        if (currentStatus === 'en_preparation') newStatus = 'en_cours';
        else if (currentStatus === 'en_cours') newStatus = 'archive';
        else if (currentStatus === 'archive') newStatus = 'en_cours';

        // Optimistic Update
        const updatedModule = { ...module, statut: newStatus };
        setModules(prev => prev.map(m => m.id === module.id ? updatedModule : m));

        try {
            await moduleService.toggleModuleStatus(module);
            // Success - no action needed as we already updated
        } catch (err) {
            console.error('Error updating status:', err);
            // Rollback
            setModules(prev => prev.map(m => m.id === module.id ? module : m));
            toast.error("Impossible de mettre à jour le statut");
        }
    };

    // 4. Handle Created/Updated
    const handleCreated = (newModule: ModuleWithRelations | null) => {
        if (!newModule) {
            // If fallback failed, we forced a fetch
            fetchModules();
            return;
        }

        setModules(prev => {
            const exists = prev.find(m => m.id === newModule.id);
            if (exists) {
                // Update existing
                return prev.map(m => m.id === newModule.id ? newModule : m);
            }
            // Add new
            return [...prev, newModule].sort((a, b) => a.nom.localeCompare(b.nom));
        });

        setSelectedModuleId(newModule.id);
        setSearchTerm('');
        setModuleToEdit(null);

        // We TRUST the local update. No need to refetch immediately.
    };

    // 5. Handle update (like inline editing)
    const handleUpdateModule = async (moduleId: string, data: any) => {
        // Optimistic update
        setModules(prev => prev.map(m => m.id === moduleId ? { ...m, ...data } : m));
        try {
            await moduleService.updateModule(moduleId, data);
        } catch (error) {
            console.error('Error updating module:', error);
            toast.error("Erreur lors de la mise à jour");
            // Optionally, we could rollback here, but for simple fields like dates maybe it's fine
            // or we force a refresh
            fetchModules();
        }
    };

    const handleSetBranchFilter = (val: string) => {
        setBranchFilter(val);
        setSubBranchFilter('all');
    };

    const handleSetSelectedModule = (moduleOrFn: any) => {
        if (typeof moduleOrFn === 'function') {
            console.warn("Functional update for selectedModule not fully supported with ID refactor");
        } else {
            setSelectedModuleId(moduleOrFn ? moduleOrFn.id : null);
        }
    };

    // Computed
    const availableBranches = useMemo(() => extractBranches(modules), [modules]);
    const availableSubBranches = useMemo(() => extractSubBranches(modules, branchFilter), [modules, branchFilter]);

    const filteredModules = useMemo(() => {
        const filtered = filterModules(modules, searchTerm, statusFilter, branchFilter, subBranchFilter);
        return sortModules(filtered);
    }, [modules, searchTerm, statusFilter, branchFilter, subBranchFilter]);


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
            setSelectedModule: handleSetSelectedModule,
            setSearchTerm,
            setStatusFilter,
            setBranchFilter: handleSetBranchFilter,
            setSubBranchFilter,
            setModuleToEdit,
            setModuleToDelete,
            setModules, // Only exposed if absolutely necessary
            fetchModules,
            handleDelete,
            toggleStatus,
            handleCreated,
            updateModule: handleUpdateModule,
            refreshCurrentModule: async () => {
                const idToRefresh = selectedModuleId || selectedModule?.id;
                if (idToRefresh) {
                    try {
                        const updated = await moduleService.getModuleDetails(idToRefresh);
                        setModules(prev => prev.map(m => m.id === idToRefresh ? updated : m));
                    } catch (err) {
                        console.error("Error refreshing module", err);
                    }
                }
            },
            // Inject newly created activities directly into local state
            // (avoids a DB re-fetch that may race with cascade inserts)
            addActivitiesToCurrentModule: (newActivities: any[]) => {
                if (!newActivities || newActivities.length === 0) return;
                const idToUpdate = selectedModuleId || selectedModule?.id;
                if (!idToUpdate) return;

                setModules(prev => prev.map(m => {
                    if (m.id !== idToUpdate) return m;
                    const existingActivities = m.Activite || [];
                    return {
                        ...m,
                        Activite: [...existingActivities, ...newActivities]
                    };
                }));
            }
        }
    };
}
