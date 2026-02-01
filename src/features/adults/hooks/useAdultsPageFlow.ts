/**
 * @hook useAdultsPageFlow
 * @description Gère la logique complexe de la page d'administration des adultes. 
 * Inclut la gestion des modales, les formulaires d'édition, et la synchronisation de l'affichage.
 * 
 * @example
 * const { states, actions } = useAdultsPageFlow();
 */

import { useState, useRef, useLayoutEffect } from 'react';
import { useAdults } from './useAdults';
import { useActivityTypes } from './useActivityTypes';
import { Database } from '../../../types/supabase';

type AdultRow = Database['public']['Tables']['Adulte']['Row'];

export function useAdultsPageFlow() {
    const adultsHook = useAdults();
    const activityTypesHook = useActivityTypes();

    const [selectedAdult, setSelectedAdult] = useState<AdultRow | null>(null);
    const [activeTab, setActiveTab] = useState<'types' | 'details'>('types');

    // Modals state
    const [showAdultModal, setShowAdultModal] = useState(false);
    const [isEditingAdult, setIsEditingAdult] = useState(false);
    const [currentAdultForm, setCurrentAdultForm] = useState<any>({ nom: '', prenom: '', fonction: '' });
    const [adultToDelete, setAdultToDelete] = useState<AdultRow | null>(null);

    const [showActivityModal, setShowActivityModal] = useState(false);
    const [isEditingActivity, setIsEditingActivity] = useState(false);
    const [currentActivityForm, setCurrentActivityForm] = useState<any>({ label: '' });
    const [activityToDelete, setActivityToDelete] = useState<any>(null);

    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

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
        return () => clearTimeout(t);
    }, [adultsHook.filteredAdults.length, selectedAdult, adultsHook.searchTerm]);

    // Handlers: Adults
    const handleOpenAddAdult = () => {
        setCurrentAdultForm({ nom: '', prenom: '', fonction: '' });
        setIsEditingAdult(false);
        setShowAdultModal(true);
    };

    const handleOpenEditAdult = (e: React.MouseEvent, adult: AdultRow) => {
        e.stopPropagation();
        setCurrentAdultForm({ ...adult, fonction: (adult as any).fonction || '' });
        setIsEditingAdult(true);
        setShowAdultModal(true);
    };

    const handleAdultSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { nom: currentAdultForm.nom, prenom: currentAdultForm.prenom };
        let success = false;
        if (isEditingAdult && currentAdultForm.id) {
            success = await adultsHook.updateAdult(currentAdultForm.id, payload as any);
        } else {
            success = await adultsHook.createAdult(payload as any);
        }
        if (success) setShowAdultModal(false);
    };

    const handleDeleteAdultConfirm = async () => {
        if (adultToDelete) {
            await adultsHook.deleteAdult(adultToDelete.id);
            if (selectedAdult?.id === adultToDelete.id) setSelectedAdult(null);
            setAdultToDelete(null);
        }
    };

    // Handlers: Activities
    const handleOpenAddActivity = () => {
        setCurrentActivityForm({ label: '' });
        setIsEditingActivity(false);
        setShowActivityModal(true);
    };

    const handleOpenEditActivity = (act: any) => {
        setCurrentActivityForm(act);
        setIsEditingActivity(true);
        setShowActivityModal(true);
    };

    const handleActivitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let success = false;
        if (isEditingActivity && currentActivityForm.id) {
            success = await activityTypesHook.updateActivityType(currentActivityForm.id, currentActivityForm.label || '');
        } else {
            success = await activityTypesHook.createActivityType(currentActivityForm.label || '');
        }
        if (success) setShowActivityModal(false);
    };

    const handleDeleteActivityConfirm = async () => {
        if (activityToDelete) {
            await activityTypesHook.deleteActivityType(activityToDelete.id);
            setActivityToDelete(null);
        }
    };

    return {
        states: {
            adultsHook,
            activityTypesHook,
            selectedAdult,
            activeTab,
            showAdultModal,
            isEditingAdult,
            currentAdultForm,
            adultToDelete,
            showActivityModal,
            isEditingActivity,
            currentActivityForm,
            activityToDelete,
            headerHeight,
            leftContentRef,
            rightContentRef
        },
        actions: {
            setSelectedAdult,
            setActiveTab,
            setShowAdultModal,
            setCurrentAdultForm,
            setAdultToDelete,
            setShowActivityModal,
            setCurrentActivityForm,
            setActivityToDelete,
            handleOpenAddAdult,
            handleOpenEditAdult,
            handleAdultSubmit,
            handleDeleteAdultConfirm,
            handleOpenAddActivity,
            handleOpenEditActivity,
            handleActivitySubmit,
            handleDeleteActivityConfirm
        }
    };
}
