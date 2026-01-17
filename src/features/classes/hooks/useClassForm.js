import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export const useClassForm = ({ isEditing, classToEdit, onSaved, onClose }) => {
    const initialClassState = {
        nom: '',
        acronyme: '',
        photo_base64: '',
        logo_url: '',
        principaux: [], // IDs of principal adults
        complementaires: [] // IDs of complementary adults
    };

    const [classData, setClassData] = useState(initialClassState);
    const [loading, setLoading] = useState(false);
    const [adultsList, setAdultsList] = useState([]);

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
                .map(ca => ca.Adulte.id) || [];

            const complementaires = classToEdit.ClasseAdulte
                ?.filter(ca => ca.role === 'complementaire')
                .map(ca => ca.Adulte.id) || [];

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setClassData(prev => ({ ...prev, [name]: value }));
    };

    const updateField = (field, value) => {
        setClassData(prev => ({ ...prev, [field]: value }));
    };

    const toggleAdult = (adultId, type) => {
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
            const payload = {
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

            // 2. Manage Links (Delete all and recreate is simpler/safer here or sync)
            // For simplicity in this refactor, we delete all for this class and re-insert
            // Optimization: could compare diffs, but volume is low.

            // Delete existing links
            await supabase.from('ClasseAdulte').delete().eq('classe_id', savedClassId);

            // Insert new links
            const linksToInsert = [];
            classData.principaux.forEach(adultId => {
                linksToInsert.push({ classe_id: savedClassId, adulte_id: adultId, role: 'principal' });
            });
            classData.complementaires.forEach(adultId => {
                linksToInsert.push({ classe_id: savedClassId, adulte_id: adultId, role: 'complementaire' });
            });

            if (linksToInsert.length > 0) {
                const { error: linkError } = await supabase.from('ClasseAdulte').insert(linksToInsert);
                if (linkError) throw linkError;
            }

            onSaved();
            onClose();

        } catch (error) {
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
