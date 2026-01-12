import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Check, User as UserIcon, Search, Filter, Layers, GraduationCap, ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import Modal from './ui/Modal';
import Button from './ui/Button';

const AddStudentToGroupModal = ({ showModal, handleCloseModal, groupId, groupName, onAdded }) => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [groups, setGroups] = useState([]);
    const [niveaux, setNiveaux] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [selectedNiveaux, setSelectedNiveaux] = useState([]);
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
            setSelectedNiveaux([]);
        }
    }, [showModal]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch students with their class info
            const { data: studentsData, error: studentsError } = await supabase
                .from('Eleve')
                .select(`
                    id,
                    nom,
                    prenom,
                    classe_id,
                    niveau_id,
                    Classe (nom),
                    EleveGroupe (
                        groupe_id,
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

            // Fetch all groups (for selection UI)
            const { data: groupsData, error: groupsError } = await supabase
                .from('Groupe')
                .select('id, nom')
                .order('nom');

            if (groupsError) throw groupsError;

            // Fetch all levels
            const { data: niveauxData, error: niveauxError } = await supabase
                .from('Niveau')
                .select('id, nom')
                .order('ordre', { ascending: true });

            if (niveauxError) throw niveauxError;

            setStudents(studentsData || []);
            setClasses(classesData || []);
            setGroups(groupsData || []);
            setNiveaux(niveauxData || []);
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

            // Filter out students already in the group to avoid duplicates
            const { data: existingRelations } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            const existingIds = existingRelations?.map(r => r.eleve_id) || [];
            const newIds = selectedStudentIds.filter(id => !existingIds.includes(id));

            if (newIds.length > 0) {
                const insertRows = newIds.map(eleveId => ({
                    eleve_id: eleveId,
                    groupe_id: groupId,
                    user_id: user.id
                }));

                const { error } = await supabase
                    .from('EleveGroupe')
                    .insert(insertRows);

                if (error) throw error;
            }

            onAdded && onAdded();
            handleCloseModal();
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.prenom.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass = selectedClasses.length === 0 || selectedClasses.includes(student.classe_id);

        const matchesNiveau = selectedNiveaux.length === 0 || selectedNiveaux.includes(student.niveau_id);

        const studentGroupIds = student.EleveGroupe?.map(eg => eg.groupe_id) || [];
        const matchesGroup = selectedGroups.length === 0 || selectedGroups.some(gId => studentGroupIds.includes(gId));

        // Don't show students already in THIS group
        // Note: The original code logic checked if the student is ALREADY in the group and excluded them.
        // We replicate this:
        // Don't show students already in THIS group
        const inCurrentGroup = studentGroupIds.includes(groupId);
        return matchesSearch && matchesClass && matchesNiveau && matchesGroup && !inCurrentGroup;
    }).sort((a, b) => {
        if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
        return a.prenom.localeCompare(b.prenom);
    });

    if (!showModal) return null;

    return (
        <Modal
            isOpen={showModal}
            onClose={handleCloseModal}
            title={`Ajouter au groupe : ${groupName}`}
            noPadding={true}
            className="max-w-2xl max-h-[85vh] h-[85vh]"
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
            <div className="sticky top-0 z-20 bg-surface border-b border-white/10 p-4 space-y-3 shadow-md">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un enfant..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary placeholder-gray-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                            "px-3 py-2 rounded-xl border flex items-center gap-2 transition-colors",
                            showFilters
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-black/20 border-white/10 text-gray-400 hover:text-white"
                        )}
                    >
                        <Filter size={18} />
                        <span className="hidden sm:inline">Filtres</span>
                        {(selectedClasses.length > 0 || selectedGroups.length > 0 || selectedNiveaux.length > 0) && (
                            <span className="bg-primary text-text-dark text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {selectedClasses.length + selectedGroups.length + selectedNiveaux.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleSelectAll(filteredStudents.map(s => s.id))}
                        className="px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        <Check size={18} className="sm:hidden" />
                        <span className="hidden sm:inline">Tout sélect.</span>
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="pt-2 animate-in slide-in-from-top-2 space-y-4 border-t border-white/5 mt-2 overflow-y-auto max-h-[40vh]">
                        {/* Levels Filter */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <Layers size={12} /> Niveaux
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {niveaux.map(niv => (
                                    <button
                                        key={niv.id}
                                        onClick={() => setSelectedNiveaux(prev =>
                                            prev.includes(niv.id) ? prev.filter(id => id !== niv.id) : [...prev, niv.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedNiveaux.includes(niv.id)
                                                ? "bg-primary/20 border-primary text-primary"
                                                : "bg-white/5 border-transparent text-gray-400 hover:border-white/10"
                                        )}
                                    >
                                        {niv.nom}
                                    </button>
                                ))}
                                {niveaux.length === 0 && <span className="text-xs text-gray-600 italic">Aucun niveau</span>}
                            </div>
                        </div>

                        {/* Classes Filter */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <GraduationCap size={12} /> Classes
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
                                                : "bg-white/5 border-transparent text-gray-400 hover:border-white/10"
                                        )}
                                    >
                                        {cls.nom}
                                    </button>
                                ))}
                                {classes.length === 0 && <span className="text-xs text-gray-600 italic">Aucune classe</span>}
                            </div>
                        </div>

                        {/* Groups Filter (Others) */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <Layers size={12} /> Autres Groupes
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {groups.filter(g => g.id !== groupId).map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setSelectedGroups(prev =>
                                            prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedGroups.includes(g.id)
                                                ? "bg-secondary/20 border-secondary text-secondary"
                                                : "bg-white/5 border-transparent text-gray-400 hover:border-white/10"
                                        )}
                                    >
                                        {g.nom}
                                    </button>
                                ))}
                                {groups.length <= 1 && <span className="text-xs text-gray-600 italic">Aucun autre groupe</span>}
                            </div>
                        </div>

                        {/* Sorting Options */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            <span className="text-xs text-gray-400">Trier par :</span>
                            <div className="flex bg-black/20 rounded-lg p-0.5">
                                {['nom', 'prenom'].map(sort => (
                                    <button
                                        key={sort}
                                        onClick={() => setSortBy(sort)}
                                        className={clsx(
                                            "px-3 py-1 text-xs rounded-md capitalize transition-colors",
                                            sortBy === sort ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        {sort}
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
                    <div className="text-center py-12 px-4 rounded-xl bg-white/5 border border-dashed border-white/10 mx-auto max-w-sm">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                        <h3 className="text-lg font-medium text-white">Aucun élève trouvé</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {searchQuery || selectedClasses.length > 0 || selectedGroups.length > 0
                                ? "Essaie de modifier tes filtres."
                                : "Tous les élèves sont déjà dans ce groupe !"}
                        </p>
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
                                            : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                                            isSelected ? "bg-primary text-text-dark" : "bg-white/10 text-gray-400 group-hover:bg-white/15"
                                        )}>
                                            {student.prenom[0]}{student.nom[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={clsx("font-bold truncate", isSelected ? "text-primary" : "text-white")}>
                                                {student.prenom} {student.nom}
                                            </h4>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {student.Classe && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5 flex items-center gap-1">
                                                        <GraduationCap size={10} />
                                                        {student.Classe.nom}
                                                    </span>
                                                )}
                                                {student.EleveGroupe && student.EleveGroupe.length > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5 flex items-center gap-1">
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
                                                : "border-white/20 bg-transparent text-transparent group-hover:border-white/40"
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

export default AddStudentToGroupModal;
