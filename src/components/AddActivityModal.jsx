import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Loader2, Plus, Trash2, Check, Save, AlertTriangle, Pencil } from 'lucide-react';
import clsx from 'clsx';
import SelectModuleModal from './SelectModuleModal';
import Modal from './ui/Modal';
import Button from './ui/Button';

const AddActivityModal = ({ isOpen, onClose, onAdded, activityToEdit, defaultModuleId, defaultModuleName, nextOrder }) => {
    // Activity Fields
    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [moduleName, setModuleName] = useState('');
    const [showSelectModule, setShowSelectModule] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Requirements
    const [nbExercises, setNbExercises] = useState('');
    const [nbErrors, setNbErrors] = useState(1);
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
    const titleInputRef = useRef(null);

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
            // Auto-focus title
            setTimeout(() => {
                if (titleInputRef.current) {
                    titleInputRef.current.focus();
                }
            }, 100);

            fetchMaterialTypes();
            fetchLevels();
            if (activityToEdit) {
                setTitle(activityToEdit.titre);
                setModuleId(activityToEdit.module_id || '');
                // Try to find module name from nested if available, or fetch it
                if (activityToEdit.Module && activityToEdit.Module.nom) {
                    setModuleName(activityToEdit.Module.nom);
                } else if (activityToEdit.module_id) {
                    fetchModuleName(activityToEdit.module_id);
                }

                setNbExercises(activityToEdit.nombre_exercices ?? 1);
                setNbErrors(activityToEdit.nombre_erreurs ?? 1);
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
        setModuleId(defaultModuleId || '');
        setModuleName(defaultModuleName || '');
        setNbExercises('');
        setNbErrors(1);
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
            nombre_exercices: nbExercises,
            nombre_erreurs: nbErrors,
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
                nombre_exercices: parseInt(nbExercises) || 1,
                nombre_erreurs: parseInt(nbErrors) || 1,
                statut_exigence: requirementStatus,
                user_id: user.id
            };

            if (!activityToEdit) {
                activityData.ordre = nextOrder || 0;
            }

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
                    nombre_exercices: parseInt(al.nombre_exercices) || 1,
                    nombre_erreurs: parseInt(al.nombre_erreurs) || 1,
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
                {/* Content Container - Scrollable */}
                <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <form id="activityForm" onSubmit={handleSubmit} className="space-y-10">
                        {/* SECTION 1: GENERAL & BASE REQUIREMENTS */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="activity_title" className="text-sm font-medium text-gray-300">Nom de l'activité <span className="text-danger">*</span></label>
                                <input
                                    id="activity_title"
                                    name="activity_title"
                                    ref={titleInputRef}
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
                                            placeholder="1"
                                            min="1"
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
                                            placeholder="1"
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

                        {/* SECTION 2: MATERIALS */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Matériel Requis</h4>
                                {!isAddingMaterialType && (
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingMaterialType(true)}
                                        className="text-[10px] bg-white/5 hover:bg-white/10 text-primary px-2 py-1 rounded border border-primary/20 transition-colors flex items-center gap-1 font-bold uppercase"
                                    >
                                        <Plus size={10} /> Nouveau
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
                                        >
                                            <Check size={16} strokeWidth={3} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingMaterialType(false)}
                                            className="bg-danger text-white p-2 rounded-lg hover:bg-danger/90 shadow-lg shadow-danger/20"
                                        >
                                            <X size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                {materialTypes.length === 0 ? (
                                    <p className="col-span-2 text-xs text-gray-500 italic text-center py-2">Aucun type de matériel défini.</p>
                                ) : (
                                    materialTypes.map(mt => (
                                        <div
                                            key={mt.id}
                                            onClick={() => toggleMaterialType(mt.id)}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 group cursor-pointer"
                                        >
                                            <div
                                                className={clsx(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0",
                                                    selectedMaterialTypes.includes(mt.id) ? "bg-primary border-primary" : "border-gray-500 bg-transparent hover:border-white"
                                                )}
                                            >
                                                {selectedMaterialTypes.includes(mt.id) && <Check size={12} className="text-black" strokeWidth={4} />}
                                            </div>

                                            {editingMaterialTypeId === mt.id ? (
                                                <div ref={editInputRef} className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editingMaterialName}
                                                        onChange={e => setEditingMaterialName(e.target.value)}
                                                        className="flex-1 bg-black/20 border border-primary/30 rounded py-1 px-2 text-white text-xs focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <button type="button" onClick={handleUpdateMaterialType} className="text-primary p-1"><Check size={14} /></button>
                                                    <button type="button" onClick={() => handleDeleteMaterialTypeClick(mt.id)} className="text-danger p-1"><Trash2 size={14} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1 text-xs font-medium text-gray-400 hover:text-white truncate select-none">
                                                        {mt.nom}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingMaterialTypeId(mt.id);
                                                            setEditingMaterialName(mt.nom);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-white transition-all rounded hover:bg-white/10"
                                                        title="Renommer"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* SEPARATOR & EXCEPTIONS */}
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-6 bg-[#1A1A1A] text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 border border-white/10 rounded-full py-1">
                                    Exceptions par Niveau
                                </span>
                            </div>
                        </div>

                        {/* SECTION 3: LEVEL EXCEPTIONS */}
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h5 className="text-xs font-bold text-white uppercase tracking-wide opacity-50">Personnalisation</h5>
                                <div className="relative">
                                    <select
                                        onChange={(e) => handleAddLevel(e.target.value)}
                                        value=""
                                        className="bg-white/5 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20 rounded-lg py-1.5 px-3 outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/10 transition-colors"
                                    >
                                        <option value="" disabled>+ Ajouter une exception</option>
                                        {levels.filter(l => !activityLevels.find(al => al.niveau_id === l.id)).map(level => (
                                            <option key={level.id} value={level.id}>{level.nom}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {activityLevels.length === 0 ? (
                                <div className="bg-black/10 border border-dashed border-white/5 rounded-2xl py-10 text-center">
                                    <p className="text-xs text-gray-500 italic">Aucune exigence spécifique configurée.</p>
                                    <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tight">Utilise les exigences de base par défaut</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activityLevels.map((al, index) => (
                                        <div key={al.niveau_id} className="bg-white/5 p-4 rounded-2xl border border-white/5 relative group animate-in slide-in-from-bottom-2 duration-300">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLevel(al.niveau_id)}
                                                className="absolute top-4 right-4 text-gray-600 hover:text-danger p-1 rounded transition-colors"
                                            >
                                                <X size={14} />
                                            </button>

                                            <h6 className="text-[11px] font-black text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                                Niveau {al.nom_niveau}
                                            </h6>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Exercices</label>
                                                    <input
                                                        type="number"
                                                        value={al.nombre_exercices}
                                                        onChange={(e) => updateActivityLevel(index, 'nombre_exercices', e.target.value)}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none"
                                                        min="1"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Erreurs Max</label>
                                                    <input
                                                        type="number"
                                                        value={al.nombre_erreurs}
                                                        onChange={(e) => updateActivityLevel(index, 'nombre_erreurs', e.target.value)}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none"
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
                                                            "flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all tracking-wider",
                                                            al.statut_exigence === status
                                                                ? (status === 'obligatoire' ? "bg-success text-text-dark border-success" : "bg-danger text-white border-danger")
                                                                : "border-white/5 text-gray-600 hover:border-white/10"
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
                    </form>
                </div>
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
