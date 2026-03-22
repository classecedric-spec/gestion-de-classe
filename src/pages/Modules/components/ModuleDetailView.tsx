import React from 'react';
import { Folder, Plus, Sparkles } from 'lucide-react';
import { CardInfo, Badge, CardTabs, EmptyState } from '../../../core';

// Subcomponents
import ActivitiesTab from './ActivitiesTab';
import GroupsTab from './GroupsTab';
import ProgressionKanban from './ProgressionKanban';
import { useLinkedGroups } from '../hooks/useLinkedGroups';

interface ModuleDetailViewProps {
    moduleHook: any;
    detailTab: 'activities' | 'groups' | 'progression';
    setDetailTab: (tab: 'activities' | 'groups' | 'progression') => void;
    // Hooks Props
    activityHook: any;
    groupHook: any;
    progressionGenHook: any;
    progressionHook: any;
    // Actions
    handleAddActivity: () => void;
    handleEditActivity: (activity: any) => void;
    setActivityToDelete: (activity: any) => void;
    handleCreateSeries: () => void;
    contentRef?: React.Ref<HTMLDivElement>;
    headerHeight?: number;
}

export const ModuleDetailView: React.FC<ModuleDetailViewProps> = ({
    moduleHook,
    detailTab,
    setDetailTab,
    activityHook,
    groupHook,
    progressionGenHook,
    progressionHook,
    handleAddActivity,
    handleEditActivity,
    setActivityToDelete,
    handleCreateSeries,
    contentRef,
    headerHeight
}) => {
    const { linkedGroups, linkedClasses } = useLinkedGroups(moduleHook.states.selectedModule);

    if (!moduleHook.states.selectedModule) {
        return (
            <div className="flex-1 card-flat overflow-hidden">
                <EmptyState
                    icon={Folder}
                    title="Sélectionnez un module"
                    description="Cliquez sur un module dans la liste pour afficher ses détails, activités et progression."
                    size="md"
                />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
            {/* Module Header Area */}
            <CardInfo
                ref={contentRef}
                height={headerHeight}
            >
                <div className="flex gap-6 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-primary shadow-xl shrink-0">
                        <Folder size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-text-main truncate">{moduleHook.states.selectedModule.nom}</h1>
                            <button
                                onClick={() => moduleHook.actions.toggleStatus(moduleHook.states.selectedModule as any)}
                                className="transition-transform active:scale-95 focus:outline-none"
                            >
                                <Badge
                                    variant={
                                        moduleHook.states.selectedModule.statut === 'en_cours' ? 'success' :
                                            moduleHook.states.selectedModule.statut === 'archive' ? 'danger' :
                                                'primary'
                                    }
                                    size="xs"
                                    className="cursor-pointer hover:opacity-80"
                                >
                                    {moduleHook.states.selectedModule.statut === 'en_cours' ? 'En cours' :
                                        moduleHook.states.selectedModule.statut === 'archive' ? 'Archive' :
                                            'En préparation'}
                                </Badge>
                            </button>
                        </div>
                        <p className="text-sm text-grey-medium">
                            {moduleHook.states.selectedModule.SousBranche && (
                                <>
                                    {moduleHook.states.selectedModule.SousBranche.Branche && `${moduleHook.states.selectedModule.SousBranche.Branche.nom} - `}
                                    {moduleHook.states.selectedModule.SousBranche.nom}
                                </>
                            )}
                        </p>
                        
                        {/* Linked Groups & Classes */}
                        {(linkedClasses.length > 0 || linkedGroups.length > 0) && (
                            <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-left-2 duration-500">
                                {linkedClasses.map(classe => (
                                    <Badge 
                                        key={classe.id} 
                                        variant="primary" 
                                        size="xs" 
                                        className="bg-primary/20 text-text-main border-primary/30 flex items-center gap-1.5 px-3 py-1"
                                    >
                                        <div className="w-1 h-1 rounded-full bg-primary" />
                                        Classe : {classe.nom}
                                    </Badge>
                                ))}
                                {linkedGroups.map(group => (
                                    <Badge 
                                        key={group.id} 
                                        variant="primary" 
                                        size="xs" 
                                        className="bg-primary/10 text-text-main/80 border-primary/20 flex items-center gap-1.5 px-3 py-1"
                                    >
                                        <div className="w-1 h-1 rounded-full bg-primary/60" />
                                        Groupe : {group.nom}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardInfo>

            {/* Content Section - Tabs */}
            <CardTabs
                tabs={[
                    { id: 'activities', label: 'Ateliers' },
                    { id: 'groups', label: 'Ciblage Groupes' },
                    { id: 'progression', label: 'Suivi & Progression' }
                ]}
                activeTab={detailTab}
                onChange={setDetailTab as any}
                actionLabel={detailTab === 'activities' ? "Ajouter une activité" : undefined}
                onAction={detailTab === 'activities' ? handleAddActivity : undefined}
                actionIcon={detailTab === 'activities' ? Plus : undefined}
                secondaryActionLabel={detailTab === 'activities' ? "Créer une série" : undefined}
                onSecondaryAction={detailTab === 'activities' ? handleCreateSeries : undefined}
                secondaryActionIcon={detailTab === 'activities' ? Sparkles : undefined}
            >
                {detailTab === 'activities' ? (
                    <ActivitiesTab
                        activities={activityHook.states.moduleActivities}
                        onDragEnd={activityHook.actions.handleDragEnd}
                        onEditActivity={handleEditActivity}
                        onDelete={setActivityToDelete}
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
            </CardTabs>
        </div>
    );
};
