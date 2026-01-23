import { useState, useEffect, ChangeEvent } from 'react';
import { Tables } from '../../../types/supabase';
import { ClassWithAdults, classService } from '../services/classService';
import { adultService } from '../../adults/services/adultService';

export interface ClassFormData {
    nom: string;
    acronyme: string;
    logo_url: string;
    principaux: string[]; // IDs of principal adults
    complementaires: string[]; // IDs of complementary adults
}

export interface UseClassFormProps {
    isEditing: boolean;
    classToEdit: ClassWithAdults | null;
    onSaved: () => void;
    onClose: () => void;
}

export const useClassForm = ({ isEditing, classToEdit, onSaved, onClose }: UseClassFormProps) => {
    const initialClassState: ClassFormData = {
        nom: '',
        acronyme: '',
        logo_url: '',
        principaux: [],
        complementaires: []
    };

    const [classData, setClassData] = useState<ClassFormData>(initialClassState);
    const [loading, setLoading] = useState(false);
    const [adultsList, setAdultsList] = useState<Tables<'Adulte'>[]>([]);

    // Load Adults for selection
    useEffect(() => {
        const fetchAdults = async () => {
            const data = await adultService.fetchAdults();
            if (data) setAdultsList(data);
        };
        fetchAdults();
    }, []);

    // Load data if editing
    useEffect(() => {
        if (isEditing && classToEdit) {
            // Extract linked adults
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
            setClassData(initialClassState);
        }
    }, [isEditing, classToEdit]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setClassData(prev => ({ ...prev, [name]: value }));
    };

    const updateField = (field: keyof ClassFormData, value: any) => {
        setClassData(prev => ({ ...prev, [field]: value }));
    };

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

    const submitForm = async () => {
        if (!classData.nom) return;
        setLoading(true);

        try {
            let savedClassId = classToEdit?.id;

            const payload: any = {
                nom: classData.nom,
                acronyme: classData.acronyme,
                logo_url: classData.logo_url
            };

            // 1. Create/Update Record
            if (isEditing && savedClassId) {
                await classService.updateClass(savedClassId, payload);
            } else {
                // Insert
                const { id } = await classService.createClass(payload);
                savedClassId = id;
            }

            if (!savedClassId) throw new Error("Could not determine Class ID");

            // 3. Manage Links
            // Delete existing links
            await classService.unlinkAllAdults(savedClassId);

            // Insert new links
            for (const adultId of classData.principaux) {
                await classService.linkAdult(savedClassId, adultId, 'principal');
            }
            for (const adultId of classData.complementaires) {
                await classService.linkAdult(savedClassId, adultId, 'complementaire');
            }

            onSaved();
            onClose();

        } catch (error: any) {
            console.error("Error saving class:", error);
            alert("Erreur: " + error.message);
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
