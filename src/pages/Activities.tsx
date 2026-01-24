import React, { useState } from 'react';
import AddActivityModal from '../features/activities/components/AddActivityModal';
import { useActivities } from '../features/activities/hooks/useActivities';
import ActivityList from '../features/activities/components/ActivityList';
import ActivityDetails from '../features/activities/components/ActivityDetails';
import { ConfirmModal } from '../components/ui';

const Activities: React.FC = () => {
    // Hook Logic
    const {
        activities,
        filteredActivities,
        loading,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        moduleFilter,
        setModuleFilter,
        availableModules,
        fetchActivities,
        deleteActivity,
        setActivities // Exposed for optimistic updates from children
    } = useActivities();

    // Local UI State
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activityToEdit, setActivityToEdit] = useState<any>(null);
    const [activityToDelete, setActivityToDelete] = useState<any>(null);

    // Handlers
    const handleCreated = (newActivity?: any) => {
        if (newActivity) {
            setActivities(prev => {
                const exists = prev.find(a => a.id === newActivity.id);
                if (exists) {
                    return prev.map(a => a.id === newActivity.id ? { ...exists, ...newActivity } : a);
                }
                return [newActivity, ...prev];
            });
        } else {
            fetchActivities();
        }
        setActivityToEdit(null);
    };

    const handleDelete = async () => {
        if (!activityToDelete) return;
        const success = await deleteActivity(activityToDelete.id);
        if (success) {
            if (selectedActivity?.id === activityToDelete.id) {
                setSelectedActivity(null);
            }
            setActivityToDelete(null);
            // Activities state is already optimistically updated by the hook
        }
    };

    const handleEdit = (activity: any) => {
        setActivityToEdit(activity);
        setIsAddModalOpen(true);
    };

    const handleOpenCreate = () => {
        setActivityToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleSelectActivity = (activity: any) => {
        setSelectedActivity(activity);
    };

    return (
        <div className="flex h-full gap-6">
            <ActivityList
                activities={filteredActivities}
                totalCount={activities.length} // Pass total raw count for header
                loading={loading}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedActivity={selectedActivity}
                onSelect={handleSelectActivity}
                onEdit={handleEdit}
                onDeleteRequest={setActivityToDelete}
                onOpenCreate={handleOpenCreate}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                moduleFilter={moduleFilter}
                onModuleFilterChange={setModuleFilter}
                availableModules={availableModules}
            />

            <ActivityDetails
                selectedActivity={selectedActivity}
                setActivities={setActivities} // Pass setter for requirements optimistic updates
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!activityToDelete}
                onClose={() => setActivityToDelete(null)}
                onConfirm={handleDelete}
                title="Supprimer l'activité ?"
                message={`Êtes-vous sûr de vouloir supprimer l'activité "${activityToDelete?.titre}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />

            <AddActivityModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdded={handleCreated}
                activityToEdit={activityToEdit}
            />
        </div>
    );
};

export default Activities;
