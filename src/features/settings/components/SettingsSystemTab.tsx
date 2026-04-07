/**
 * Nom du module/fichier : SettingsSystemTab.tsx
 * 
 * Données en entrée : 
 *   - `setProfile` / `refreshProfile` : Fonctions pour mettre à jour les infos de l'utilisateur après un changement.
 * 
 * Données en sortie : 
 *   - Une interface de configuration regroupant tous les réglages techniques (Thème, Cache, Exports).
 * 
 * Objectif principal : Centraliser l'accès à tous les réglages "système" de l'application. Cet onglet permet à l'enseignant de personnaliser l'apparence (Mode sombre/clair), de gérer les données de test (pour s'entraîner), d'optimiser le stockage des photos de classe et de réinitialiser complètement ses données en cas de besoin.
 * 
 * Ce que ça orchestre : 
 *   - L'affichage de plusieurs "sections" thématiques (Apparence, Environnement, Photos...).
 *   - La "Zone de Danger" pour l'effacement définitif de toutes les données.
 *   - La synchronisation et le nettoyage du cache local du navigateur.
 */

import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

import { useSettingsSystemTabFlow } from '../hooks/useSettingsSystemTabFlow';
import { ConfirmModal, Card, Button } from '../../../core';

// IMPORT DES SOUS-SECTIONS (Composants spécialisés)
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

/**
 * COMPOSANT : Onglet de configuration Système.
 */
export const SettingsSystemTab: React.FC<SettingsSystemTabProps> = ({
    setProfile,
    refreshProfile,
}) => {
    // RÉCUPÉRATION DE TOUS LES ÉTATS ET ACTIONS via un Hook "Chef d'orchestre"
    const { system, cache, photos } = useSettingsSystemTabFlow(setProfile, refreshProfile);

    // Extraction des fonctions pour la manipulation globale (reset, demo...)
    const {
        isGenerating,
        handleGenerateDemoData,
        handleCheckAndFixProgressions,
        showResetModal,
        setShowResetModal,
        handleHardReset,
        isResetting
    } = system;

    // Extraction des fonctions liées à la mémoire (Cache) et aux élèves
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

    // Extraction des fonctions liées aux photos
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
            {/* SECTION 1 : Couleurs et mode d'affichage */}
            <AppearanceSection />

            {/* SECTION 2 : Outils techniques (Données de démo, réparations) */}
            <EnvironmentSection
                handleGenerateDemoData={handleGenerateDemoData}
                isGenerating={isGenerating}
                handleCheckAndFixProgressions={handleCheckAndFixProgressions}
            />

            {/* SECTION 3 : Tirage au sort (Lucky Check) */}
            <LuckyCheckSection
                defaultLuckyCheckIndex={defaultLuckyCheckIndex}
                setDefaultLuckyCheckIndex={setDefaultLuckyCheckIndex}
                isSavingDefaultIndex={isSavingDefaultIndex}
                handleSaveDefaultLuckyCheckIndex={handleSaveDefaultLuckyCheckIndex}
            />

            {/* SECTION 4 : Mise à jour par lots des indices élèves */}
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

            {/* SECTION 5 : Gain de place (Optimisation des photos) */}
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

            {/* SECTION 6 : Mémoire du navigateur (Cache) */}
            <CacheAndSyncSection
                cacheStats={cacheStats}
                cacheEnabled={cacheEnabled}
                handleToggleCache={handleToggleCache}
                handleClearCache={handleClearCache}
                syncStats={syncStats}
                handleClearSyncData={handleClearSyncData}
            />

            {/* SECTION 7 : ZONE CRITIQUE (Effacement total) */}
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

            {/* FENÊTRE DE SÉCURITÉ : Demande de confirmation avant suicide des données */}
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

/**
 * LOGIGRAMME DE CONFIGURATION :
 * 
 * 1. CHARGEMENT -> Le composant récupère tous les réglages actuels depuis la base de données.
 * 2. AFFICHAGE -> Il découpe les réglages en sections lisibles (Photos, Cache, etc.).
 * 3. INTERACTION -> Si l'enseignant modifie un paramètre (ex: Thème sombre), le changement est immédiat.
 * 4. SÉCURITÉ -> Pour les actions graves (Réinitialiser), une fenêtre de confirmation bloque l'action jusqu'à une deuxième validation consciente.
 */
