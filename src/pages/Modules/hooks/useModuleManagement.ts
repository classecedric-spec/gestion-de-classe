import { useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { calculateModuleProgress, filterModules, sortModules, extractBranches, extractSubBranches, ModuleWithRelations } from '../utils/moduleHelpers';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * useModuleManagement
 * Manages modules CRUD, filters, and selection using React Query
 */
export function useModuleManagement() {
    const queryClient = useQueryClient();

    // Local UI state
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [subBranchFilter, setSubBranchFilter] = useState('all');

    // Modals
    const [moduleToEdit, setModuleToEdit] = useState<ModuleWithRelations | null>(null);
    const [moduleToDelete, setModuleToDelete] = useState<ModuleWithRelations | null>(null);

    // 1. Fetch Modules Query
    const {
        data: modules = [],
        isLoading: loading
    } = useQuery<ModuleWithRelations[]>({
        queryKey: ['modules'],
        queryFn: async () => {
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
                .order('nom') // Note: Using 'nom' logic from original, though types say 'titre'.
                .order('ordre', { foreignTable: 'Activite', ascending: true });

            if (error) throw error;

            // Calculate progress for each module
            return (data || []).map((m: any) => ({
                ...m,
                ...calculateModuleProgress(m)
            }));
        },
    });

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


    // 2. Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (moduleId: string) => {
            const { error } = await supabase.from('Module').delete().eq('id', moduleId);
            if (error) throw error;
            return moduleId;
        },
        onSuccess: (deletedId) => {
            let nextId: string | null = null;

            if (selectedModule?.id === deletedId) {
                const currentIndex = modules.findIndex(m => m.id === deletedId);
                if (currentIndex !== -1) {
                    if (currentIndex < modules.length - 1) {
                        nextId = modules[currentIndex + 1].id;
                    } else if (currentIndex > 0) {
                        nextId = modules[currentIndex - 1].id;
                    }
                }
            } else {
                nextId = selectedModule?.id || null;
            }

            if (nextId) setSelectedModuleId(nextId);

            toast.success("Module supprimé");
            setModuleToDelete(null);

            queryClient.invalidateQueries({ queryKey: ['modules'] });
        },
        onError: (err) => {
            console.error('Error deleting module:', err);
            toast.error("Erreur lors de la suppression du module");
        }
    });

    // 3. Status Toggle Mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async (module: ModuleWithRelations) => {
            const currentStatus = module['statut'] || 'en_preparation';
            let newStatus = 'en_cours';
            if (currentStatus === 'en_preparation') newStatus = 'en_cours';
            else if (currentStatus === 'en_cours') newStatus = 'archive';
            else if (currentStatus === 'archive') newStatus = 'en_cours';

            const { error } = await supabase.from('Module').update({ statut: newStatus }).eq('id', module.id);
            if (error) throw error;
            return { ...module, statut: newStatus };
        },
        onMutate: async (newModule) => {
            await queryClient.cancelQueries({ queryKey: ['modules'] });
            const previousModules = queryClient.getQueryData<ModuleWithRelations[]>(['modules']);

            const nextStatus = newModule['statut'] === 'en_preparation' ? 'en_cours' :
                newModule['statut'] === 'en_cours' ? 'archive' : 'en_cours';

            queryClient.setQueryData<ModuleWithRelations[]>(['modules'], old => old?.map(m =>
                m.id === newModule.id ? { ...m, statut: nextStatus } : m
            ));

            return { previousModules };
        },
        onError: (_err, _newModule, context) => {
            if (context?.previousModules) {
                queryClient.setQueryData(['modules'], context.previousModules);
            }
            toast.error("Impossible de mettre à jour le statut");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['modules'] });
        }
    });


    // Actions
    const handleDelete = async () => {
        if (moduleToDelete) {
            deleteMutation.mutate(moduleToDelete.id);
        }
    };

    const toggleStatus = (module: ModuleWithRelations) => {
        toggleStatusMutation.mutate(module);
    };

    const handleCreated = async (newModule: ModuleWithRelations | null) => {
        await queryClient.invalidateQueries({ queryKey: ['modules'] });
        if (newModule) {
            setSearchTerm('');
            setSelectedModuleId(newModule.id);
        }
        setModuleToEdit(null);
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
            setModules: () => { }, // No-op, managed by Query
            fetchModules: () => queryClient.invalidateQueries({ queryKey: ['modules'] }),
            handleDelete,
            toggleStatus,
            handleCreated
        }
    };
}
