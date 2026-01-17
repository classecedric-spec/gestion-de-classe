import React, { useState } from 'react';
import { Folder, Trash2, Check, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

// Modals
import AddModuleModal from '../../components/AddModuleModal';
import AddActivityModal from '../../features/activities/components/AddActivityModal';
import CreateActivitySeriesModal from '../../components/CreateActivitySeriesModal';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useModuleManagement } from './hooks/useModuleManagement';
import { useActivityManagement } from './hooks/useActivityManagement';
import { useGroupSelection } from './hooks/useGroupSelection';
import { useProgressionGeneration } from './hooks/useProgressionGeneration';
import { useProgressionTracking } from './hooks/useProgressionTracking';

// Components
import ModuleListSidebar from './components/ModuleListSidebar';
import ModuleHeader from './components/ModuleHeader';
import TabSelector from './components/TabSelector';
import ActivitiesTab from './components/ActivitiesTab';
import GroupsTab from './components/GroupsTab';
import ProgressionKanban from './components/ProgressionKanban';

const Modules = () => {
    // Notifications
    const { notification, showNotification, dismissNotification } = useNotifications();

    // Module Management
    const moduleHook = useModuleManagement();

    // Tabs & Modals
    const [detailTab, setDetailTab] = useState('activities');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
    const [isCreateSeriesModalOpen, setIsCreateSeriesModalOpen] = useState(false);

    // Activity Management
    const activityHook = useActivityManagement(
        moduleHook.states.selectedModule,
        moduleHook.actions.setModules,
        moduleHook.actions.setSelectedModule
    );

    // Group Selection
    const groupHook = useGroupSelection(detailTab);

    // Progression Generation
    const progressionGenHook = useProgressionGeneration(
        showNotification,
        groupHook.actions.setSelectedGroups,
        setDetailTab
    );

    // Progression Tracking
    const progressionHook = useProgressionTracking(
        detailTab,
        activityHook.states.moduleActivities,
        moduleHook.states.selectedModule,
        moduleHook.actions.setModules,
        activityHook.actions.setStats
    );

    // Handlers
    const handleModuleSelect = (module) => {
        moduleHook.actions.setSelectedModule(module);
        setDetailTab('activities');
    };

    const handleEdit = (module) => {
        moduleHook.actions.setModuleToEdit(module);
        setIsAddModalOpen(true);
    };

    const handleEditActivity = (activity) => {
        activityHook.actions.setActivityToEdit(activity);
        setIsAddActivityModalOpen(true);
    };

    const handleAddActivity = () => {
        activityHook.actions.setActivityToEdit(null);
        setIsAddActivityModalOpen(true);
    };

    const handleActivityAdded = async () => {
        await moduleHook.actions.fetchModules();
        if (moduleHook.states.selectedModule) {
            const updated = moduleHook.states.modules.find(m => m.id === moduleHook.states.selectedModule.id);
            if (updated) moduleHook.actions.setSelectedModule(updated);
        }
    };

    return (
        <div className="flex h-full gap-6">
            {/* Left Sidebar: Module List */}
            <ModuleListSidebar
                filteredModules={moduleHook.states.filteredModules}
                selectedModule={moduleHook.states.selectedModule}
                searchTerm={moduleHook.states.searchTerm}
                setSearchTerm={moduleHook.actions.setSearchTerm}
                statusFilter={moduleHook.states.statusFilter}
                setStatusFilter={moduleHook.actions.setStatusFilter}
                branchFilter={moduleHook.states.branchFilter}
                setBranchFilter={moduleHook.actions.setBranchFilter}
                subBranchFilter={moduleHook.states.subBranchFilter}
                setSubBranchFilter={moduleHook.actions.setSubBranchFilter}
                availableBranches={moduleHook.states.availableBranches}
                availableSubBranches={moduleHook.states.availableSubBranches}
                onModuleSelect={handleModuleSelect}
                onEdit={handleEdit}
                onDelete={moduleHook.actions.setModuleToDelete}
                onAddModule={() => setIsAddModalOpen(true)}
                loading={moduleHook.states.loading}
            />

            {/* Main Detail Area */}
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
                {moduleHook.states.selectedModule ? (
                    <>
                        {/* Module Header */}
                        <ModuleHeader
                            module={moduleHook.states.selectedModule}
                            onToggleStatus={moduleHook.actions.toggleStatus}
                        />

                        {/* Content Section - Tabs */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            {/* Tab Selector */}
                            <TabSelector activeTab={detailTab} onTabChange={setDetailTab} />

                            {/* Tab Content */}
                            {detailTab === 'activities' ? (
                                <ActivitiesTab
                                    activities={activityHook.states.moduleActivities}
                                    onDragEnd={activityHook.actions.handleDragEnd}
                                    onEditActivity={handleEditActivity}
                                    onAddActivity={handleAddActivity}
                                    onCreateSeries={() => setIsCreateSeriesModalOpen(true)}
                                />
                            ) : detailTab === 'groups' ? (
                                <GroupsTab
                                    groups={groupHook.states.groups}
                                    selectedGroups={groupHook.states.selectedGroups}
                                    onToggleGroup={groupHook.actions.handleToggleGroup}
                                    onGenerate={() => progressionGenHook.actions.generateProgressions(
                                        groupHook.states.selectedGroups,
                                        moduleHook.states.selectedModule
                                    )}
                                    generatingProgressions={progressionGenHook.states.generatingProgressions}
                                    progress={progressionGenHook.states.progress}
                                    progressText={progressionGenHook.states.progressText}
                                />
                            ) : (
                                <ProgressionKanban
                                    activities={activityHook.states.moduleActivities}
                                    selectedActivity={progressionHook.states.selectedProgressionActivity}
                                    onSelectActivity={progressionHook.actions.setSelectedProgressionActivity}
                                    progressions={progressionHook.states.progressions}
                                    stats={activityHook.states.stats}
                                    loading={progressionHook.states.loadingProgressions}
                                    onDragEnd={progressionHook.actions.handleProgressionDragEnd}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-grey-medium">
                        <Folder size={64} className="mb-4 opacity-50" />
                        <p className="text-xl">Sélectionnez un module pour voir les détails</p>
                    </div>
                )}
            </div>

            {/* Add Module Modal */}
            <AddModuleModal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); moduleHook.actions.setModuleToEdit(null); }}
                onAdded={moduleHook.actions.handleCreated}
                moduleToEdit={moduleHook.states.moduleToEdit}
            />

            {/* Add Activity Modal */}
            <AddActivityModal
                isOpen={isAddActivityModalOpen}
                onClose={() => setIsAddActivityModalOpen(false)}
                onAdded={handleActivityAdded}
                activityToEdit={activityHook.states.activityToEdit}
                defaultModuleId={moduleHook.states.selectedModule?.id}
                defaultModuleName={moduleHook.states.selectedModule?.nom}
                nextOrder={activityHook.states.moduleActivities?.length > 0
                    ? Math.max(...activityHook.states.moduleActivities.map(a => a.ordre || 0)) + 1
                    : 0}
            />

            {/* Create Activity Series Modal */}
            <CreateActivitySeriesModal
                isOpen={isCreateSeriesModalOpen}
                onClose={() => setIsCreateSeriesModalOpen(false)}
                onAdded={moduleHook.actions.fetchModules}
                moduleId={moduleHook.states.selectedModule?.id}
            />

            {/* Floating Notification */}
            {notification && (
                <div className={clsx(
                    "fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 border backdrop-blur-md",
                    notification.type === 'success'
                        ? "bg-success/90 border-success/20 text-text-dark"
                        : "bg-danger/90 border-danger/20 text-white"
                )}>
                    <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center shadow-inner",
                        notification.type === 'success' ? "bg-text-dark/10" : "bg-white/10"
                    )}>
                        {notification.type === 'success' ? <Check size={18} strokeWidth={3} /> : <AlertCircle size={18} strokeWidth={3} />}
                    </div>
                    <div className="flex flex-col">
                        <p className="font-black text-sm tracking-tight leading-tight uppercase">
                            {notification.type === 'success' ? 'Succès' : 'Attention'}
                        </p>
                        <p className="text-xs font-medium opacity-90">{notification.message}</p>
                    </div>
                    <button
                        onClick={dismissNotification}
                        className="ml-4 p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-50 hover:opacity-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {moduleHook.states.moduleToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le module ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer le module <span className="text-white font-bold">"{moduleHook.states.moduleToDelete.nom}"</span> ?
                            <br />Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => moduleHook.actions.setModuleToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await moduleHook.actions.handleDelete();
                                    } catch (err) {
                                        showNotification("Erreur lors de la suppression du module.", 'error');
                                    }
                                }}
                                disabled={moduleHook.states.loading}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Modules;
