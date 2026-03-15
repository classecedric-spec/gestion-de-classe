import React, { useState, useRef, useLayoutEffect } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

// Modals
import AddModuleModal from '../../components/AddModuleModal';
import AddActivityModal from '../../features/activities/components/AddActivityModal';
import CreateActivitySeriesModal from '../../components/CreateActivitySeriesModal';
import { ConfirmModal } from '../../core';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useModuleManagement } from './hooks/useModuleManagement';
import { useActivityManagement } from './hooks/useActivityManagement';
import { useGroupSelection } from './hooks/useGroupSelection';
import { useProgressionGeneration } from './hooks/useProgressionGeneration';
import { useProgressionTracking } from './hooks/useProgressionTracking';

// Layout Components
import { ModulesListSidebar } from './components/ModulesListSidebar';
import { ModuleDetailView } from './components/ModuleDetailView';
import { ModulesTableExcel } from './components/ModulesTableExcel';

const Modules: React.FC = () => {
    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

    // Notifications
    const { notification, showNotification, dismissNotification } = useNotifications();

    // Module Management
    const moduleHook = useModuleManagement();

    // Tabs & Modals
    const [detailTab, setDetailTab] = useState<'activities' | 'groups' | 'progression'>('activities');
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState<boolean>(false);
    const [isCreateSeriesModalOpen, setIsCreateSeriesModalOpen] = useState<boolean>(false);

    // Deletion States
    const [activityToDelete, setActivityToDelete] = useState<any | null>(null);

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
        setDetailTab as any
    );

    // Progression Tracking
    const progressionHook = useProgressionTracking(
        detailTab,
        activityHook.states.moduleActivities,
        moduleHook.states.selectedModule,
        moduleHook.actions.setModules,
        activityHook.actions.setStats
    );

    // --- Height Measure Effect ---
    useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50);
        const t2 = setTimeout(syncHeight, 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [moduleHook.states.modules.length, moduleHook.states.selectedModule, moduleHook.states.searchTerm, moduleHook.states.statusFilter, showFilters]);

    // Handlers
    const handleModuleSelect = (module: any) => {
        moduleHook.actions.setSelectedModule(module);
        setDetailTab('activities');
    };

    const handleEdit = (module: any) => {
        moduleHook.actions.setModuleToEdit(module);
        setIsAddModalOpen(true);
    };

    const handleEditActivity = (activity: any) => {
        activityHook.actions.setActivityToEdit(activity);
        setIsAddActivityModalOpen(true);
    };

    const handleAddActivity = () => {
        activityHook.actions.setActivityToEdit(null);
        setIsAddActivityModalOpen(true);
    };

    const handleActivityAdded = async () => {
        await moduleHook.actions.refreshCurrentModule();
    };

    return (
        <div className="flex h-full gap-6 animate-in fade-in duration-500 relative">
            {viewMode === 'table' ? (
                <ModulesTableExcel
                    modules={moduleHook.states.filteredModules}
                    onClose={() => setViewMode('list')}
                    updateModule={moduleHook.actions.updateModule}
                />
            ) : (
                <>
                    <ModulesListSidebar
                        moduleHook={moduleHook}
                        showFilters={showFilters}
                        setShowFilters={setShowFilters}
                        onModuleSelect={handleModuleSelect}
                        onEdit={handleEdit}
                        onAddClick={() => setIsAddModalOpen(true)}
                        contentRef={leftContentRef}
                        headerHeight={headerHeight}
                        onTableModeClick={() => setViewMode('table')}
                    />

                    <ModuleDetailView
                        moduleHook={moduleHook}
                        detailTab={detailTab}
                        setDetailTab={setDetailTab}
                        activityHook={activityHook}
                        groupHook={groupHook}
                        progressionGenHook={progressionGenHook}
                        progressionHook={progressionHook}
                        handleAddActivity={handleAddActivity}
                        handleEditActivity={handleEditActivity}
                        setActivityToDelete={setActivityToDelete}
                        handleCreateSeries={() => setIsCreateSeriesModalOpen(true)}
                        contentRef={rightContentRef}
                        headerHeight={headerHeight}
                    />
                </>
            )}

            {/* --- MODALS --- */}

            <AddModuleModal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); moduleHook.actions.setModuleToEdit(null); }}
                onAdded={moduleHook.actions.handleCreated as any}
                moduleToEdit={moduleHook.states.moduleToEdit as any}
            />

            <AddActivityModal
                isOpen={isAddActivityModalOpen}
                onClose={() => setIsAddActivityModalOpen(false)}
                onAdded={handleActivityAdded}
                activityToEdit={activityHook.states.activityToEdit as any}
                defaultModuleId={moduleHook.states.selectedModule?.id || ''}
                defaultModuleName={moduleHook.states.selectedModule?.nom || ''}
                nextOrder={activityHook.states.moduleActivities?.length > 0
                    ? Math.max(...activityHook.states.moduleActivities.map((a: any) => a.ordre || 0)) + 1
                    : 0}
            />

            <CreateActivitySeriesModal
                isOpen={isCreateSeriesModalOpen}
                onClose={() => setIsCreateSeriesModalOpen(false)}
                onAdded={moduleHook.actions.refreshCurrentModule}
                moduleId={moduleHook.states.selectedModule?.id || ''}
            />

            {/* Notification Toast */}
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
                        <p className="text-xs font-medium opacity-90">{notification.message || ''}</p>
                    </div>
                    <button
                        onClick={dismissNotification}
                        aria-label="Fermer la notification"
                        className="ml-4 p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-50 hover:opacity-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <ConfirmModal
                isOpen={!!moduleHook.states.moduleToDelete}
                onClose={() => moduleHook.actions.setModuleToDelete(null)}
                onConfirm={moduleHook.actions.handleDelete}
                title="Supprimer le module ?"
                message={`Êtes-vous sûr de vouloir supprimer le module "${moduleHook.states.moduleToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="danger"
            />

            <ConfirmModal
                isOpen={!!activityToDelete}
                onClose={() => setActivityToDelete(null)}
                onConfirm={async () => {
                    if (activityToDelete) {
                        await activityHook.actions.deleteActivity(activityToDelete.id);
                        setActivityToDelete(null);
                    }
                }}
                title="Supprimer l'activité ?"
                message={`Êtes-vous sûr de vouloir supprimer l'activité "${activityToDelete?.titre}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
};

export default Modules;
