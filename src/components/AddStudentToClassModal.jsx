import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, User as UserIcon, Search, Filter, Layers, BookOpen, GraduationCap, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import clsx from 'clsx';
import Modal from './ui/Modal';
import Button from './ui/Button';

const AddStudentToClassModal = ({ showModal, handleCloseModal, classId, className, onAdded }) => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [sortBy, setSortBy] = useState('nom'); // 'nom' or 'prenom'

    // UI state
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    useEffect(() => {
        if (showModal) {
            fetchData();
            setSelectedStudentIds([]);
            setSearchQuery('');
            setSelectedClasses([]);
            setSelectedGroups([]);
        }
    }, [showModal]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch students with their class and group info
            const { data: studentsData, error: studentsError } = await supabase
                .from('Eleve')
                .select(`
                    id,
                    nom,
                    prenom,
                    classe_id,
                    Classe (nom),
                    EleveGroupe (
                        Groupe (id, nom)
                    )
                `)
                .eq('titulaire_id', user.id);

            if (studentsError) throw studentsError;

            // Fetch all classes
            const { data: classesData, error: classesError } = await supabase
                .from('Classe')
                .select('id, nom')
                .order('nom');

            if (classesError) throw classesError;

            // Fetch all groups
            const { data: groupsData, error: groupsError } = await supabase
                .from('Groupe')
                .select('id, nom')
                .order('nom');

            if (groupsError) throw groupsError;

            setStudents(studentsData || []);
            setClasses(classesData || []);
            setGroups(groupsData || []);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStudent = (id) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (filteredIds) => {
        if (selectedStudentIds.length === filteredIds.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredIds);
        }
    };

    const handleSave = async () => {
        if (selectedStudentIds.length === 0) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Update eleves with new class_id
            const { error } = await supabase
                .from('Eleve')
                .update({ classe_id: classId })
                .in('id', selectedStudentIds);

            if (error) throw error;

            onAdded();
            handleCloseModal();
        } catch (err) {
        } finally {
            setSaving(false);
        }
    };

    // Filter Logic
    const filteredStudents = students.filter(student => {
        // Exclude students already in this class
        if (student.classe_id === classId) return false;

        const matchesSearch =
            student.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.prenom.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(student.classe_id);

        const studentGroupIds = student.EleveGroupe?.map(eg => eg.Groupe.id) || [];
        const matchesGroup = selectedGroups.length === 0 || selectedGroups.some(gid => studentGroupIds.includes(gid));

        return matchesSearch && matchesClass && matchesGroup;
    }).sort((a, b) => a[sortBy].localeCompare(b[sortBy]));

    if (!showModal) return null;

    return (
        <Modal
            isOpen={showModal}
            onClose={handleCloseModal}
            title={`Ajouter à la classe : ${className}`}
            noPadding={true}
            className="max-w-2xl max-h-[85vh] h-[85vh]" // Fixed height for full experience
            footer={
                <>
                    <Button onClick={handleCloseModal} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSave}
                        loading={saving}
                        className="flex-1"
                        icon={Plus}
                        disabled={selectedStudentIds.length === 0}
                    >
                        Ajouter ({selectedStudentIds.length})
                    </Button>
                </>
            }
        >
            {/* Search & Filters - Sticky Header */}
            <div className="sticky top-0 z-20 bg-surface border-b border-border/10 p-4 space-y-3 shadow-md">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-input border border-border/10 rounded-xl pl-10 pr-4 py-2 text-text-main focus:outline-none focus:border-primary placeholder-grey-medium"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                            "px-3 py-2 rounded-xl border flex items-center gap-2 transition-colors",
                            showFilters
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-input border-border/10 text-grey-light hover:text-text-main"
                        )}
                    >
                        <Filter size={18} />
                        <span className="hidden sm:inline">Filtres</span>
                        {(selectedClasses.length > 0 || selectedGroups.length > 0) && (
                            <span className="bg-primary text-text-dark text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {selectedClasses.length + selectedGroups.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleSelectAll(filteredStudents.map(s => s.id))}
                        className="px-3 py-2 rounded-xl border border-border/10 bg-input text-grey-light hover:text-text-main hover:bg-input/80 transition-colors text-sm font-medium"
                    >
                        <Check size={18} className="sm:hidden" />
                        <span className="hidden sm:inline">Tout sélect.</span>
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="pt-2 animate-in slide-in-from-top-2 space-y-4 border-t border-border/5 mt-2">
                        {/* Class Filter */}
                        <div>
                            <p className="text-xs font-bold text-grey-medium uppercase mb-2 flex items-center gap-1">
                                <GraduationCap size={12} /> Classe actuelle
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {classes.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => setSelectedClasses(prev =>
                                            prev.includes(cls.id) ? prev.filter(id => id !== cls.id) : [...prev, cls.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedClasses.includes(cls.id)
                                                ? "bg-primary/20 border-primary text-primary"
                                                : "bg-input border-transparent text-grey-medium hover:border-border/10"
                                        )}
                                    >
                                        {cls.nom}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Group Filter */}
                        <div>
                            <p className="text-xs font-bold text-grey-medium uppercase mb-2 flex items-center gap-1">
                                <Layers size={12} /> Groupe
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {groups.length === 0 && <span className="text-xs text-grey-medium italic">Aucun groupe disponible</span>}
                                {groups.map(grp => (
                                    <button
                                        key={grp.id}
                                        onClick={() => setSelectedGroups(prev =>
                                            prev.includes(grp.id) ? prev.filter(id => id !== grp.id) : [...prev, grp.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedGroups.includes(grp.id)
                                                ? "bg-secondary/20 border-secondary text-secondary"
                                                : "bg-input border-transparent text-grey-medium hover:border-border/10"
                                        )}
                                    >
                                        {grp.nom}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Students List */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Chargement des élèves...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-xl bg-input border border-dashed border-border/10 mx-auto max-w-sm">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                        <h3 className="text-lg font-medium text-text-main">Aucun élève trouvé</h3>
                        <p className="text-grey-medium text-sm mt-1">Essaie de modifier tes filtres ou ta recherche.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredStudents.map(student => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            return (
                                <div
                                    key={student.id}
                                    onClick={() => handleToggleStudent(student.id)}
                                    className={clsx(
                                        "relative group p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                                        isSelected
                                            ? "bg-primary/10 border-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]"
                                            : "bg-background border-border/5 hover:border-border/10 hover:bg-input"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                                            isSelected ? "bg-primary text-text-dark" : "bg-input text-grey-medium group-hover:bg-input/80"
                                        )}>
                                            {student.prenom[0]}{student.nom[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={clsx("font-bold truncate", isSelected ? "text-primary" : "text-text-main")}>
                                                {student.prenom} {student.nom}
                                            </h4>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {student.Classe && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-input text-grey-medium border border-border/5 flex items-center gap-1">
                                                        <GraduationCap size={10} />
                                                        {student.Classe.nom}
                                                    </span>
                                                )}
                                                {student.EleveGroupe && student.EleveGroupe.length > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-input text-grey-medium border border-border/5 flex items-center gap-1">
                                                        <Layers size={10} />
                                                        {student.EleveGroupe.length} grp
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                                            isSelected
                                                ? "bg-primary border-primary text-text-dark"
                                                : "border-border/20 bg-transparent text-transparent group-hover:border-border/40"
                                        )}>
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AddStudentToClassModal;
