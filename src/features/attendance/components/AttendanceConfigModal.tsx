/**
 * Nom du module/fichier : AttendanceConfigModal.tsx
 * 
 * Données en entrée : 
 *   - isOpen : État d'ouverture de la fenêtre.
 *   - groups, setups, selectedGroup : Les données actuelles de l'application pour synchronisation.
 *   - currentDateForExport : La date servant de point de départ pour l'onglet Export.
 * 
 * Données en sortie : Une interface modale organisée en onglets.
 * 
 * Objectif principal : Centraliser toutes les options "avancées" de l'appel. Elle permet de changer de classe rapidement, de configurer les types d'appel (onglet Configuration) ou de générer les rapports (onglet Export). C'est le centre de commande secondaire de la fonctionnalité Présence.
 */

import React, { useState } from 'react';
import { Group, Student, SetupPresence, CategoriePresence } from '../services/attendanceService';
import { Settings, LayoutGrid, Layers, FileText } from 'lucide-react';
import { Modal, ConfirmModal, Tabs } from '../../../core';

import { useAttendanceConfig } from '../hooks/useAttendanceConfig';
import { AttendanceGeneralTab } from './AttendanceGeneralTab';
import { AttendanceConfigTab } from './AttendanceConfigTab';
import { AttendanceExportTab } from './AttendanceExportTab';

interface AttendanceConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfigSaved?: () => void;
    groups?: Group[];
    selectedGroup: Group | null;
    onSelectGroup?: (group: Group | undefined) => void;
    setups?: SetupPresence[];
    selectedSetup: SetupPresence | null;
    onSelectSetup?: (setup: SetupPresence) => void;
    onUnlockEditing?: () => void;
    activeCategories?: CategoriePresence[];
    studentsForExport?: Student[];
    currentDateForExport: string;
    isSetupLocked?: boolean;
}

/**
 * Composant Modale regroupant Onglets de réglages, Configuration et Exports PDF.
 */
const AttendanceConfigModal: React.FC<AttendanceConfigModalProps> = ({
    isOpen,
    onClose,
    onConfigSaved,
    groups = [],
    selectedGroup,
    onSelectGroup,
    setups = [],
    selectedSetup,
    onSelectSetup,
    onUnlockEditing,
    activeCategories = [],
    studentsForExport = [],
    currentDateForExport,
    isSetupLocked = false
}) => {

    // --- LOGIQUE MÉTIER ---
    // On extrait toute la logique (état des onglets, chargement des exports) dans un Hook dédié
    const {
        sets, loading,
        view, setView,
        currentSet, setCurrentSet,
        categories,
        activeTab, setActiveTab,
        // Export
        exportMode, setExportMode,
        availablePeriods,
        selectedPeriod, setSelectedPeriod,
        exportData, exportDates,
        selectedDay, setSelectedDay,
        handleCreateNew, handleReorder, handleEdit, handleDeleteSet, handleSaveSet,
        addCategory, removeCategory, updateCategory,
        handleCopyPeriod
    } = useAttendanceConfig({
        selectedGroup, selectedSetup, currentDateForExport, isOpen
    });

    // État local pour gérer les fenêtres de confirmation (ex: "Voulez-vous vraiment supprimer ?")
    const [confirmModalState, setConfirmModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (() => void) | null;
    }>({ isOpen: false, title: '', message: '', onConfirm: null });


    /**
     * Encapsule l'action de suppression d'une configuration pour y ajouter une étape de sécurité (confirmation).
     */
    const handleDeleteWrapper = (id: string, name: string) => {
        setConfirmModalState({
            isOpen: true,
            title: "Supprimer ce set ?",
            message: `Êtes-vous sûr de vouloir supprimer la configuration "${name}" ? Tout l'historique associé risque d'être impacté.`,
            onConfirm: () => handleDeleteSet(id)
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Options & Configuration"
            icon={<Settings size={24} />}
            footer={null}
        >
            {/* Système d'onglets pour naviguer entre Général, Config et Export */}
            <Tabs
                tabs={[
                    { id: 'general', label: 'Général', icon: LayoutGrid },
                    { id: 'config', label: 'Configuration', icon: Layers },
                    { id: 'export', label: 'Export', icon: FileText }
                ]}
                activeTab={activeTab}
                onChange={(id) => {
                    setActiveTab(id as any);
                    // Si on quitte l'onglet config, on remet la vue en mode 'liste' par défaut
                    if (id !== 'config') setView('list');
                }}
                variant="capsule"
                fullWidth
                className="mb-8"
            />

            <div className="min-h-[300px]">
                {/* CONTENU ONGLET 1 : RÉGLAGES GÉNÉRAUX */}
                {activeTab === 'general' && (
                    <AttendanceGeneralTab
                        groups={groups}
                        selectedGroup={selectedGroup}
                        onSelectGroup={onSelectGroup}
                        setups={setups}
                        selectedSetup={selectedSetup}
                        onSelectSetup={onSelectSetup}
                        isSetupLocked={isSetupLocked}
                        onUnlockEditing={onUnlockEditing || (() => { })}
                        onCopyPeriod={(s, t) => handleCopyPeriod(s, t, onConfigSaved)}
                        setConfirmModal={setConfirmModalState}
                    />
                )}

                {/* CONTENU ONGLET 2 : CONFIGURATION DES TYPES D'APPELS */}
                {activeTab === 'config' && (
                    <AttendanceConfigTab
                        view={view}
                        setView={setView}
                        sets={sets}
                        currentSet={currentSet}
                        setCurrentSet={setCurrentSet}
                        categories={categories}
                        loading={loading}
                        handleCreateNew={handleCreateNew}
                        handleReorder={handleReorder}
                        handleEdit={handleEdit}
                        handleDeleteSet={handleDeleteWrapper}
                        handleSaveSet={() => handleSaveSet(onConfigSaved)}
                        addCategory={addCategory}
                        removeCategory={removeCategory}
                        updateCategory={updateCategory}
                    />
                )}

                {/* CONTENU ONGLET 3 : GÉNÉRATION PDF ET EXPORT */}
                {activeTab === 'export' && (
                    <AttendanceExportTab
                        exportMode={exportMode}
                        setExportMode={setExportMode}
                        selectedGroup={selectedGroup}
                        selectedDay={selectedDay}
                        setSelectedDay={setSelectedDay}
                        availablePeriods={availablePeriods}
                        selectedPeriod={selectedPeriod}
                        setSelectedPeriod={setSelectedPeriod}
                        exportDates={exportDates}
                        exportData={exportData}
                        activeCategories={activeCategories}
                        studentsForExport={studentsForExport}
                    />
                )}
            </div>

            {/* Fenêtre de confirmation flottante pour les actions destructives */}
            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
                onConfirm={() => {
                    if (confirmModalState.onConfirm) confirmModalState.onConfirm();
                }}
                title={confirmModalState.title}
                message={confirmModalState.message}
                variant="warning"
            />
        </Modal>
    );
};

export default AttendanceConfigModal;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur l'icône 'Paramètres' de la page Présence.
 * 2. La fenêtre `AttendanceConfigModal` s'ouvre sur l'onglet "Général".
 * 3. L'enseignant décide de créer un nouveau type d'appel ? Il va sur l'onglet "Configuration".
 * 4. Il veut imprimer les absences du mois ? Il va sur l'onglet "Export".
 * 5. Quand il a fini, il ferme la modale.
 * 6. Les changements (si enregistrés) sont immédiatement appliqués sur la page principale via `onConfigSaved`.
 */
