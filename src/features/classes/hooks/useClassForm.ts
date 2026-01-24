import { useState, useEffect, ChangeEvent } from 'react';
import { Tables } from '../../../types/supabase';
import { ClassWithAdults, classService } from '../services/classService';
import { adultService } from '../../adults/services/adultService';

export interface ClassFormData {
    nom: string;
    acronyme: string;
    logo_url: string;
    photo_base64?: string; // For temporary storage of newly uploaded image
    principaux: string[]; // IDs of principal adults
    complementaires: string[]; // IDs of complementary adults
}

export interface UseClassFormProps {
    isEditing: boolean;
    classToEdit: ClassWithAdults | null;
    onSaved: (classData?: ClassWithAdults) => void;
    onClose: () => void;
}

export const useClassForm = ({ isEditing, classToEdit, onSaved, onClose }: UseClassFormProps) => {
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
            let finalLogoUrl = classData.logo_url;

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

            // Image Upload Logic after getting/having savedClassId
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

            // 4. Fetch the full class with relations to enable optimistic UI update
            let updatedClass = await classService.getClassById(savedClassId);

            // Fallback: If fetch fails (latency/consistency), construct object manually for optimistic UI
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

            onSaved(updatedClass || undefined);
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
