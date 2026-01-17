import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { resizeAndConvertToBase64 } from '../../../lib/imageUtils';

/**
 * useStudentPhoto
 * 
 * Hook pour la gestion des photos des élèves :
 * - Drag & drop
 * - Upload et redimensionnement
 * - États de chargement
 */
export const useStudentPhoto = (setSelectedStudent, setStudents) => {
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
    const [draggingPhotoId, setDraggingPhotoId] = useState(null);
    const [updatingPhotoId, setUpdatingPhotoId] = useState(null);

    // Process and save photo
    const processAndSavePhoto = useCallback(async (file, student) => {
        if (!student) return;
        if (!file.type.match('image.*')) {
            alert("Veuillez déposer une image (JPG ou PNG).");
            return;
        }

        setUpdatingPhotoId(student.id);
        try {
            const base64 = await resizeAndConvertToBase64(file, 200, 200);

            const { error } = await supabase
                .from('Eleve')
                .update({ photo_base64: base64 })
                .eq('id', student.id);

            if (error) throw error;

            // Update local state
            const updated = { ...student, photo_base64: base64 };
            if (setSelectedStudent) {
                setSelectedStudent(prev => prev?.id === student.id ? updated : prev);
            }
            if (setStudents) {
                setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
            }
        } catch (err) {
            alert("Erreur lors de l'enregistrement de la photo.");
        } finally {
            setUpdatingPhotoId(null);
        }
    }, [setSelectedStudent, setStudents]);

    // Drag handlers for detail view
    const handlePhotoDrop = useCallback(async (e, student) => {
        e.preventDefault();
        setIsDraggingPhoto(false);
        setDraggingPhotoId(null);
        const file = e.dataTransfer.files[0];
        if (file) await processAndSavePhoto(file, student);
    }, [processAndSavePhoto]);

    const handlePhotoDragOver = useCallback((e, studentId = null) => {
        e.preventDefault();
        if (studentId) {
            setDraggingPhotoId(studentId);
        } else {
            setIsDraggingPhoto(true);
        }
    }, []);

    const handlePhotoDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDraggingPhoto(false);
        setDraggingPhotoId(null);
    }, []);

    // File input handler
    const handlePhotoChange = useCallback(async (e, student) => {
        const file = e.target.files[0];
        if (file) await processAndSavePhoto(file, student);
    }, [processAndSavePhoto]);

    return {
        isDraggingPhoto,
        draggingPhotoId,
        updatingPhotoId,
        setDraggingPhotoId,
        processAndSavePhoto,
        handlePhotoDrop,
        handlePhotoDragOver,
        handlePhotoDragLeave,
        handlePhotoChange
    };
};
