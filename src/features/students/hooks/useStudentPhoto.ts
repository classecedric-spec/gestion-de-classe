import { useState, useCallback } from 'react';
import { studentService } from '../services/studentService';
// @ts-ignore
import { resizeAndConvertToBase64 } from '../../../lib/storage';

/**
 * useStudentPhoto
 * 
 * Hook pour la gestion des photos des élèves :
 * - Drag & drop
 * - Upload via studentService (Storage)
 * - États de chargement
 */
export const useStudentPhoto = (setSelectedStudent: any, setStudents: any) => {
    const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
    const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
    const [updatingPhotoId, setUpdatingPhotoId] = useState<string | null>(null);

    // Process and save photo
    const processAndSavePhoto = useCallback(async (file: File, student: any) => {
        if (!student) return;
        if (!file.type.match('image.*')) {
            alert("Veuillez déposer une image (JPG ou PNG).");
            return;
        }

        setUpdatingPhotoId(student.id);
        try {
            const base64 = await resizeAndConvertToBase64(file, 200, 200);

            // Use service to upload
            const publicUrl = await studentService.uploadStudentPhoto(student.id, base64);

            if (publicUrl) {
                await studentService.updateStudent(student.id, { photo_url: publicUrl });

                // Update local state
                const updated = { ...student, photo_url: publicUrl };
                if (setSelectedStudent) {
                    setSelectedStudent((prev: any) => prev?.id === student.id ? updated : prev);
                }
                if (setStudents) {
                    setStudents((prev: any[]) => prev.map(s => s.id === updated.id ? updated : s));
                }
            }
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'enregistrement de la photo.");
        } finally {
            setUpdatingPhotoId(null);
        }
    }, [setSelectedStudent, setStudents]);

    // Drag handlers for detail view
    const handlePhotoDrop = useCallback(async (e: React.DragEvent, student: any) => {
        e.preventDefault();
        setIsDraggingPhoto(false);
        setDraggingPhotoId(null);
        const file = e.dataTransfer.files[0];
        if (file) await processAndSavePhoto(file, student);
    }, [processAndSavePhoto]);

    const handlePhotoDragOver = useCallback((e: React.DragEvent, studentId: string | null = null) => {
        e.preventDefault();
        if (studentId) {
            setDraggingPhotoId(studentId);
        } else {
            setIsDraggingPhoto(true);
        }
    }, []);

    const handlePhotoDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingPhoto(false);
        setDraggingPhotoId(null);
    }, []);

    // File input handler
    const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, student: any) => {
        const file = e.target.files?.[0];
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
