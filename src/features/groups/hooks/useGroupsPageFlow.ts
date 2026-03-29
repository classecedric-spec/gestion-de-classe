/**
 * @hook useGroupsPageFlow
 * @description Gère la logique complexe de la page de gestion des groupes.
 * Centralise la gestion des données des groupes, des élèves par groupe, la génération de PDF
 * et la synchronisation des hauteurs d'affichage.
 * 
 * @example
 * const { states, actions } = useGroupsPageFlow();
 */

import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';
import { useGroupsData } from './useGroupsData';
import { useGroupStudents, StudentWithClass } from './useGroupStudents';
import { useGroupPdfGenerator } from '../../dashboard/hooks/useGroupPdfGenerator';
import { trackingService } from '../../tracking/services/trackingService';

export function useGroupsPageFlow() {
    const [activeTab, setActiveTab] = useState<'students' | 'actions' | 'tableau'>('students');
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['classe', 'importance_suivi']);
    const [eleveProfilCompetences, setEleveProfilCompetences] = useState<any>({});
    const [branches, setBranches] = useState<any[]>([]);

    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    // Modals State
    const [showModal, setShowModal] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<Tables<'Groupe'> | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<Tables<'Groupe'> | null>(null);

    // Student Modals
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editStudentId, setEditStudentId] = useState<string | null>(null);
    const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);

    // Action Modals
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrInitialTab, setQrInitialTab] = useState<'encodage' | 'planification' | 'both'>('encodage');

    // Data Hooks
    const groupsData = useGroupsData();
    const groupStudentsData = useGroupStudents(groupsData.selectedGroup);

    // PDF Generator Hook
    const pdfGenerator = useGroupPdfGenerator();

    // Load preferences
    useEffect(() => {
        const loadPrefs = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Column preferences
                const prefs = await trackingService.loadUserPreference(user.id, 'group_tableau_visible_columns');
                if (prefs && Array.isArray(prefs)) {
                    setVisibleColumns(prefs.filter(c => c !== 'sex'));
                }

                // Branch indices
                const profile = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
                if (profile) setEleveProfilCompetences(profile);

                // Branch List
                const { data: branchData } = await supabase.from('Branche').select('id, nom').order('ordre');
                if (branchData) setBranches(branchData || []);
            }
        };
        loadPrefs();
    }, []);

    const toggleColumn = useCallback(async (columnId: string) => {
        setVisibleColumns(prev => {
            const next = prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId];

            // Save to DB in background
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    trackingService.saveUserPreference(user.id, 'group_tableau_visible_columns', next);
                }
            });

            return next;
        });
    }, []);

    const reorderColumns = useCallback(async (newOrder: string[]) => {
        setVisibleColumns(newOrder);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await trackingService.saveUserPreference(user.id, 'group_tableau_visible_columns', newOrder);
        }
    }, []);

    const updateStudentField = useCallback(async (studentId: string, field: string, value: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (field.startsWith('branch_')) {
                const branchId = field.replace('branch_', '');
                const currentProfile = { ...eleveProfilCompetences };
                const studentData = currentProfile[studentId] || {};
                studentData[branchId] = value;
                currentProfile[studentId] = studentData;
                
                setEleveProfilCompetences(currentProfile);
                await trackingService.saveUserPreference(user.id, 'eleve_profil_competences', currentProfile);
                return;
            }

            const { error } = await supabase
                .from('Eleve')
                .update({ [field]: value })
                .eq('id', studentId);

            if (error) throw error;
            
            // Refresh local data
            groupStudentsData.fetchStudentsInGroup(groupsData.selectedGroup?.id || '');
        } catch (error) {
            console.error('Error updating student field:', error);
        }
    }, [eleveProfilCompetences, groupStudentsData, groupsData.selectedGroup]);

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
    }, [groupsData.groups.length, groupsData.selectedGroup, groupStudentsData.studentsInGroup.length]);

    // Cancellation Effect
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (pdfGenerator.isGenerating && e.key === 'Escape') pdfGenerator.cancelGeneration();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [pdfGenerator.isGenerating, pdfGenerator.cancelGeneration]);

    // Handlers
    const handleAddClick = () => {
        setIsEditingGroup(false);
        setGroupToEdit(null);
        setShowModal(true);
    };

    const handleEditGroupClick = (e: React.MouseEvent, group: Tables<'Groupe'>) => {
        e.stopPropagation();
        setIsEditingGroup(true);
        setGroupToEdit(group);
        setShowModal(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, group: Tables<'Groupe'>) => {
        e.stopPropagation();
        setGroupToDelete(group);
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        await groupsData.handleDeleteGroup(groupToDelete.id);
        setGroupToDelete(null);
    };

    const handleEditStudent = (student: StudentWithClass) => {
        setEditStudentId(student.id);
        setIsEditingStudent(true);
        setShowStudentModal(true);
    };

    const handleStudentSaved = () => {
        if (groupsData.selectedGroup) groupStudentsData.fetchStudentsInGroup(groupsData.selectedGroup.id);
        setShowStudentModal(false);
    };

    const handleCloseGroupModal = () => {
        setShowModal(false);
        setIsEditingGroup(false);
        setGroupToEdit(null);
    };

    return {
        states: {
            activeTab,
            headerHeight,
            leftContentRef,
            rightContentRef,
            showModal,
            isEditingGroup,
            groupToEdit,
            groupToDelete,
            showStudentModal,
            isEditingStudent,
            editStudentId,
            showAddToGroupModal,
            showQRModal,
            qrInitialTab,
            groupsData,
            groupStudentsData,
            pdfGenerator,
            visibleColumns,
            eleveProfilCompetences,
            branches
        },
        actions: {
            setActiveTab,
            setShowModal,
            setIsEditingGroup,
            setGroupToEdit,
            setGroupToDelete,
            setShowStudentModal,
            setIsEditingStudent,
            setEditStudentId,
            setShowAddToGroupModal,
            setShowQRModal,
            setQRInitialTab: setQrInitialTab,
            handleAddClick,
            handleEditGroupClick,
            handleDeleteClick,
            confirmDeleteGroup,
            handleEditStudent,
            handleStudentSaved,
            handleCloseGroupModal,
            toggleColumn,
            reorderColumns,
            updateStudentField
        }
    };
}
