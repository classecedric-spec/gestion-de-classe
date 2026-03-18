import React, { useState, useEffect } from 'react';
import { Box, Plus } from 'lucide-react';
import { branchService } from '../features/branches/services/branchService';
import AddBranchModal from '../features/branches/components/AddBranchModal';
import AddSubBranchModal from '../features/branches/components/AddSubBranchModal';
import { Modal, Button } from '../core';
import { Tables } from '../types/supabase';
import { useModuleForm } from '../hooks/useModuleForm';
import { useBranchesData } from '../hooks/useBranchesData';
import { useFridayShortcuts } from '../hooks/useFridayShortcuts';
import { useModuleSubmit } from '../hooks/useModuleSubmit';
import { BranchSelect } from './module/BranchSelect';
import { SubBranchSelect } from './module/SubBranchSelect';
import { DatePicker } from './module/DatePicker';
import { StatusSelect } from './module/StatusSelect';

// Helper types for the module including join
interface ModuleWithDetails extends Tables<'Module'> {
    SousBranche?: {
        id: string;
        nom: string;
        branche_id: string;
        Branche?: { id: string; nom: string } | null;
    } | null;
}

interface AddModuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded: (module: ModuleWithDetails) => void;
    moduleToEdit?: ModuleWithDetails | null;
}

/**
 * Modal for adding or editing a module
 */
const AddModuleModal: React.FC<AddModuleModalProps> = ({
    isOpen,
    onClose,
    onAdded,
    moduleToEdit
}) => {
    // Hooks
    const { formData, updateField, isValid, resetForm } = useModuleForm(moduleToEdit);
    const {
        branches,
        subBranches,
        addBranch,
        updateSubBranches,
        refetchSubBranches
    } = useBranchesData(formData.branchId);
    const { fridays, formatDateForInput, formatDateLabel } = useFridayShortcuts();
    const { submit, loading, error } = useModuleSubmit(
        moduleToEdit,
        (module) => {
            onAdded(module as any);
            resetForm();
            onClose();
        },
        branches,
        subBranches
    );

    // Modal states
    const [showAddBranchModal, setShowAddBranchModal] = useState(false);
    const [showAddSubBranchModal, setShowAddSubBranchModal] = useState(false);

    // Explicit close handler to reset form
    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Load sub-branches when editing
    useEffect(() => {
        if (isOpen && moduleToEdit?.SousBranche?.branche_id) {
            refetchSubBranches(moduleToEdit.SousBranche.branche_id);
        }
    }, [isOpen, moduleToEdit, refetchSubBranches]);

    // Handlers
    const handleBranchChange = (value: string, shouldCreateNew: boolean) => {
        if (shouldCreateNew) {
            setShowAddBranchModal(true);
        } else {
            updateField('branchId', value);
            updateField('subBranchId', '');
        }
    };

    const handleSubBranchChange = (value: string, shouldCreateNew: boolean) => {
        if (shouldCreateNew) {
            setShowAddSubBranchModal(true);
        } else {
            updateField('subBranchId', value);
        }
    };

    const handleBranchSubmit = async (branchData: any) => {
        try {
            const newBranch = await branchService.createBranch(branchData);
            if (newBranch) {
                addBranch(newBranch);
                updateField('branchId', newBranch.id);
                updateField('subBranchId', '');
            }
        } catch (error) {
            console.error("Error creating branch:", error);
            throw error;
        }
    };

    const handleSubBranchSubmit = async (subBranchData: any) => {
        try {
            const newSubBranch = await branchService.createSubBranch(subBranchData);
            if (newSubBranch) {
                updateField('branchId', newSubBranch.branche_id || '');
                const data = await branchService.fetchSubBranches(newSubBranch.branche_id || '');
                updateSubBranches(data || []);
                updateField('subBranchId', newSubBranch.id);
            }
        } catch (error) {
            console.error("Error creating sub-branch:", error);
            throw error;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        await submit(formData);
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={moduleToEdit ? 'Modifier le Module' : 'Ajouter un Module'}
                icon={<Box size={24} />}
                className="max-w-md"
                footer={
                    <>
                        <Button onClick={handleClose} variant="secondary" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={!isValid}
                            className="flex-1"
                            icon={moduleToEdit ? undefined : Plus}
                        >
                            {moduleToEdit ? 'Enregistrer' : 'Ajouter le Module'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 text-sm text-red-200 bg-red-900/30 border border-red-500/30 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Module Name */}
                        <div className="space-y-2">
                            <label htmlFor="module_name" className="text-sm font-medium text-gray-300">
                                Nom du Module
                            </label>
                            <input
                                id="module_name"
                                name="module_name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="Ex: Algèbre Linéaire..."
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                autoFocus
                            />
                        </div>

                        {/* Branch Selection */}
                        <BranchSelect
                            value={formData.branchId}
                            branches={branches}
                            onChange={handleBranchChange}
                        />

                        {/* Sub-Branch Selection */}
                        <SubBranchSelect
                            value={formData.subBranchId}
                            subBranches={subBranches}
                            disabled={!formData.branchId}
                            onChange={handleSubBranchChange}
                        />

                        {/* Date Picker */}
                        <DatePicker
                            value={formData.endDate}
                            onChange={(value) => updateField('endDate', value)}
                            fridayShortcuts={fridays}
                            formatDateForInput={formatDateForInput}
                            formatDateLabel={formatDateLabel}
                        />

                        {/* Status Selection */}
                        <StatusSelect
                            value={formData.status}
                            onChange={(value) => updateField('status', value)}
                        />
                    </div>
                </form>
            </Modal>

            {/* Nested Modals */}
            <AddBranchModal
                isOpen={showAddBranchModal}
                onClose={() => setShowAddBranchModal(false)}
                onSubmit={handleBranchSubmit}
            />

            <AddSubBranchModal
                isOpen={showAddSubBranchModal}
                onClose={() => setShowAddSubBranchModal(false)}
                onSubmit={handleSubBranchSubmit}
                branches={branches}
            />
        </>
    );
};

export default AddModuleModal;
