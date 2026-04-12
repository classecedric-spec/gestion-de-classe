/**
 * Nom du module/fichier : useHomeData.ts
 * 
 * Données en entrée : 
 *   - userId (optionnel) : L'identifiant de l'enseignant pour lequel on veut charger les données.
 * 
 * Données en sortie : 
 *   - user : L'objet utilisateur complet.
 *   - userName : Le prénom du profil enseignant.
 *   - students : Liste de tous les élèves de l'enseignant.
 *   - groups : Liste des classes (groupes) de l'enseignant.
 *   - selectedGroup : Le groupe actuellement sélectionné pour filtrer le tableau de bord.
 * 
 * Objectif principal : Ce hook est le point d'entrée de la page d'accueil (Dashboard). Il centralise le chargement de toutes les informations nécessaires à l'enseignant dès sa connexion : son identité, ses élèves et ses classes. Il utilise un système de cache (React Query) pour éviter de recharger les données inutilement à chaque changement d'onglet.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
import { User } from '@supabase/supabase-js';
import { Student, Group } from '../../attendance/services/attendanceService';
import { studentService } from '../../students/services/studentService';
import { groupService } from '../../groups/services/groupService';
import { userService } from '../../users/services/userService';

export interface HomeData {
    user: User | null;
    userName: string;
    students: Student[];
    groups: Group[];
    selectedGroup: Group | null;
    setSelectedGroup: React.Dispatch<React.SetStateAction<Group | null>>;
    loading: boolean;
    refetch: () => Promise<void>;
}

/**
 * useHomeData
 * Hook centralisant la récupération des données de base du tableau de bord.
 */
export const useHomeData = (userId?: string) => {
    // État local pour le groupe sélectionné (pour filtrer les statistiques par classe)
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    // État pour le prénom d'affichage de l'enseignant
    const [userName, setUserName] = useState('');

    // 1. Détermination de l'utilisateur actif
    const [effectiveUser, setEffectiveUser] = useState<User | null>(null);

    useEffect(() => {
        if (userId) {
            setEffectiveUser({ id: userId } as User);
        } else {
            getCurrentUser().then(u => setEffectiveUser(u));
        }
    }, [userId]);

    const resolvedUserId = userId || effectiveUser?.id;

    // 2. Récupération de la liste des élèves (avec cache de 5 minutes)
    const {
        data: students = [],
        isLoading: loadingStudents,
        refetch: refetchStudents
    } = useQuery({
        queryKey: ['students', resolvedUserId],
        queryFn: async () => {
            if (!resolvedUserId) return [];
            const data = await studentService.getStudentsForTeacher(resolvedUserId);
            return data as unknown as Student[];
        },
        enabled: !!resolvedUserId,
        retry: 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 3. Récupération de la liste des groupes/classes
    const {
        data: groups = [],
        refetch: refetchGroups
    } = useQuery({
        queryKey: ['groups', resolvedUserId],
        queryFn: async () => {
            if (!resolvedUserId) return [];
            const data = await groupService.getGroups(resolvedUserId);
            return (data as unknown as Group[]) || [];
        },
        enabled: !!resolvedUserId,
        retry: 2,
        staleTime: 1000 * 60 * 5,
    });

    // 4. Récupération du profil utilisateur (pour le message de bienvenue)
    useEffect(() => {
        const fetchProfile = async () => {
            if (resolvedUserId && !userName) {
                const profile = await userService.getProfile(resolvedUserId);
                if (profile?.prenom) setUserName(profile.prenom);
            }
        };
        fetchProfile();
    }, [resolvedUserId, userName]);

    // État de chargement combiné
    const loading = !resolvedUserId || loadingStudents;

    // Fonction manuelle pour forcer le rafraîchissement des données
    const refetch = async () => {
        await Promise.all([refetchStudents(), refetchGroups()]);
    };

    return {
        user: effectiveUser,
        userName,
        students,
        groups,
        selectedGroup,
        setSelectedGroup,
        loading,
        refetch
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. DÉMARRAGE : Le hook s'active dès que l'enseignant arrive sur l'accueil.
 * 2. IDENTIFICATION : Il récupère l'identifiant (ID) de l'utilisateur connecté via Supabase.
 * 3. TÉLÉCHARGEMENT PARALLÈLE :
 *    - Il lance la requête pour les élèves.
 *    - Il lance la requête pour les classes.
 *    - Il lance la requête pour le prénom du profil.
 * 4. MISE EN CACHE : Les données sont stockées par 'React Query' pour 5 minutes.
 * 5. SELECTION : L'enseignant peut changer de `selectedGroup` via les composants de l'interface, ce qui mettra à jour le reste du tableau de bord.
 * 6. RETOUR : Le hook renvoie l'état complet à la page racine du Dashboard.
 */
