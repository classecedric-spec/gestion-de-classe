import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Tables, TablesInsert } from '../../../types/supabase';
import { ClassWithAdults } from '../services/classService';

export interface ClassFormData {
    nom: string;
    acronyme: string;
    photo_base64: string;
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
        photo_base64: '',
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
            const { data } = await supabase.from('Adulte').select('*').order('nom');
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
                photo_base64: classToEdit.photo_base64 || '',
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
            // 1. Save Class
            const payload: TablesInsert<'Classe'> = {
                nom: classData.nom,
                acronyme: classData.acronyme,
                photo_base64: classData.photo_base64,
                logo_url: classData.logo_url
            };

            let savedClassId = classToEdit?.id;

            if (isEditing && savedClassId) {
                const { error } = await supabase
                    .from('Classe')
                    .update(payload)
                    .eq('id', savedClassId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('Classe')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                savedClassId = data.id;
            }

            if (!savedClassId) throw new Error("Could not determine Class ID");

            // 2. Manage Links
            // Delete existing links
            await supabase.from('ClasseAdulte').delete().eq('classe_id', savedClassId);

            // Insert new links
            const linksToInsert: TablesInsert<'ClasseAdulte'>[] = [];
            classData.principaux.forEach(adultId => {
                linksToInsert.push({ classe_id: savedClassId as string, adulte_id: adultId, role: 'principal' });
            });
            classData.complementaires.forEach(adultId => {
                linksToInsert.push({ classe_id: savedClassId as string, adulte_id: adultId, role: 'complementaire' });
            });

            if (linksToInsert.length > 0) {
                const { error: linkError } = await supabase.from('ClasseAdulte').insert(linksToInsert);
                if (linkError) throw linkError;
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
