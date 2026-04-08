import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/database';
import { Sparkles, Check, Trash2 } from 'lucide-react';
import { Modal, Button } from '../core';
import { Tables } from '../types/supabase';
import { SupabaseActivityRepository } from '../features/activities/repositories/SupabaseActivityRepository';

interface CreatedActivityData {
    id: string;
    titre: string;
    module_id: string | null;
    user_id: string;
    ordre: number | null;
    statut_exigence: string | null;
    nombre_exercices: number | null;
    nombre_erreurs: number | null;
    ActiviteNiveau?: any[];
    ActiviteMateriel?: any[];
    Progression?: any[];
    [key: string]: any;
}

interface CreateActivitySeriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded: (newActivities: CreatedActivityData[]) => void;
    moduleId: string;
}

interface LevelSelection {
    id: string;
    nom: string;
    nombre_exercices: number;
    nombre_erreurs: number;
}

const activityRepository = new SupabaseActivityRepository();

const CreateActivitySeriesModal: React.FC<CreateActivitySeriesModalProps> = ({ isOpen, onClose, onAdded, moduleId }) => {
    const [baseName, setBaseName] = useState('');
    const [startNumber, setStartNumber] = useState<number | string>(1);
    const [count, setCount] = useState<number | string>(1);
    const [levels, setLevels] = useState<Tables<'Niveau'>[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<LevelSelection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [materialTypeId, setMaterialTypeId] = useState<string | null>(null); // ID for "Fichier papier"
    const [materialAcronym, setMaterialAcronym] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchLevels();
            ensurePaperMaterial(); // Check/Create "Fichier papier"
            resetForm();
            if (moduleId) {
                fetchNextNumber();
            }
        }
    }, [isOpen, moduleId]);

    const resetForm = () => {
        setBaseName('');
        setStartNumber(1);
        setCount(1);
        setSelectedLevels([]);
        setError(null);
    };

    const fetchLevels = async () => {
        try {
            const data = await activityRepository.getLevels();
            setLevels(data || []);
        } catch (err) {
            console.error('Error fetching levels:', err);
        }
    };

    const fetchNextNumber = async () => {
        try {
            // Use Max Order instead of Count to avoid duplicates if items were deleted
            const maxOrder = await activityRepository.getMaxActivityOrder(moduleId);
            setStartNumber((maxOrder || 0) + 1);
        } catch (err) {
            console.error('Error fetching activity count:', err);
        }
    };

    const handleAddLevel = (id: string) => {
        if (!id) return;
        const levelData = levels.find(l => l.id === id);
        if (levelData && !selectedLevels.some(sl => sl.id === id)) {
            setSelectedLevels([...selectedLevels, {
                id: levelData.id,
                nom: levelData.nom,
                nombre_exercices: 1,
                nombre_erreurs: 1
            }]);
        }
    };

    const handleLevelChange = (index: number, field: keyof LevelSelection, value: any) => {
        const newSelected = [...selectedLevels];
        (newSelected[index] as any)[field] = value;
        setSelectedLevels(newSelected);
    };

    const handleRemoveLevel = (index: number) => {
        setSelectedLevels(selectedLevels.filter((_, i) => i !== index));
    };

    const ensurePaperMaterial = async () => {
        try {
            // Check if exists
            const materials = await activityRepository.getMaterialTypes();
            const existing = materials.find(m => m.nom.toLowerCase() === 'fichier papier');

            if (existing) {
                setMaterialTypeId(existing.id);
                setMaterialAcronym(existing.acronyme || '');
            } else {
                // Create it
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const created = await activityRepository.createMaterialType('Fichier papier', user.id);
                    if (created) {
                        setMaterialTypeId(created.id);
                        setMaterialAcronym(created.acronyme || 'FP');
                    }
                }
            }
        } catch (err) {
            console.error('Error ensuring paper material:', err);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const countNum = typeof count === 'string' ? parseInt(count) : count;
        const startNum = typeof startNumber === 'string' ? parseInt(startNumber) : startNumber;

        if (!baseName.trim() || selectedLevels.length === 0 || countNum < 1) {
            setError("Veuillez remplir tous les champs obligatoires (incluant au moins un niveau).");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté.");

            // 1. Get current max order in this module to append correctly
            const lastOrder = await activityRepository.getMaxActivityOrder(moduleId);

            const activitiesToInsert = [];
            for (let i = 0; i < countNum; i++) {
                const num = startNum + i;
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
            const insertedActivities = await activityRepository.createActivities(activitiesToInsert);

            // 3. Link to Levels in ActiviteNiveau
            if (insertedActivities && insertedActivities.length > 0) {
                const linksToInsert: any[] = [];

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

                await activityRepository.addActivityLevels(linksToInsert);

                // 4. Link "Fichier papier" Material if available
                if (materialTypeId) {
                    const materialLinks = insertedActivities.map(act => ({
                        activite_id: act.id,
                        type_materiel_id: materialTypeId
                    }));

                    await activityRepository.addActivityMaterials(materialLinks);
                }

                // 5. Build enriched activity objects for immediate local state update
                //    (avoids a roundtrip fetch that may race with cascade inserts)
                const enrichedActivities: CreatedActivityData[] = insertedActivities.map(act => ({
                    ...act,
                    ActiviteNiveau: selectedLevels.map(sl => ({
                        activite_id: act.id,
                        niveau_id: sl.id,
                        nombre_exercices: sl.nombre_exercices,
                        nombre_erreurs: sl.nombre_erreurs,
                        statut_exigence: 'obligatoire',
                        Niveau: { nom: sl.nom }
                    })),
                    ActiviteMateriel: materialTypeId
                        ? [{ activite_id: act.id, type_materiel_id: materialTypeId }]
                        : [],
                    Progression: []
                }));

                onAdded(enrichedActivities);
            } else {
                onAdded([]);
            }

            onClose();
        } catch (err: any) {
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
                        onClick={() => handleSubmit()}
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
                                aria-label="Numéro de départ"
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
                                aria-label="Nombre d'activités"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Objectifs par Niveau</h4>
                            <div className="relative">
                                <select
                                    onChange={(e) => { handleAddLevel(e.target.value); e.target.value = ''; }}
                                    className="bg-white/5 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20 rounded-lg py-1.5 px-3 outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-white/10 transition-colors"
                                    value=""
                                    aria-label="Ajouter une activité"
                                >
                                    <option value="" disabled>+ Ajouter une activité</option>
                                    {levels.filter(l => !selectedLevels.some(sl => sl.id === l.id)).map(lv => (
                                        <option key={lv.id} value={lv.id}>{lv.nom}</option>
                                    ))}
                                </select>
                            </div>
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
                                                    aria-label="Nombre d'exercices"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="text-[10px] text-grey-medium uppercase font-bold px-1">Err.</label>
                                                <input
                                                    type="number"
                                                    value={sl.nombre_erreurs}
                                                    onChange={(e) => handleLevelChange(index, 'nombre_erreurs', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                    className="w-14 bg-background/50 border border-white/5 rounded-lg py-1 text-center text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                                    aria-label="Nombre d'erreurs tolérées"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLevel(index)}
                                                className="mt-4 p-1.5 text-grey-medium hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                                title="Retirer ce niveau"
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
