import React, { useRef, useLayoutEffect, useState } from 'react';
import { Plus, SlidersHorizontal, Puzzle, Folder, Clock, Check, AlertCircle, X, FileText, LayoutList } from 'lucide-react';
import { useActivities } from '../features/activities/hooks/useActivities';
import ActivityDetails from '../features/activities/components/ActivityDetails';
import AddActivityModal from '../features/activities/components/AddActivityModal';
import { ConfirmModal, CardInfo, CardList, ListItem, SearchBar, FilterSelect, Avatar, Badge, EmptyState, CardTabs } from '../components/ui';
import clsx from 'clsx';
import { useNotifications } from './Modules/hooks/useNotifications';

const Activities: React.FC = () => {
    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);
    const [showFilters, setShowFilters] = useState(false);

    // Notifications
    const { notification, showNotification, dismissNotification } = useNotifications();

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
        setActivities
    } = useActivities();

    // Local UI State
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activityToEdit, setActivityToEdit] = useState<any>(null);
    const [activityToDelete, setActivityToDelete] = useState<any>(null);
    const [currentTab, setCurrentTab] = useState('exigences');

    // --- Height Measure Effect (Students Page Strategy) ---
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
    }, [activities.length, showFilters, selectedActivity, searchTerm, statusFilter, moduleFilter]);

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
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* Sidebar Column - 1/4 weight like Students page */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    {/* Decorative Header - Exact Students Page Style */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <FileText className="text-primary" size={24} />
                            Liste des Activités
                        </h2>
                        <Badge variant="primary" size="xs">{activities.length} Total</Badge>
                    </div>

                    {/* Separator like Students page */}
                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <SearchBar
                                placeholder="Rechercher une activité..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                iconColor="text-primary"
                            />
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={clsx(
                                    "p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0",
                                    showFilters
                                        ? "bg-primary text-text-dark border-primary shadow-lg shadow-primary/20"
                                        : "bg-surface/50 border-white/10 text-grey-medium hover:text-white hover:border-white/20"
                                )}
                                title="Filtres"
                            >
                                <SlidersHorizontal size={20} />
                            </button>
                        </div>

                        {showFilters && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                <FilterSelect
                                    options={[
                                        { value: 'all', label: 'Statuts: Tous' },
                                        { value: 'en_preparation', label: 'En préparation' },
                                        { value: 'en_cours', label: 'En cours' },
                                        { value: 'archive', label: 'Archives' }
                                    ]}
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    icon={Clock}
                                    className="flex-1"
                                />
                                <FilterSelect
                                    options={[
                                        { value: 'all', label: 'Modules: Tous' },
                                        ...availableModules.map(m => ({ value: m.id, label: m.nom }))
                                    ]}
                                    value={moduleFilter}
                                    onChange={(e) => setModuleFilter(e.target.value)}
                                    icon={Folder}
                                    className="flex-1"
                                />
                            </div>
                        )}
                    </div>
                </CardInfo>

                <CardList
                    actionLabel="Nouvelle activité"
                    onAction={handleOpenCreate}
                    actionIcon={Plus}
                >
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Avatar loading size="md" initials="" />
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <EmptyState
                            icon={Puzzle}
                            title="Aucune activité"
                            description="Ajustez vos filtres ou créez-en une nouvelle."
                            size="sm"
                        />
                    ) : (
                        filteredActivities.map((activity) => (
                            <ListItem
                                key={activity.id}
                                id={activity.id}
                                title={activity.titre}
                                subtitle={activity.Module?.nom}
                                isSelected={selectedActivity?.id === activity.id}
                                onClick={() => handleSelectActivity(activity)}
                                onEdit={() => handleEdit(activity)}
                                onDelete={() => setActivityToDelete(activity)}
                                deleteTitle="Supprimer l'activité"
                                avatar={{
                                    icon: Puzzle,
                                    className: selectedActivity?.id === activity.id ? "bg-white/20" : "bg-background"
                                }}
                            />
                        ))
                    )}
                </CardList>
            </div>

            {/* Detail Column */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                {!selectedActivity ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={Puzzle}
                            title="Sélectionnez une activité"
                            description="Sélectionnez une activité dans la liste pour voir les détails."
                            size="md"
                        />
                    </div>
                ) : (
                    <>
                        {/* Header Info Card - Decorative Header Style */}
                        <CardInfo
                            ref={rightContentRef}
                            height={headerHeight}
                        >
                            <div className="flex gap-5 items-center">
                                <Avatar
                                    size="lg"
                                    icon={Puzzle}
                                    className="bg-surface border-4 border-background"
                                />
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-cq-xl font-bold text-text-main truncate">
                                        {selectedActivity.titre}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <Badge variant="secondary" size="sm" className="bg-white/5">
                                            <Folder size={14} className="mr-2" />
                                            {selectedActivity.Module?.nom}
                                        </Badge>
                                        <Badge
                                            variant={selectedActivity.statut === 'en_cours' ? 'primary' : 'secondary'}
                                            size="sm"
                                            className="uppercase tracking-widest text-[10px]"
                                        >
                                            {selectedActivity.statut.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardInfo>

                        <CardTabs
                            tabs={[
                                { id: 'exigences', label: 'Exigences', icon: LayoutList },
                                { id: 'infos', label: 'Infos Complémentaires', icon: FileText }
                            ]}
                            activeTab={currentTab}
                            onChange={setCurrentTab}
                        >
                            {currentTab === 'exigences' && (
                                <ActivityDetails
                                    selectedActivity={selectedActivity}
                                    setActivities={setActivities}
                                />
                            )}
                            {currentTab === 'infos' && (
                                <div className="p-8 text-center text-grey-medium italic opacity-60">
                                    Aucune information complémentaire disponible pour cet atelier.
                                </div>
                            )}
                        </CardTabs>
                    </>
                )}
            </div>

            {/* Modals & Notifications */}
            <ConfirmModal
                isOpen={!!activityToDelete}
                onClose={() => setActivityToDelete(null)}
                onConfirm={handleDelete}
                title="Supprimer l'activité ?"
                message={`Êtes-vous sûr de vouloir supprimer "${activityToDelete?.titre}" ? Cette action est irréversible.`}
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

            {notification && (
                <div className={clsx(
                    "fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 border backdrop-blur-md",
                    notification.type === 'success' ? "bg-success/90 border-success/20 text-text-dark" : "bg-danger/90 border-danger/20 text-white"
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
                    <button onClick={dismissNotification} className="ml-4 p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-50 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Activities;
