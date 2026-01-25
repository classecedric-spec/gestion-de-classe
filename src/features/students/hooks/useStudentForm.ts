import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '../../../lib/database';
import { studentService } from '../services/studentService';
import { levelService } from '../../levels/services/levelService';
import { classService } from '../../classes/services/classService';
import { groupService } from '../../groups/services/groupService';
import { Tables, TablesInsert } from '../../../types/supabase';

export interface StudentFormState {
    nom: string;
    prenom: string;
    date_naissance: string;
    classe_id: string;
    groupe_ids: string[];
    niveau_id: string;
    parent1_nom: string;
    parent1_prenom: string;
    parent1_email: string;
    parent2_nom: string;
    parent2_prenom: string;
    parent2_email: string;
    nom_parents: string;
    photo_base64: string;
    photo_url: string;
    sex: string;
}

export interface UseStudentFormProps {
    isEditing: boolean;
    editId: string | null;
    onSaved: (student: any) => void;
    onClose: () => void;
}

export const useStudentForm = ({ isEditing, editId, onSaved, onClose }: UseStudentFormProps) => {
    const initialStudentState: StudentFormState = {
        nom: '',
        prenom: '',
        date_naissance: '',
        classe_id: '',
        groupe_ids: [],
        niveau_id: '',
        parent1_nom: '',
        parent1_prenom: '',
        parent1_email: '',
        parent2_nom: '',
        parent2_prenom: '',
        parent2_email: '',
        nom_parents: '',
        photo_base64: '',
        photo_url: '',
        sex: ''
    };

    const [student, setStudent] = useState<StudentFormState>(initialStudentState);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('enfant');

    // Dependencies
    const [classesList, setClassesList] = useState<Tables<'Classe'>[]>([]);
    const [groupsList, setGroupsList] = useState<Tables<'Groupe'>[]>([]);
    const [niveauxList, setNiveauxList] = useState<Tables<'Niveau'>[]>([]);

    // UI Triggers for external modals
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [showAddNiveauModal, setShowAddNiveauModal] = useState(false);

    useEffect(() => {
        loadDependencies();
        if (isEditing && editId) {
            loadStudentData(editId);
        } else {
            setStudent(initialStudentState);
            setActiveTab('enfant');
        }
    }, [isEditing, editId]);

    const loadDependencies = async () => {
        try {
            const [classes, groups, niveaux] = await Promise.all([
                classService.getClasses(),
                groupService.getGroups(),
                levelService.fetchLevels()
            ]);
            setClassesList(classes);
            setGroupsList(groups);
            setNiveauxList(niveaux);
        } catch (err) {
            console.error("Error loading dependencies:", err);
        }
    };

    const loadStudentData = async (id: string) => {
        try {
            const data = await studentService.getStudent(id);
            const groupIds = await studentService.getStudentGroupIds(id);

            if (data) {
                setStudent({
                    nom: data.nom || '',
                    prenom: data.prenom || '',
                    date_naissance: data.date_naissance || '',
                    classe_id: data.classe_id || '',
                    groupe_ids: groupIds,
                    niveau_id: data.niveau_id || '',
                    parent1_nom: data.parent1_nom || '',
                    parent1_prenom: data.parent1_prenom || '',
                    parent1_email: data.parent1_email || '',
                    parent2_nom: data.parent2_nom || '',
                    parent2_prenom: data.parent2_prenom || '',
                    parent2_email: data.parent2_email || '',
                    nom_parents: data.nom_parents || '',
                    photo_base64: '', // No longer stored in DB
                    photo_url: data.photo_url || '',
                    sex: data.sex || ''
                });
            }
        } catch (err) {
            console.error("Error loading student:", err);
        }
    };

    // Handlers
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setStudent(prev => ({ ...prev, [name]: value }));
    };

    const updateField = (name: keyof StudentFormState, value: string | string[]) => {
        setStudent(prev => ({ ...prev, [name]: value }));
    };

    const handleClassChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'create_new') {
            setShowAddClassModal(true);
        } else {
            setStudent(prev => ({ ...prev, classe_id: value }));
        }
    };

    const handleNiveauChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'create_new') {
            setShowAddNiveauModal(true);
        } else {
            setStudent(prev => ({ ...prev, niveau_id: value }));
        }
    };

    const handleToggleGroup = (groupId: string) => {
        setStudent(prev => {
            const currentIds = prev.groupe_ids || [];
            if (currentIds.includes(groupId)) {
                return { ...prev, groupe_ids: currentIds.filter(id => id !== groupId) };
            } else {
                return { ...prev, groupe_ids: [...currentIds, groupId] };
            }
        });
    };

    // Callbacks for external modals
    const handleClassAdded = (newClass?: Tables<'Classe'>) => {
        if (newClass) {
            setClassesList(prev => [...prev, newClass].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
            setStudent(prev => ({ ...prev, classe_id: newClass.id }));
        }
    };

    const handleGroupAdded = (newGroup: Tables<'Groupe'>) => {
        if (newGroup) {
            setGroupsList(prev => [...prev, newGroup].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
            setStudent(prev => {
                const currentIds = prev.groupe_ids || [];
                if (currentIds.includes(newGroup.id)) return prev;
                return { ...prev, groupe_ids: [...currentIds, newGroup.id] };
            });
        }
    };

    const handleNiveauAdded = (newNiveau: Tables<'Niveau'>) => {
        if (newNiveau) {
            setNiveauxList(prev => [...prev, newNiveau].sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
            setStudent(prev => ({ ...prev, niveau_id: newNiveau.id }));
        }
    };

    const handleLevelSubmit = async (levelData: TablesInsert<'Niveau'>) => {
        try {
            const newLevel = await levelService.createLevel(levelData);
            if (newLevel) {
                // Manually trigger the "Added" callback logic since modal is pure now
                handleNiveauAdded(newLevel);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error creating level:", error);
            throw error;
        }
    };

    const submitForm = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user logged in");

            const studentData: TablesInsert<'Eleve'> = {
                nom: student.nom,
                prenom: student.prenom,
                date_naissance: student.date_naissance || null,
                classe_id: student.classe_id || null,
                niveau_id: student.niveau_id || null,
                // user_id: user.id, // REMOVED: Column does not exist
                parent1_nom: student.parent1_nom,
                parent1_prenom: student.parent1_prenom,
                parent1_email: student.parent1_email,
                parent2_nom: student.parent2_nom,
                parent2_prenom: student.parent2_prenom,
                parent2_email: student.parent2_email,
                nom_parents: student.nom_parents,
                // photo_base64 removed from here
                photo_url: student.photo_url,
                sex: student.sex,
                titulaire_id: user.id
            } as any;

            const savedId = await studentService.saveStudent(
                studentData,
                student.groupe_ids,
                user.id,
                isEditing,
                editId,
                student.photo_base64 // Pass it here
            );

            // 2. Optimistic / Fallback Retrieval
            let fullStudent: any = null;
            try {
                // Attempt to fetch real record
                fullStudent = await studentService.getStudent(savedId);
            } catch (e) {
                console.warn("Could not fetch new student immediately due to latency/error", e);
            }

            // 3. Fallback Construction (if fetch failed or returned null)
            if (!fullStudent) {
                console.warn("Using local fallback for new student");
                fullStudent = {
                    id: savedId,
                    created_at: new Date().toISOString(),
                    ...studentData,
                    // Hydrate Relations for UI display
                    Classe: classesList.find(c => c.id === studentData.classe_id) || null,
                    Niveau: niveauxList.find(n => n.id === studentData.niveau_id) || null,
                    // Add other relations if necessary (like EleveGroupe if needed for UI)
                };
            }

            onSaved(fullStudent as any);
            onClose();
            return true;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue';
            console.error("Error submitting form:", err);
            alert("Erreur: " + errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        // State
        student,
        loading,
        activeTab, setActiveTab,

        // Lists
        classesList,
        groupsList,
        niveauxList,

        // Modals Controls
        showAddClassModal, setShowAddClassModal,
        showAddGroupModal, setShowAddGroupModal,
        showAddNiveauModal, setShowAddNiveauModal,

        // Inputs Handlers
        handleInputChange,
        updateField,
        handleClassChange,
        handleNiveauChange,
        handleToggleGroup,

        // Modal Callbacks
        handleClassAdded,
        handleGroupAdded,
        handleNiveauAdded,
        handleLevelSubmit,

        // Submit
        submitForm
    };
};
