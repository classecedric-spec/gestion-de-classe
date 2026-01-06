import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Loader2, User as UserIcon, Check, Users } from 'lucide-react';
import clsx from 'clsx';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ui/ImageUpload';
import AddClassModal from './AddClassModal';
import AddGroupModal from './AddGroupModal';
import AddNiveauModal from './AddNiveauModal';

const StudentModal = ({ showModal, onClose, onSaved, isEditing = false, editId = null }) => {
    const initialStudentState = {
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
        photo_base64: ''
    };

    const [newStudent, setNewStudent] = useState(initialStudentState);
    const [loadingCreate, setLoadingCreate] = useState(false);
    const [activeTab, setActiveTab] = useState('enfant'); // enfant, parent1, parent2

    // Dependencies
    const [classesList, setClassesList] = useState([]);
    const [groupsList, setGroupsList] = useState([]);
    const [niveauxList, setNiveauxList] = useState([]);

    // Modals
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [showAddNiveauModal, setShowAddNiveauModal] = useState(false);

    useEffect(() => {
        if (showModal) {
            fetchDependencies();
            if (isEditing && editId) {
                fetchStudentData(editId);
            } else {
                setNewStudent(initialStudentState);
                setActiveTab('enfant');
            }
        }
    }, [showModal, isEditing, editId]);

    const fetchDependencies = async () => {
        try {
            const { data: classes } = await supabase.from('Classe').select('*');
            if (classes) setClassesList(classes.sort((a, b) => a.nom.localeCompare(b.nom)));

            const { data: groups } = await supabase.from('Groupe').select('*');
            if (groups) setGroupsList(groups.sort((a, b) => a.nom.localeCompare(b.nom)));

            const { data: niveaux } = await supabase.from('Niveau').select('*');
            if (niveaux) setNiveauxList(niveaux.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
        } catch (error) {
        }
    };

    const fetchStudentData = async (id) => {
        try {
            const { data, error } = await supabase
                .from('Eleve')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Fetch groups for this student (N:N)
            const { data: groupData } = await supabase
                .from('EleveGroupe')
                .select('groupe_id')
                .eq('eleve_id', id);

            const currentGroupIds = groupData?.map(g => g.groupe_id) || [];

            if (data) {
                setNewStudent({
                    nom: data.nom,
                    prenom: data.prenom,
                    date_naissance: data.date_naissance || '',
                    classe_id: data.classe_id || '',
                    groupe_ids: currentGroupIds,
                    niveau_id: data.niveau_id || '',
                    parent1_nom: data.parent1_nom || '',
                    parent1_prenom: data.parent1_prenom || '',
                    parent1_email: data.parent1_email || '',
                    parent2_nom: data.parent2_nom || '',
                    parent2_prenom: data.parent2_prenom || '',
                    parent2_email: data.parent2_email || '',
                    nom_parents: data.nom_parents || '',
                    photo_base64: data.photo_base64 || ''
                });
            }
        } catch (err) {
        }
    };

    const handleCloseModal = () => {
        onClose();
        setNewStudent(initialStudentState);
        setActiveTab('enfant');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewStudent(prev => ({ ...prev, [name]: value }));
    };

    const handleClassChange = (e) => {
        const value = e.target.value;
        if (value === 'create_new') {
            setShowAddClassModal(true);
        } else {
            setNewStudent(prev => ({ ...prev, classe_id: value }));
        }
    };

    const handleToggleGroup = (groupId) => {
        setNewStudent(prev => {
            const currentIds = prev.groupe_ids || [];
            if (currentIds.includes(groupId)) {
                return { ...prev, groupe_ids: currentIds.filter(id => id !== groupId) };
            } else {
                return { ...prev, groupe_ids: [...currentIds, groupId] };
            }
        });
    };

    const handleNiveauChange = (e) => {
        const value = e.target.value;
        if (value === 'create_new') {
            setShowAddNiveauModal(true);
        } else {
            setNewStudent(prev => ({ ...prev, niveau_id: value }));
        }
    };

    const handleClassAdded = (newClass) => {
        if (newClass) {
            setClassesList(prev => [...prev, newClass].sort((a, b) => a.nom.localeCompare(b.nom)));
            setNewStudent(prev => ({ ...prev, classe_id: newClass.id }));
        }
    };

    const handleGroupAdded = (newGroup) => {
        if (newGroup) {
            setGroupsList(prev => [...prev, newGroup].sort((a, b) => a.nom.localeCompare(b.nom)));
            setNewStudent(prev => ({ ...prev, groupe_ids: [...(prev.groupe_ids || []), newGroup.id] }));
        }
    };

    const handleNiveauAdded = (newNiveau) => {
        if (newNiveau) {
            setNiveauxList(prev => [...prev, newNiveau].sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
            setNewStudent(prev => ({ ...prev, niveau_id: newNiveau.id }));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const form = document.getElementById('student-form');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }

        setLoadingCreate(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user logged in");

            const studentData = {
                nom: newStudent.nom,
                prenom: newStudent.prenom,
                date_naissance: newStudent.date_naissance || null,
                classe_id: newStudent.classe_id || null,
                niveau_id: newStudent.niveau_id || null,
                titulaire_id: user.id,
                parent1_nom: newStudent.parent1_nom,
                parent1_prenom: newStudent.parent1_prenom,
                parent1_email: newStudent.parent1_email,
                parent2_nom: newStudent.parent2_nom,
                parent2_prenom: newStudent.parent2_prenom,
                parent2_email: newStudent.parent2_email,
                nom_parents: newStudent.nom_parents,
                photo_base64: newStudent.photo_base64
            };

            let studentId = editId;
            let error;

            if (isEditing && editId) {
                const { error: updateError } = await supabase
                    .from('Eleve')
                    .update(studentData)
                    .eq('id', editId);
                error = updateError;
            } else {
                const { data: insertedStudent, error: insertError } = await supabase
                    .from('Eleve')
                    .insert(studentData)
                    .select()
                    .single();
                error = insertError;
                if (insertedStudent) studentId = insertedStudent.id;
            }

            if (error) throw error;

            // Handle Group Links (N:N) - SYNC
            const selectedGroupIds = newStudent.groupe_ids || [];

            const { data: currentLinks } = await supabase
                .from('EleveGroupe')
                .select('id, groupe_id')
                .eq('eleve_id', studentId);

            const currentLinkedGroupIds = currentLinks?.map(l => l.groupe_id) || [];
            const groupsToAdd = selectedGroupIds.filter(id => !currentLinkedGroupIds.includes(id));
            const groupsToRemove = currentLinkedGroupIds.filter(id => !selectedGroupIds.includes(id));

            if (groupsToAdd.length > 0) {
                const toInsert = groupsToAdd.map(gid => ({
                    eleve_id: studentId,
                    groupe_id: gid,
                    user_id: user.id
                }));
                const { error: addErr } = await supabase.from('EleveGroupe').insert(toInsert);
                if (addErr) throw addErr;
            }

            if (groupsToRemove.length > 0) {
                const linkIdsToRemove = currentLinks
                    .filter(link => groupsToRemove.includes(link.groupe_id))
                    .map(link => link.id);

                if (linkIdsToRemove.length > 0) {
                    const { error: delErr } = await supabase
                        .from('EleveGroupe')
                        .delete()
                        .in('id', linkIdsToRemove);
                    if (delErr) throw delErr;
                }
            }

            onSaved(studentId);
            handleCloseModal();
        } catch (err) {
            alert("Erreur: " + err.message);
        } finally {
            setLoadingCreate(false);
        }
    };

    return (
        <>
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={isEditing ? "Modifier l'élève" : "Ajouter un élève"}
                icon={isEditing ? <UserIcon size={24} /> : <Plus size={24} />}
                className="max-w-2xl"
                noPadding
                footer={
                    <>
                        <Button onClick={handleCloseModal} variant="secondary" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={loadingCreate}
                            className="flex-1"
                            icon={Check}
                        >
                            {isEditing ? "Enregistrer" : "Créer l'élève"}
                        </Button>
                    </>
                }
            >
                {/* Tabs */}
                <div className="flex px-6 border-b border-border/5 bg-surface sticky top-0 z-10">
                    <button
                        onClick={() => setActiveTab('enfant')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'enfant' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Enfant
                    </button>
                    <button
                        onClick={() => setActiveTab('parent1')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'parent1' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Parent 1
                    </button>
                    <button
                        onClick={() => setActiveTab('parent2')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'parent2' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-text-main"
                        )}
                    >
                        Parent 2
                    </button>
                </div>

                <div className="p-6">
                    <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className={activeTab === 'enfant' ? 'block' : 'hidden'}>
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                {/* Photo Upload */}
                                <div className="flex justify-center mb-6">
                                    <ImageUpload
                                        value={newStudent.photo_base64}
                                        onChange={(v) => setNewStudent(prev => ({ ...prev, photo_base64: v }))}
                                        label="Photo de l'élève"
                                        className="w-full"
                                        placeholderIcon={UserIcon}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Prénom <span className="text-red-400">*</span></label>
                                        <input
                                            type="text"
                                            name="prenom"
                                            value={newStudent.prenom}
                                            onChange={handleInputChange}
                                            className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-grey-medium"
                                            placeholder="Ex: Jean"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Nom <span className="text-red-400">*</span></label>
                                        <input
                                            type="text"
                                            name="nom"
                                            value={newStudent.nom}
                                            onChange={handleInputChange}
                                            className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-grey-medium"
                                            placeholder="Ex: Dupont"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Date de naissance</label>
                                    <input
                                        type="date"
                                        name="date_naissance"
                                        value={newStudent.date_naissance}
                                        onChange={handleInputChange}
                                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1 relative">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Classe</label>
                                        <select
                                            value={newStudent.classe_id}
                                            onChange={handleClassChange}
                                            className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Sélectionner...</option>
                                            {classesList.map(c => (
                                                <option key={c.id} value={c.id}>{c.nom}</option>
                                            ))}
                                            <option value="create_new" className="font-bold text-primary bg-surface">+ Nouvelle classe</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1 relative">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Niveau</label>
                                        <select
                                            value={newStudent.niveau_id}
                                            onChange={handleNiveauChange}
                                            className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Sélectionner...</option>
                                            {niveauxList.map(n => (
                                                <option key={n.id} value={n.id}>{n.nom}</option>
                                            ))}
                                            <option value="create_new" className="font-bold text-primary bg-surface">+ Nouveau niveau</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Multi-Group Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                                        <Users size={14} />
                                        Groupes (Sélection multiple)
                                    </label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-input border border-border/10 rounded-xl min-h-[60px]">
                                        {groupsList.map(g => (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => handleToggleGroup(g.id)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border user-select-none",
                                                    newStudent.groupe_ids?.includes(g.id)
                                                        ? "bg-primary text-text-dark border-primary shadow-sm ring-1 ring-primary/20"
                                                        : "bg-surface text-grey-medium border-border/10 hover:border-border/30 hover:bg-input"
                                                )}
                                            >
                                                {g.nom}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setShowAddGroupModal(true)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-dashed border-primary/50 text-primary hover:bg-primary/10 flex items-center gap-1"
                                        >
                                            <Plus size={12} />
                                            Nouveau
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={activeTab === 'parent1' ? 'block' : 'hidden'}>
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                                    <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                                        <UserIcon size={16} className="text-primary" />
                                        Parent 1 (Principal)
                                    </h3>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Nom Global des Parents (ex: M. & Mme Dupont)</label>
                                        <input
                                            type="text"
                                            name="nom_parents"
                                            value={newStudent.nom_parents}
                                            onChange={handleInputChange}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                                            placeholder="Laissez vide pour utiliser les prénoms/noms ci-dessous"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-400 uppercase">Prénom</label>
                                            <input
                                                type="text"
                                                name="parent1_prenom"
                                                value={newStudent.parent1_prenom}
                                                onChange={handleInputChange}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#D9B981] focus:ring-1 focus:ring-[#D9B981] outline-none transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-400 uppercase">Nom</label>
                                            <input
                                                type="text"
                                                name="parent1_nom"
                                                value={newStudent.parent1_nom}
                                                onChange={handleInputChange}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#D9B981] focus:ring-1 focus:ring-[#D9B981] outline-none transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
                                        <input
                                            type="email"
                                            name="parent1_email"
                                            value={newStudent.parent1_email}
                                            onChange={handleInputChange}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#D9B981] focus:ring-1 focus:ring-[#D9B981] outline-none transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={activeTab === 'parent2' ? 'block' : 'hidden'}>
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                                    <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                                        <UserIcon size={16} className="text-primary" />
                                        Parent 2 (Optionnel)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-400 uppercase">Prénom</label>
                                            <input
                                                type="text"
                                                name="parent2_prenom"
                                                value={newStudent.parent2_prenom}
                                                onChange={handleInputChange}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#D9B981] focus:ring-1 focus:ring-[#D9B981] outline-none transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-400 uppercase">Nom</label>
                                            <input
                                                type="text"
                                                name="parent2_nom"
                                                value={newStudent.parent2_nom}
                                                onChange={handleInputChange}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#D9B981] focus:ring-1 focus:ring-[#D9B981] outline-none transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
                                        <input
                                            type="email"
                                            name="parent2_email"
                                            value={newStudent.parent2_email}
                                            onChange={handleInputChange}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#D9B981] focus:ring-1 focus:ring-[#D9B981] outline-none transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>

            <AddClassModal
                isOpen={showAddClassModal}
                onClose={() => setShowAddClassModal(false)}
                onAdded={handleClassAdded}
            />

            <AddGroupModal
                isOpen={showAddGroupModal}
                onClose={() => setShowAddGroupModal(false)}
                onAdded={handleGroupAdded}
            />

            <AddNiveauModal
                isOpen={showAddNiveauModal}
                onClose={() => setShowAddNiveauModal(false)}
                onAdded={handleNiveauAdded}
            />
        </>
    );
};

export default StudentModal;
