/**
 * Nom du module/fichier : useAdultsPageFlow.ts
 * 
 * Données en entrée : 
 *   - Utilise les hooks métier useAdults et useActivityTypes.
 * 
 * Données en sortie : 
 *   - states : Ensemble des états de la page (adultes, sélection, modales, recherche...).
 *   - actions : Fonctions pour manipuler ces états (ouvrir modales, soumettre formulaires...).
 * 
 * Objectif principal : Ce "hook de flux" centralise toute la logique d'interaction de la page "Adultes". Il fait le pont entre les composants visuels (boutons, listes) et les services de données. Il gère notamment la synchronisation visuelle (hauteur des colonnes) et le cycle de vie des formulaires.
 */

import { useState, useRef, useLayoutEffect } from 'react';
import { useAdults } from './useAdults';
import { useActivityTypes } from './useActivityTypes';
import { Database } from '../../../types/supabase';

type AdultRow = Database['public']['Tables']['Adulte']['Row'];

export function useAdultsPageFlow() {
    // RÉCUPÉRATION DES SERVICES DE DONNÉES
    const adultsHook = useAdults();
    const activityTypesHook = useActivityTypes();

    // ÉTATS DE SÉLECTION ET NAVIGATION
    const [selectedAdult, setSelectedAdult] = useState<AdultRow | null>(null);
    const [activeTab, setActiveTab] = useState<'types' | 'details'>('types');

    // ÉTATS DES FENÊTRES FLOTTANTES (Modales) - ADULTES
    const [showAdultModal, setShowAdultModal] = useState(false);
    const [isEditingAdult, setIsEditingAdult] = useState(false);
    const [currentAdultForm, setCurrentAdultForm] = useState<any>({ nom: '', prenom: '', fonction: '' });
    const [adultToDelete, setAdultToDelete] = useState<AdultRow | null>(null);

    // ÉTATS DES FENÊTRES FLOTTANTES (Modales) - ACTIONS
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [isEditingActivity, setIsEditingActivity] = useState(false);
    const [currentActivityForm, setCurrentActivityForm] = useState<any>({ label: '' });
    const [activityToDelete, setActivityToDelete] = useState<any>(null);

    // SYNCHRONISATION VISUELLE : Alignement des hauteurs de colonnes
    // On utilise Refs et LayoutEffect pour s'assurer que les deux colonnes ont la même taille d'en-tête.
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

    // GESTIONNAIRES D'ÉVÉNEMENTS : MODULE ADULTES
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

    // GESTIONNAIRES D'ÉVÉNEMENTS : MODULE TYPES D'ACTIONS
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

    // EXPOSITION DES ÉTATS ET ACTIONS AU COMPOSANT VISUEL
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. INITIALISATION : Le hook orchestre deux autres hooks métier (données) et gère lui-même les états de "navigation" (sélection d'adulte, onglets).
 * 2. FLUX DES FORMULAIRES : Centralise l'ouverture des fenêtres de saisie, le pré-remplissage des champs, et le nettoyage après envoi.
 * 3. SYNCHRONISATION : Calcule dynamiquement les hauteurs d'en-tête pour garantir un design fluide.
 * 4. SORTIE : Renvoie un objet structuré (states/actions) facilitant l'écriture du composant AdultsPage.tsx.
 */
