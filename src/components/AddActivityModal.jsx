import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Loader2, Plus, Trash2, Check, Save, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import SelectModuleModal from './SelectModuleModal';
import Modal from './ui/Modal';
import Button from './ui/Button';

const AddActivityModal = ({ isOpen, onClose, onAdded, activityToEdit }) => {
    // Activity Fields
    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [moduleName, setModuleName] = useState('');
    const [showSelectModule, setShowSelectModule] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Requirements
    const [nbExercises, setNbExercises] = useState('');
    const [nbErrors, setNbErrors] = useState('');
    const [requirementStatus, setRequirementStatus] = useState('obligatoire');

    const [levels, setLevels] = useState([]);
    const [activityLevels, setActivityLevels] = useState([]);

    // Material Types
    const [materialTypes, setMaterialTypes] = useState([]);
    const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);
    const [newMaterialTypeName, setNewMaterialTypeName] = useState('');
    const [isAddingMaterialType, setIsAddingMaterialType] = useState(false);
    const [editingMaterialTypeId, setEditingMaterialTypeId] = useState(null);
    const [editingMaterialName, setEditingMaterialName] = useState('');
    const [materialTypeIdToDelete, setMaterialTypeIdToDelete] = useState(null); // ID to delete
    const editInputRef = useRef(null);

    // Tabs state
    const [activeTab, setActiveTab] = useState('general'); // 'general', 'levels', 'materials'

    useEffect(() => {
        function handleClickOutside(event) {
            if (editInputRef.current && !editInputRef.current.contains(event.target)) {
                // Clicked outside: Cancel edit
                setEditingMaterialTypeId(null);
                setEditingMaterialName('');
                setIsAddingMaterialType(false); // Also close add mode if clicked outside
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [editInputRef]);

    useEffect(() => {
        if (isOpen) {
            fetchMaterialTypes();
            fetchLevels();
            setActiveTab('general'); // Reset to first tab
            if (activityToEdit) {
                setTitle(activityToEdit.titre);
                setModuleId(activityToEdit.module_id || '');
                // Try to find module name from nested if available, or fetch it
                if (activityToEdit.Module && activityToEdit.Module.nom) {
                    setModuleName(activityToEdit.Module.nom);
                } else if (activityToEdit.module_id) {
                    fetchModuleName(activityToEdit.module_id);
                }

                setNbExercises(activityToEdit.nombre_exercices || '');
                setNbErrors(activityToEdit.nombre_erreurs || '');
                setRequirementStatus(activityToEdit.statut_exigence || 'obligatoire');
                fetchActivityMaterials(activityToEdit.id);
                fetchActivityLevels(activityToEdit.id);
            } else {
                resetForm();
            }
        }
    }, [isOpen, activityToEdit]);

    const resetForm = () => {
        setTitle('');
        setModuleId('');
        setModuleName('');
        setNbExercises('');
        setNbErrors('');
        setRequirementStatus('obligatoire');
        setSelectedMaterialTypes([]);
        setActivityLevels([]);
        setError(null);
    };

    const fetchModuleName = async (id) => {
        const { data } = await supabase.from('Module').select('nom').eq('id', id).single();
        if (data) setModuleName(data.nom);
    };

    const fetchMaterialTypes = async () => {
        const { data } = await supabase.from('TypeMateriel').select('*').order('nom');
        setMaterialTypes(data || []);
    };

    const fetchActivityMaterials = async (activityId) => {
        const { data } = await supabase.from('ActiviteMateriel').select('type_materiel_id').eq('activite_id', activityId);
        if (data) {
            setSelectedMaterialTypes(data.map(d => d.type_materiel_id));
        }
    };

    const handleCreateMaterialType = async () => {
        if (!newMaterialTypeName.trim()) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.from('TypeMateriel').insert([{
                nom: newMaterialTypeName.trim(),
                user_id: user.id
            }]).select().single();

            if (error) throw error;

            setMaterialTypes(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
            setNewMaterialTypeName('');
            setIsAddingMaterialType(false);
            // Optionally auto-select it?
            setSelectedMaterialTypes(prev => [...prev, data.id]);
        } catch (err) {
            console.error("Error creating material type:", err);
        }
    };

    const handleUpdateMaterialType = async () => {
        if (!editingMaterialName.trim() || !editingMaterialTypeId) return;
        try {
            const { error } = await supabase
                .from('TypeMateriel')
                .update({ nom: editingMaterialName.trim() })
                .eq('id', editingMaterialTypeId);

            if (error) throw error;

            setMaterialTypes(prev => prev.map(mt =>
                mt.id === editingMaterialTypeId ? { ...mt, nom: editingMaterialName.trim() } : mt
            ).sort((a, b) => a.nom.localeCompare(b.nom)));
            setEditingMaterialTypeId(null);
            setEditingMaterialName('');
        } catch (err) {
            console.error("Error updating material type:", err);
        }
    };

    const handleDeleteMaterialTypeClick = (id) => {
        setMaterialTypeIdToDelete(id);
    };

    const confirmDeleteMaterialType = async () => {
        if (!materialTypeIdToDelete) return;
        try {
            const { error } = await supabase.from('TypeMateriel').delete().eq('id', materialTypeIdToDelete);
            if (error) throw error;
            setMaterialTypes(prev => prev.filter(mt => mt.id !== materialTypeIdToDelete));
            // Also remove from selected if present
            setSelectedMaterialTypes(prev => prev.filter(tid => tid !== materialTypeIdToDelete));
            // Force exit edit mode if we deleted the one being edited
            if (editingMaterialTypeId === materialTypeIdToDelete) {
                setEditingMaterialTypeId(null);
            }
        } catch (err) {
            console.error("Error deleting material type:", err);
        } finally {
            setMaterialTypeIdToDelete(null);
        }
    };

    const fetchLevels = async () => {
        const { data } = await supabase.from('Niveau').select('id, nom').order('ordre');
        setLevels(data || []);
    };

    const fetchActivityLevels = async (activityId) => {
        const { data, error } = await supabase
            .from('ActiviteNiveau')
            .select(`
                *,
                Niveau (nom)
            `)
            .eq('activite_id', activityId);

        if (data) {
            setActivityLevels(data.map(item => ({
                id: item.id, // ID of the link row if exists
                niveau_id: item.niveau_id,
                nom_niveau: item.Niveau?.nom,
                nombre_exercices: item.nombre_exercices,
                nombre_erreurs: item.nombre_erreurs,
                statut_exigence: item.statut_exigence
            })));
        }
    };

    const handleAddLevel = (levelId) => {
        const level = levels.find(l => l.id === levelId);
        if (!level) return;

        // Default to base requirements
        setActivityLevels(prev => [...prev, {
            niveau_id: level.id,
            nom_niveau: level.nom,
            nombre_exercices: nbExercises || 0,
            nombre_erreurs: nbErrors || 0,
            statut_exigence: requirementStatus
        }]);
    };

    const handleRemoveLevel = (levelId) => {
        setActivityLevels(prev => prev.filter(l => l.niveau_id !== levelId));
    };

    const updateActivityLevel = (index, field, value) => {
        setActivityLevels(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !moduleId) return; // Basic validation
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const activityData = {
                titre: title.trim(),
                module_id: moduleId, // Changed from sous_branche_id
                nombre_exercices: parseInt(nbExercises) || 0,
                nombre_erreurs: parseInt(nbErrors) || 0,
                statut_exigence: requirementStatus,
                user_id: user.id
            };

            let activityId;

            if (activityToEdit) {
                const { error } = await supabase.from('Activite').update(activityData).eq('id', activityToEdit.id);
                if (error) throw error;
                activityId = activityToEdit.id;
            } else {
                const { data, error } = await supabase.from('Activite').insert([activityData]).select().single();
                if (error) throw error;
                activityId = data.id;
            }

            // Handle Material Types
            await supabase.from('ActiviteMateriel').delete().eq('activite_id', activityId);

            if (selectedMaterialTypes.length > 0) {
                const links = selectedMaterialTypes.map(mtId => ({
                    activite_id: activityId,
                    type_materiel_id: mtId
                }));
                const { error: linkError } = await supabase.from('ActiviteMateriel').insert(links);
                if (linkError) throw linkError;
            }

            // Handle Activity Levels (ActiviteNiveau)
            await supabase.from('ActiviteNiveau').delete().eq('activite_id', activityId);

            if (activityLevels.length > 0) {
                const levelLinks = activityLevels.map(al => ({
                    activite_id: activityId,
                    niveau_id: al.niveau_id,
                    nombre_exercices: parseInt(al.nombre_exercices) || 0,
                    nombre_erreurs: parseInt(al.nombre_erreurs) || 0,
                    statut_exigence: al.statut_exigence,
                    user_id: user.id
                }));

                const { error: levelError } = await supabase.from('ActiviteNiveau').insert(levelLinks);
                if (levelError) throw levelError;
            }

            onAdded();
            onClose();
        } catch (err) {
            console.error("Error saving activity:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleMaterialType = (id) => {
        setSelectedMaterialTypes(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'general', label: 'Général & Exigences' },
        { id: 'levels', label: 'Par Niveau' },
        { id: 'materials', label: 'Matériel' }
    ];

    return (
        <React.Fragment>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={activityToEdit ? 'Modifier l\'Activité' : 'Nouvelle Activité'}
                className="max-w-2xl"
                footer={
                    <>
                        <Button onClick={onClose} variant="secondary" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={loading}
                            className="flex-1"
                            icon={Save}
                        >
                            Enregistrer
                        </Button>
                    </>
                }
            >
                {/* Tabs Header */}
                <div className="flex border-b border-white/10 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex-1 pb-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-400 hover:text-white"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form id="activityForm" onSubmit={handleSubmit}>
                    {/* TAB 1: GENERAL */}
                    <div className={clsx("space-y-6", activeTab !== 'general' && "hidden")}>
                        <div className="space-y-2">
                            <label htmlFor="activity_title" className="text-sm font-medium text-gray-300">Nom de l'activité <span className="text-danger">*</span></label>
                            <input
                                id="activity_title"
                                name="activity_title"
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                placeholder="Ex: Exercices de calcul mental"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Module <span className="text-danger">*</span></label>
                            <button
                                type="button"
                                onClick={() => setShowSelectModule(true)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-left text-white focus:ring-1 focus:ring-primary focus:border-primary flex justify-between items-center transition-all hover:bg-black/30"
                            >
                                <span className={clsx(!moduleId && "text-gray-500 italic")}>
                                    {moduleId ? moduleName : "Cliquez pour lier un module..."}
                                </span>
                            </button>
                        </div>

                        <div className="bg-surface/10 p-4 rounded-xl border border-white/5 space-y-4">
                            <h5 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Exigences de base</h5>
                            <p className="text-xs text-gray-400 mb-2">Ces valeurs seront appliquées par défaut si aucune exigence spécifique n'est définie pour un niveau.</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label htmlFor="nb_exercises" className="text-xs font-medium text-gray-400">Nb Exercices</label>
                                    <input
                                        id="nb_exercises"
                                        name="nb_exercises"
                                        type="number"
                                        value={nbExercises}
                                        onChange={e => setNbExercises(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-primary outline-none"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="nb_errors" className="text-xs font-medium text-gray-400">Nb Erreurs Max</label>
                                    <input
                                        id="nb_errors"
                                        name="nb_errors"
                                        type="number"
                                        value={nbErrors}
                                        onChange={e => setNbErrors(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:border-primary outline-none"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400">Statut</label>
                                <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setRequirementStatus('obligatoire')}
                                        className={clsx(
                                            "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                            requirementStatus === 'obligatoire' ? "bg-success text-text-dark shadow-sm" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        Obligatoire
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRequirementStatus('facultatif')}
                                        className={clsx(
                                            "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                            requirementStatus === 'facultatif' ? "bg-danger text-white shadow-sm" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        Facultatif
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TAB 2: LEVELS */}
                    <div className={clsx("space-y-4", activeTab !== 'levels' && "hidden")}>
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-bold text-white uppercase tracking-wide">Exigences par Niveau</h5>
                            <div className="relative">
                                <select
                                    onChange={(e) => handleAddLevel(e.target.value)}
                                    value=""
                                    className="bg-white/5 text-xs text-primary border border-primary/20 rounded-lg py-1 px-2 outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    <option value="" disabled>+ Ajouter une exception</option>
                                    {levels.filter(l => !activityLevels.find(al => al.niveau_id === l.id)).map(level => (
                                        <option key={level.id} value={level.id}>{level.nom}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {activityLevels.length === 0 ? (
                            <div className="bg-black/20 border border-white/5 rounded-xl p-8 text-center">
                                <p className="text-sm text-gray-400">Aucune exigence spécifique configurée.</p>
                                <p className="text-xs text-gray-600 mt-1">L'activité utilisera les exigences de base pour tous les niveaux.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activityLevels.map((al, index) => (
                                    <div key={al.niveau_id} className="bg-black/20 p-4 rounded-xl border border-white/5 relative group animate-in slide-in-from-left-2 duration-300">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLevel(al.niveau_id)}
                                            className="absolute top-3 right-3 text-gray-500 hover:text-danger p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Retirer ce niveau"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        <h6 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary/50"></span>
                                            Niveau <span className="text-white">{al.nom_niveau}</span>
                                        </h6>

                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-gray-400 uppercase">Exercices</label>
                                                <input
                                                    type="number"
                                                    value={al.nombre_exercices}
                                                    onChange={(e) => updateActivityLevel(index, 'nombre_exercices', e.target.value)}
                                                    className="w-full bg-background/50 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none"
                                                    min="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-gray-400 uppercase">Erreurs Max</label>
                                                <input
                                                    type="number"
                                                    value={al.nombre_erreurs}
                                                    onChange={(e) => updateActivityLevel(index, 'nombre_erreurs', e.target.value)}
                                                    className="w-full bg-background/50 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-primary outline-none"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {['obligatoire', 'facultatif'].map(status => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => updateActivityLevel(index, 'statut_exigence', status)}
                                                    className={clsx(
                                                        "flex-1 py-1.5 text-xs font-bold uppercase rounded border transition-all",
                                                        al.statut_exigence === status
                                                            ? (status === 'obligatoire' ? "bg-success/20 text-success border-success/30" : "bg-danger/20 text-danger border-danger/30")
                                                            : "border-white/5 text-gray-500 hover:border-white/20"
                                                    )}
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* TAB 3: MATERIALS */}
                    <div className={clsx("space-y-6", activeTab !== 'materials' && "hidden")}>
                        <div className="flex items-center justify-between border-b border-primary/20 pb-2 mb-4">
                            <h4 className="text-md font-bold text-primary uppercase tracking-wider">Matériel Requis</h4>
                            {!isAddingMaterialType && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingMaterialType(true)}
                                    className="text-xs bg-white/5 hover:bg-white/10 text-primary px-2 py-1 rounded-lg border border-primary/20 transition-colors flex items-center gap-1"
                                >
                                    <Plus size={12} /> Nouveau
                                </button>
                            )}
                        </div>

                        {isAddingMaterialType && (
                            <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 mb-4">
                                <label htmlFor="new_material_name" className="text-xs font-bold text-primary mb-2 block">Nom du nouveau type</label>
                                <div className="flex gap-2">
                                    <input
                                        id="new_material_name"
                                        name="new_material_name"
                                        type="text"
                                        value={newMaterialTypeName}
                                        onChange={e => setNewMaterialTypeName(e.target.value)}
                                        className="flex-1 bg-black/20 border border-primary/30 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-primary"
                                        placeholder="Ex: Règle, Compas..."
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateMaterialType}
                                        className="bg-primary text-text-dark p-2 rounded-lg hover:brightness-110 shadow-lg shadow-primary/20"
                                        title="Valider"
                                    >
                                        <Check size={16} strokeWidth={3} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingMaterialType(false)}
                                        className="bg-danger text-white p-2 rounded-lg hover:bg-danger/90 shadow-lg shadow-danger/20"
                                        title="Annuler"
                                    >
                                        <X size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {materialTypes.length === 0 ? (
                                <p className="col-span-2 text-sm text-gray-500 italic text-center py-4">Aucun type de matériel défini.</p>
                            ) : (
                                materialTypes.map(mt => (
                                    <div key={mt.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 group">
                                        {/* Checkbox for Selection */}
                                        <button
                                            type="button"
                                            onClick={() => toggleMaterialType(mt.id)}
                                            className={clsx(
                                                "w-6 h-6 rounded border flex items-center justify-center transition-all shrink-0",
                                                selectedMaterialTypes.includes(mt.id) ? "bg-primary border-primary" : "border-gray-500 bg-transparent hover:border-white"
                                            )}
                                        >
                                            {selectedMaterialTypes.includes(mt.id) && <Check size={14} className="text-black" />}
                                        </button>

                                        {/* Name / Edit Mode */}
                                        {editingMaterialTypeId === mt.id ? (
                                            <div
                                                ref={editInputRef}
                                                className="flex-1 flex gap-2 animate-in fade-in zoom-in-95 duration-200"
                                            >
                                                <input
                                                    type="text"
                                                    value={editingMaterialName}
                                                    onChange={e => setEditingMaterialName(e.target.value)}
                                                    className="flex-1 bg-black/20 border border-primary/30 rounded-lg py-1 px-2 text-white text-sm focus:outline-none focus:border-primary"
                                                    autoFocus
                                                    aria-label="Modifier le nom du type de matériel"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleUpdateMaterialType}
                                                    className="bg-primary text-text-dark p-1.5 rounded-md hover:brightness-110 shadow-sm"
                                                    title="Valider"
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMaterialTypeClick(mt.id)}
                                                    className="bg-danger text-white p-1.5 rounded-md hover:bg-danger/90 shadow-sm"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={14} strokeWidth={2} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => {
                                                    setEditingMaterialTypeId(mt.id);
                                                    setEditingMaterialName(mt.nom);
                                                }}
                                                className="flex-1 text-sm font-medium text-gray-300 hover:text-white cursor-text py-1 px-2 rounded hover:bg-white/5 transition-colors truncate select-none"
                                                title="Cliquer pour modifier"
                                            >
                                                {mt.nom}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            <SelectModuleModal
                isOpen={showSelectModule}
                onClose={() => setShowSelectModule(false)}
                onSelect={(module) => {
                    setModuleId(module.id);
                    setModuleName(module.nom);
                }}
            />

            {/* Confirmation Modal for Deletion */}
            <Modal
                isOpen={!!materialTypeIdToDelete}
                onClose={() => setMaterialTypeIdToDelete(null)}
                title="Supprimer ce type ?"
                icon={<AlertTriangle size={24} />}
                className="max-w-sm"
                footer={
                    <>
                        <Button
                            onClick={() => setMaterialTypeIdToDelete(null)}
                            variant="secondary"
                            className="flex-1"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={confirmDeleteMaterialType}
                            variant="danger"
                            className="flex-1"
                            icon={Trash2}
                        >
                            Supprimer
                        </Button>
                    </>
                }
            >
                <div className="text-center">
                    <p className="text-gray-400 text-sm mb-2">
                        Cette action est irréversible. Le type de matériel sera retiré de la liste.
                    </p>
                </div>
            </Modal>
        </React.Fragment>
    );
};

export default AddActivityModal;
