/**
 * @hook useGroupsPageFlow
 * @description Gère la logique complexe de la page de gestion des groupes.
 * Centralise la gestion des données des groupes, des élèves par groupe, la génération de PDF
 * et la synchronisation des hauteurs d'affichage.
 * 
 * @example
 * const { states, actions } = useGroupsPageFlow();
 */

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Tables } from '../../../types/supabase';
import { useGroupsData } from './useGroupsData';
import { useGroupStudents, StudentWithClass } from './useGroupStudents';
import { useGroupPdfGenerator } from '../../dashboard/hooks/useGroupPdfGenerator';

export function useGroupsPageFlow() {
    const [activeTab, setActiveTab] = useState<'students' | 'actions'>('students');

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

    // Data Hooks
    const groupsData = useGroupsData();
    const groupStudentsData = useGroupStudents(groupsData.selectedGroup);

    // PDF Generator Hook
    const pdfGenerator = useGroupPdfGenerator();

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
            groupsData,
            groupStudentsData,
            pdfGenerator
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
            handleAddClick,
            handleEditGroupClick,
            handleDeleteClick,
            confirmDeleteGroup,
            handleEditStudent,
            handleStudentSaved,
            handleCloseGroupModal
        }
    };
}
