/**
 * @component SettingsSystemTab
 * @description Onglet Système des paramètres. Permet de gérer le thème, 
 * l'environnement de test, le cache, la synchronisation et l'optimisation des photos.
 */

import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

import { useSettingsSystemTabFlow } from '../hooks/useSettingsSystemTabFlow';
import { ConfirmModal, Card, Button } from '../../../core';

// Sections
import { AppearanceSection } from './AppearanceSection';
import { EnvironmentSection } from './EnvironmentSection';
import { LuckyCheckSection } from './LuckyCheckSection';
import { BulkIndexSection } from './BulkIndexSection';
import { PhotoOptimizationSection } from './PhotoOptimizationSection';
import { CacheAndSyncSection } from './CacheAndSyncSection';

interface SettingsSystemTabProps {
    setProfile?: (profile: any) => void;
    refreshProfile?: () => void;
}

export const SettingsSystemTab: React.FC<SettingsSystemTabProps> = ({
    setProfile,
    refreshProfile,
}) => {
    const { system, cache, photos } = useSettingsSystemTabFlow(setProfile, refreshProfile);

    const {
        isGenerating,
        handleGenerateDemoData,
        handleCheckAndFixProgressions,
        showResetModal,
        setShowResetModal,
        handleHardReset,
        isResetting
    } = system;

    const {
        cacheStats,
        cacheEnabled,
        handleToggleCache,
        handleClearCache,
        syncStats,
        handleClearSyncData,
        branches,
        allStudents,
        selectedBulkBranch,
        setSelectedBulkBranch,
        selectedBulkIndex,
        setSelectedBulkIndex,
        isUpdatingBulk,
        isLoadingBulkData,
        handleBulkAdjustIndices,
        handleBulkUpdateIndices,
        defaultLuckyCheckIndex,
        setDefaultLuckyCheckIndex,
        isSavingDefaultIndex,
        handleSaveDefaultLuckyCheckIndex
    } = cache;

    const {
        isOptimizingPhotos,
        optimizationProgress,
        optimizationStats,
        photoAnalysis,
        isAnalyzing,
        showPhotoAnalysis,
        setShowPhotoAnalysis,
        handleAnalyzePhotos,
        handleOptimizeAllPhotos
    } = photos;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Apparence */}
            <AppearanceSection />

            {/* Environnement */}
            <EnvironmentSection
                handleGenerateDemoData={handleGenerateDemoData}
                isGenerating={isGenerating}
                handleCheckAndFixProgressions={handleCheckAndFixProgressions}
            />

            {/* Lucky Check Configuration */}
            <LuckyCheckSection
                defaultLuckyCheckIndex={defaultLuckyCheckIndex}
                setDefaultLuckyCheckIndex={setDefaultLuckyCheckIndex}
                isSavingDefaultIndex={isSavingDefaultIndex}
                handleSaveDefaultLuckyCheckIndex={handleSaveDefaultLuckyCheckIndex}
            />

            {/* Bulk Index Update */}
            <BulkIndexSection
                branches={branches}
                allStudents={allStudents}
                selectedBulkBranch={selectedBulkBranch}
                setSelectedBulkBranch={setSelectedBulkBranch}
                selectedBulkIndex={selectedBulkIndex}
                setSelectedBulkIndex={setSelectedBulkIndex}
                isUpdatingBulk={isUpdatingBulk}
                isLoadingBulkData={isLoadingBulkData}
                handleBulkAdjustIndices={handleBulkAdjustIndices}
                handleBulkUpdateIndices={handleBulkUpdateIndices}
            />

            {/* Photo Optimization */}
            <PhotoOptimizationSection
                isOptimizingPhotos={isOptimizingPhotos}
                optimizationProgress={optimizationProgress}
                optimizationStats={optimizationStats}
                photoAnalysis={photoAnalysis}
                isAnalyzing={isAnalyzing}
                showPhotoAnalysis={showPhotoAnalysis}
                setShowPhotoAnalysis={setShowPhotoAnalysis}
                handleAnalyzePhotos={handleAnalyzePhotos}
                handleOptimizeAllPhotos={handleOptimizeAllPhotos}
            />

            {/* Cache & Sync */}
            <CacheAndSyncSection
                cacheStats={cacheStats}
                cacheEnabled={cacheEnabled}
                handleToggleCache={handleToggleCache}
                handleClearCache={handleClearCache}
                syncStats={syncStats}
                handleClearSyncData={handleClearSyncData}
            />

            {/* Danger Zone */}
            <Card variant="default" className="bg-danger/5 border-danger/10 p-6">
                <h2 className="text-lg font-bold text-danger mb-6 flex items-center gap-2">
                    <AlertTriangle size={20} /> Zone de Danger
                </h2>
                <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Vider toutes les données</h3>
                        <p className="text-xs text-grey-medium">Supprime définitivement vos élèves, classes et suivis.</p>
                    </div>
                    <Button
                        variant="danger"
                        onClick={() => setShowResetModal(true)}
                        icon={Trash2}
                    >
                        Réinitialiser
                    </Button>
                </div>
            </Card>

            {/* Hard Reset Confirmation */}
            <ConfirmModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleHardReset}
                title="Effacer toutes les données ?"
                message="Cette action supprimera tout votre contenu sauf votre profil. C'est irréversible."
                confirmText="Tout effacer"
                variant="danger"
                isLoading={isResetting}
            />
        </div>
    );
};

export default SettingsSystemTab;
