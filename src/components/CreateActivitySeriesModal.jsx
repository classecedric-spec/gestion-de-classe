import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Sparkles, Check, Plus, Trash2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import clsx from 'clsx';

const CreateActivitySeriesModal = ({ isOpen, onClose, onAdded, moduleId }) => {
    const [baseName, setBaseName] = useState('');
    const [startNumber, setStartNumber] = useState(1);
    const [count, setCount] = useState(1);
    const [levels, setLevels] = useState([]);
    const [selectedLevels, setSelectedLevels] = useState([]); // Array of { id, nom, nombre_exercices, nombre_erreurs }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [materialTypeId, setMaterialTypeId] = useState(null); // ID for "Fichier papier"
    const [materialAcronym, setMaterialAcronym] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchLevels();
            ensurePaperMaterial(); // Check/Create "Fichier papier"
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setBaseName('');
        setStartNumber(1);
        setCount(1);
        setSelectedLevels([]);
        setError(null);
    };

    const fetchLevels = async () => {
        try {
            const { data } = await supabase.from('Niveau').select('*').order('ordre');
            setLevels(data || []);
        } catch (err) {
            console.error('Error fetching levels:', err);
        }
    };

    const handleAddLevel = (id) => {
        if (!id) return;
        const levelData = levels.find(l => l.id === id);
        if (levelData && !selectedLevels.some(sl => sl.id === id)) {
            setSelectedLevels([...selectedLevels, {
                id: levelData.id,
                nom: levelData.nom,
                nombre_exercices: '',
                nombre_erreurs: 1
            }]);
        }
    };

    const handleLevelChange = (index, field, value) => {
        const newSelected = [...selectedLevels];
        newSelected[index][field] = value;
        setSelectedLevels(newSelected);
    };

    const handleRemoveLevel = (index) => {
        setSelectedLevels(selectedLevels.filter((_, i) => i !== index));
    };

    const ensurePaperMaterial = async () => {
        try {
            // Check if exists
            const { data: existing } = await supabase
                .from('TypeMateriel')
                .select('id, acronyme')
                .ilike('nom', 'Fichier papier')
                .maybeSingle();

            if (existing) {
                setMaterialTypeId(existing.id);
                setMaterialAcronym(existing.acronyme || '');
            } else {
                // Create it
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: created, error } = await supabase
                        .from('TypeMateriel')
                        .insert([{ nom: 'Fichier papier', acronyme: 'FP', user_id: user.id }])
                        .select()
                        .single();

                    if (!error && created) {
                        setMaterialTypeId(created.id);
                        setMaterialAcronym(created.acronyme || 'FP');
                    }
                }
            }
        } catch (err) {
            console.error("Error ensuring paper material:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!baseName.trim() || selectedLevels.length === 0 || count < 1) {
            setError("Veuillez remplir tous les champs obligatoires (incluant au moins un niveau).");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté.");

            // 1. Get current max order in this module to append correctly
            const { data: currentActivities } = await supabase
                .from('Activite')
                .select('ordre')
                .eq('module_id', moduleId)
                .order('ordre', { ascending: false })
                .limit(1);

            let lastOrder = currentActivities?.[0]?.ordre || 0;

            const activitiesToInsert = [];
            for (let i = 0; i < count; i++) {
                const num = parseInt(startNumber) + i;
                let titre = `${baseName.trim()}.${num}`;
                if (materialAcronym) {
                    titre += ` [${materialAcronym}]`;
                }

                activitiesToInsert.push({
                    titre,
                    module_id: moduleId,
                    user_id: user.id,
                    ordre: lastOrder + i + 1,
                    statut_exigence: 'obligatoire',
                    nombre_exercices: selectedLevels[0].nombre_exercices || 1, // Use first level as base
                    nombre_erreurs: selectedLevels[0].nombre_erreurs || 0
                });
            }

            // 2. Insert Activities
            const { data: insertedActivities, error: insertError } = await supabase
                .from('Activite')
                .insert(activitiesToInsert)
                .select();

            if (insertError) throw insertError;

            // 3. Link to Levels in ActiviteNiveau
            if (insertedActivities && insertedActivities.length > 0) {
                const linksToInsert = [];

                insertedActivities.forEach(act => {
                    selectedLevels.forEach(sl => {
                        linksToInsert.push({
                            activite_id: act.id,
                            niveau_id: sl.id,
                            nombre_exercices: sl.nombre_exercices,
                            nombre_erreurs: sl.nombre_erreurs,
                            statut_exigence: 'obligatoire'
                        });
                    });
                });

                const { error: linkError } = await supabase
                    .from('ActiviteNiveau')
                    .insert(linksToInsert);

                if (linkError) throw linkError;

                // 4. Link "Fichier papier" Material if available
                if (materialTypeId) {
                    const materialLinks = insertedActivities.map(act => ({
                        activite_id: act.id,
                        type_materiel_id: materialTypeId
                    }));

                    const { error: matError } = await supabase
                        .from('ActiviteMateriel')
                        .insert(materialLinks);

                    if (matError) console.error("Error linking material:", matError);
                }
            }

            onAdded();
            onClose();
        } catch (err) {
            console.error('Error creating activity series:', err);
            setError(err.message || "Une erreur est survenue lors de la création.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Créer une série d'activités"
            icon={<Sparkles size={24} className="text-primary" />}
            className="max-w-lg"
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        disabled={!baseName.trim() || selectedLevels.length === 0}
                        className="flex-1"
                        icon={Check}
                    >
                        Générer la série
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-900/30 border border-red-500/30 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nom de l'activité (Base)</label>
                        <input
                            type="text"
                            value={baseName}
                            onChange={(e) => setBaseName(e.target.value)}
                            placeholder="Ex: Totem 2"
                            className="w-full px-4 py-2 bg-input border border-border/10 rounded-xl text-text-main placeholder-grey-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">N° de départ</label>
                            <input
                                type="number"
                                value={startNumber}
                                onChange={(e) => setStartNumber(e.target.value)}
                                min="1"
                                className="w-full px-4 py-2 bg-input border border-border/10 rounded-xl text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Nb d'activités dans la série</label>
                            <input
                                type="number"
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                min="1"
                                max="50"
                                className="w-full px-4 py-2 bg-input border border-border/10 rounded-xl text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
                                <Plus size={16} className="text-primary" />
                                Niveaux & Paramètres
                            </h4>
                            <select
                                onChange={(e) => { handleAddLevel(e.target.value); e.target.value = ''; }}
                                className="bg-surface/50 border border-border/10 rounded-lg text-xs py-1 px-2 focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                                value=""
                            >
                                <option value="" disabled>Ajouter un niveau...</option>
                                {levels.filter(l => !selectedLevels.some(sl => sl.id === l.id)).map(lv => (
                                    <option key={lv.id} value={lv.id}>{lv.nom}</option>
                                ))}
                            </select>
                        </div>

                        {selectedLevels.length === 0 ? (
                            <div className="text-center py-6 px-4 border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-xs text-grey-medium italic">Aucun niveau sélectionné. Ajoutez-en un ci-dessus.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedLevels.map((sl, index) => (
                                    <div key={sl.id} className="flex items-center gap-3 bg-surface/40 p-3 rounded-2xl border border-white/5 group animate-in slide-in-from-left-2 duration-200">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate uppercase tracking-wider">{sl.nom}</p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="flex flex-col">
                                                <label className="text-[10px] text-grey-medium uppercase font-bold px-1">Ex.</label>
                                                <input
                                                    type="number"
                                                    value={sl.nombre_exercices}
                                                    onChange={(e) => handleLevelChange(index, 'nombre_exercices', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                    className="w-14 bg-background/50 border border-white/5 rounded-lg py-1 text-center text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="text-[10px] text-grey-medium uppercase font-bold px-1">Err.</label>
                                                <input
                                                    type="number"
                                                    value={sl.nombre_erreurs}
                                                    onChange={(e) => handleLevelChange(index, 'nombre_erreurs', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                    className="w-14 bg-background/50 border border-white/5 rounded-lg py-1 text-center text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLevel(index)}
                                                className="mt-4 p-1.5 text-grey-medium hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default CreateActivitySeriesModal;
