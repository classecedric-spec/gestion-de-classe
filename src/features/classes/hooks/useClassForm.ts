/**
 * Nom du module/fichier : useClassForm.ts
 * 
 * Données en entrée : 
 *   - isEditing : Indique si on est en train de modifier une classe déjà existante.
 *   - classToEdit : Les données actuelles de la classe à modifier (si applicable).
 *   - onSaved : Action à effectuer après le succès de l'enregistrement.
 *   - onClose : Action à effectuer si l'utilisateur annule la saisie.
 * 
 * Données en sortie : 
 *   - État actuel du formulaire (nom, acronyme, logo).
 *   - Liste des adultes disponibles dans l'école pour l'affectation.
 *   - Fonctions de contrôle (saisie de texte, sélection d'adultes, validation du formulaire).
 * 
 * Objectif principal : Gérer toute la logique de saisie pour créer ou mettre à jour une classe d'école. Ce Hook s'occupe de préparer les données propres, de gérer la prévisualisation et l'envoi du logo, et surtout de gérer les relations complexes (les liens) entre une classe et ses différents intervenants (professeurs principaux et complémentaires).
 * 
 * Ce que ça affiche : Rien directement. Il fournit la logique au composant visuel `AddClassModal`.
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { Tables } from '../../../types/supabase';
import { ClassWithAdults, classService } from '../services/classService';
import { adultService } from '../../adults/services/adultService';

/**
 * Structure de données simplifiée pour la manipulation dans le formulaire.
 */
export interface ClassFormData {
    nom: string;
    acronyme: string;
    logo_url: string;
    photo_base64?: string; // Stockage temporaire de l'image sélectionnée avant l'envoi
    principaux: string[]; // Liste des IDs des enseignants titulaires
    complementaires: string[]; // Liste des IDs des intervenants ou remplaçants
}

export interface UseClassFormProps {
    isEditing: boolean;
    classToEdit: ClassWithAdults | null;
    onSaved: (classData?: ClassWithAdults) => void;
    onClose: () => void;
}

/**
 * Ce Hook centralise la 'matière grise' du formulaire de classe.
 */
export const useClassForm = ({ isEditing, classToEdit }: UseClassFormProps) => {
    // État initial vide
    const initialClassState: ClassFormData = {
        nom: '',
        acronyme: '',
        logo_url: '',
        photo_base64: '',
        principaux: [],
        complementaires: []
    };

    const [classData, setClassData] = useState<ClassFormData>(initialClassState);
    const [loading, setLoading] = useState(false);
    const [adultsList, setAdultsList] = useState<Tables<'Adulte'>[]>([]);

    /**
     * Chargement initial : on va chercher la liste de tous les adultes 
     * enregistrés dans l'école pour pouvoir les proposer dans le formulaire.
     */
    useEffect(() => {
        const fetchAdults = async () => {
            const data = await adultService.fetchAdults();
            if (data) setAdultsList(data);
        };
        fetchAdults();
    }, []);

    /**
     * Mode Édition : si on modifie une classe existante, on pré-remplit 
     * le formulaire avec ses informations actuelles et son équipe pédagogique.
     */
    useEffect(() => {
        if (isEditing && classToEdit) {
            // Extraction des adultes déjà liés selon leur rôle
            const principaux = classToEdit.ClasseAdulte
                ?.filter(ca => ca.role === 'principal')
                .map(ca => ca.Adulte?.id)
                .filter(id => !!id) as string[] || [];

            const complementaires = classToEdit.ClasseAdulte
                ?.filter(ca => ca.role === 'complementaire')
                .map(ca => ca.Adulte?.id)
                .filter(id => !!id) as string[] || [];

            setClassData({
                nom: classToEdit.nom || '',
                acronyme: classToEdit.acronyme || '',
                logo_url: classToEdit.logo_url || '',
                principaux,
                complementaires
            });
        } else {
            // Sinon on repart d'un formulaire vierge
            setClassData(initialClassState);
        }
    }, [isEditing, classToEdit]);

    /**
     * Gestion de la saisie au clavier pour les champs de texte simples.
     */
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setClassData(prev => ({ ...prev, [name]: value }));
    };

    /**
     * Mise à jour manuelle d'un champ (utile pour les fichiers ou les sélections spéciales).
     */
    const updateField = (field: keyof ClassFormData, value: any) => {
        setClassData(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Affectation dynamique : permet d'ajouter ou de retirer un enseignant 
     * à la classe d'un simple clic.
     */
    const toggleAdult = (adultId: string, type: 'principaux' | 'complementaires') => {
        setClassData(prev => {
            const current = prev[type];
            if (current.includes(adultId)) {
                return { ...prev, [type]: current.filter(id => id !== adultId) };
            } else {
                return { ...prev, [type]: [...current, adultId] };
            }
        });
    };

    /**
     * Procédure d'enregistrement finale : coordonne la création en base, 
     * l'upload de l'image si besoin, et la mise à jour des liens avec les professeurs.
     */
    const submitForm = async () => {
        if (!classData.nom) return;
        setLoading(true);

        try {
            let savedClassId = classToEdit?.id;
            let finalLogoUrl = classData.logo_url;

            const payload: any = {
                nom: classData.nom,
                acronyme: classData.acronyme,
                logo_url: classData.logo_url
            };

            // ÉTAPE 1 : Création ou Mise à jour de la fiche 'Classe'
            if (isEditing && savedClassId) {
                await classService.updateClass(savedClassId, payload);
            } else {
                const { id } = await classService.createClass(payload);
                savedClassId = id;
            }

            // ÉTAPE 2 : Gestion de l'image du logo (si une nouvelle image a été choisie)
            if (savedClassId && classData.photo_base64 && classData.photo_base64.startsWith('data:image')) {
                try {
                    const response = await fetch(classData.photo_base64);
                    const blob = await response.blob();
                    const logoUrl = await classService.uploadLogo(savedClassId, blob);
                    if (logoUrl) {
                        await classService.updateClass(savedClassId, { logo_url: logoUrl });
                        finalLogoUrl = logoUrl;
                    }
                } catch (imgErr) {
                    console.error("Error uploading class logo:", imgErr);
                }
            }

            if (!savedClassId) throw new Error("Could not determine Class ID");

            // ÉTAPE 3 : Synchronisation des intervenants (Équipe pédagogique)
            // On commence par effacer les anciens liens pour repartir sur une base propre
            await classService.unlinkAllAdults(savedClassId);

            // On enregistre les nouveaux rôles (Principaux)
            for (const adultId of classData.principaux) {
                await classService.linkAdult(savedClassId, adultId, 'principal');
            }
            // On enregistre les nouveaux rôles (Complémentaires)
            for (const adultId of classData.complementaires) {
                await classService.linkAdult(savedClassId, adultId, 'complementaire');
            }

            // ÉTAPE 4 : Récupération de la fiche complète pour mettre à jour l'interface sans recharger la page
            let updatedClass = await classService.getClassById(savedClassId);

            // En cas de latence serveur, on construit un objet temporaire pour que l'enseignant voit ses changements de suite
            if (!updatedClass) {
                console.warn("Could not fetch new class immediately. Using local data fallback.");
                const constructedAdults = [
                    ...classData.principaux.map(id => ({
                        role: 'principal',
                        Adulte: adultsList.find(a => a.id === id) || { id, nom: '?', prenom: '?' }
                    })),
                    ...classData.complementaires.map(id => ({
                        role: 'complementaire',
                        Adulte: adultsList.find(a => a.id === id) || { id, nom: '?', prenom: '?' }
                    }))
                ];

                updatedClass = {
                    id: savedClassId,
                    created_at: new Date().toISOString(),
                    nom: classData.nom,
                    acronyme: classData.acronyme,
                    logo_url: finalLogoUrl || classData.logo_url,
                    titulaire_id: null,
                    ClasseAdulte: constructedAdults
                } as any;
            }

            return updatedClass || null;
        } catch (error: any) {
            console.error("Error saving class:", error);
            alert("Erreur: " + error.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        classData,
        loading,
        adultsList,
        handleChange,
        updateField,
        toggleAdult,
        submitForm
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre le formulaire (ex: Créer une classe 'Petite Section').
 * 2. Le Hook initialise les champs et récupère la liste des professeurs de l'école.
 * 3. L'enseignant :
 *    - Saisit le nom de la classe.
 *    - Sélectionne un logo.
 *    - Coche les enseignants qui travaillent dans cette classe.
 * 4. Lors du clic sur "Enregistrer" :
 *    a. Le Hook télécharge l'image vers le serveur sécurisé.
 *    b. Il enregistre la fiche de la classe.
 *    c. Il nettoie et ré-enregistre les intervenants actifs.
 * 5. Une fois terminé, le Hook renvoie la classe complète pour rafraîchir l'écran instantanément.
 */
