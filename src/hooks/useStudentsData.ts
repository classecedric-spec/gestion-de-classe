import { useState, useEffect } from 'react';
import { studentService } from '../features/students/services/studentService';

/**
 * Hook for fetching students data for a specific group
 */
export const useStudentsData = (groupId: string | null) => {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (groupId) {
            fetchStudents(groupId);
        }
    }, [groupId]);

    const fetchStudents = async (gId: string) => {
        setLoading(true);
        try {
            const data = await studentService.getStudentsByGroup(gId);
            setStudents(data || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    return { students, loading };
};
