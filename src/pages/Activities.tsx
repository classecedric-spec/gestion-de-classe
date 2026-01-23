import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import AddActivityModal from '../features/activities/components/AddActivityModal';
import { useActivities } from '../features/activities/hooks/useActivities';
import ActivityList from '../features/activities/components/ActivityList';
import ActivityDetails from '../features/activities/components/ActivityDetails';

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
    const handleCreated = () => {
        fetchActivities();
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
        } else {
            alert("Erreur lors de la suppression de l'activité.");
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

            {/* Delete Confirmation Modal */}
            {activityToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer l'activité ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer l'activité <span className="text-white font-bold">"{activityToDelete.titre}"</span> ?
                            <br />Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActivityToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading} // Hook loading state might be global, but for delete we might want local loaded state if deleteActivity isn't instant
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
