import { useState, useEffect, useMemo } from 'react';
import { studentService } from '../../../features/students/services/studentService';
import { groupService } from '../../../features/groups/services/groupService';
import { classService } from '../../../features/classes/services/classService';
import { supabase } from '../../../lib/database';
import { ModuleWithRelations } from '../utils/moduleHelpers';

/**
 * useLinkedGroups
 * 
 * Automatically identifies student groups and classes where ALL members 
 * are linked to the selected module's progressions.
 */
export function useLinkedGroups(selectedModule: ModuleWithRelations | null) {
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [allGroups, setAllGroups] = useState<any[]>([]);
    const [allClasses, setAllClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch all data needed for calculations
                const [students, groups, classes] = await Promise.all([
                    studentService.getStudentsForTeacher(user.id),
                    groupService.getGroups(),
                    classService.getClasses()
                ]);

                setAllStudents(students || []);
                setAllGroups(groups || []);
                setAllClasses(classes || []);
            } catch (err) {
                console.error('Error fetching data for linked groups:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const result = useMemo(() => {
        if (!selectedModule || !selectedModule.studentIds || selectedModule.studentIds.length === 0 || allStudents.length === 0) {
            return { linkedGroups: [], linkedClasses: [] };
        }

        const moduleStudentIds = new Set(selectedModule.studentIds);

        // Identification des classes liées (tous les élèves de la classe ont une progression)
        const linkedClasses = allClasses.filter(classe => {
            const classStudents = allStudents.filter(s => s.classe_id === classe.id);
            if (classStudents.length === 0) return false;
            return classStudents.every(s => moduleStudentIds.has(s.id));
        });

        // Identification des groupes liés (tous les élèves du groupe ont une progression)
        const linkedGroups = allGroups.filter(group => {
            const groupStudents = allStudents.filter(s => 
                s.EleveGroupe && s.EleveGroupe.some((eg: any) => eg.Groupe && eg.Groupe.id === group.id)
            );
            if (groupStudents.length === 0) return false;
            return groupStudents.every(s => moduleStudentIds.has(s.id));
        });

        return { linkedGroups, linkedClasses };
    }, [selectedModule?.id, selectedModule?.studentIds, allStudents, allGroups, allClasses]);

    return {
        ...result,
        loading
    };
}
