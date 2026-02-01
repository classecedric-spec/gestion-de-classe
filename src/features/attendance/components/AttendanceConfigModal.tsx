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

    // --- Hook Logic ---
    const {
        sets, loading,
        view, setView,
        currentSet, setCurrentSet,
        categories, setCategories,
        activeTab, setActiveTab,
        // Export
        exportMode, setExportMode,
        availablePeriods,
        selectedPeriod, setSelectedPeriod,
        exportData, exportDates,
        selectedDay, setSelectedDay,
        // Actions
        handleCreateNew, handleEdit, handleDeleteSet, handleSaveSet,
        addCategory, removeCategory, updateCategory,
        handleCopyPeriod
    } = useAttendanceConfig({
        selectedGroup, selectedSetup, currentDateForExport, isOpen
    });

    // Local state for confirm modal needed for Generic Tab
    const [confirmModalState, setConfirmModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (() => void) | null;
    }>({ isOpen: false, title: '', message: '', onConfirm: null });


    // Wrappers for Tab Interactions
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
            <Tabs
                tabs={[
                    { id: 'general', label: 'Général', icon: LayoutGrid },
                    { id: 'config', label: 'Configuration', icon: Layers },
                    { id: 'export', label: 'Export', icon: FileText }
                ]}
                activeTab={activeTab}
                onChange={(id) => {
                    setActiveTab(id as any);
                    if (id !== 'config') setView('list');
                }}
                variant="capsule"
                fullWidth
                className="mb-8"
            />

            <div className="min-h-[300px]">
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
                        currentDateForExport={currentDateForExport}
                        onCopyPeriod={(s, t) => handleCopyPeriod(s, t, onConfigSaved)}
                        setConfirmModal={setConfirmModalState}
                    />
                )}

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
                        handleEdit={handleEdit}
                        handleDeleteSet={handleDeleteWrapper}
                        handleSaveSet={() => handleSaveSet(onConfigSaved)}
                        addCategory={addCategory}
                        removeCategory={removeCategory}
                        updateCategory={updateCategory}
                    />
                )}

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
