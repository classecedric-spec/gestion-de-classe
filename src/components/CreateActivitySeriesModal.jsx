import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Sparkles, Check } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const CreateActivitySeriesModal = ({ isOpen, onClose, onAdded, moduleId }) => {
    const [baseName, setBaseName] = useState('');
    const [startNumber, setStartNumber] = useState(1);
    const [count, setCount] = useState(1);
    const [niveauId, setNiveauId] = useState('');
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [materialTypeId, setMaterialTypeId] = useState(null); // ID for "Fichier papier"

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
        setNiveauId('');
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

    const ensurePaperMaterial = async () => {
        try {
            // Check if exists
            const { data: existing } = await supabase
                .from('TypeMateriel')
                .select('id')
                .ilike('nom', 'Fichier papier')
                .maybeSingle();

            if (existing) {
                setMaterialTypeId(existing.id);
            } else {
                // Create it
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: created, error } = await supabase
                        .from('TypeMateriel')
                        .insert([{ nom: 'Fichier papier', user_id: user.id }])
                        .select()
                        .single();

                    if (!error && created) {
                        setMaterialTypeId(created.id);
                    }
                }
            }
        } catch (err) {
            console.error("Error ensuring paper material:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!baseName.trim() || !niveauId || count < 1) {
            setError("Veuillez remplir tous les champs obligatoires.");
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
                    nombre_exercices: 1,
                    nombre_erreurs: 0
                });
            }

            // 2. Insert Activities
            const { data: insertedActivities, error: insertError } = await supabase
                .from('Activite')
                .insert(activitiesToInsert)
                .select();

            if (insertError) throw insertError;

            // 3. Link to Level in ActiviteNiveau
            if (insertedActivities && insertedActivities.length > 0) {
                const linksToInsert = insertedActivities.map(act => ({
                    activite_id: act.id,
                    niveau_id: niveauId
                }));

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
            className="max-w-md"
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        disabled={!baseName.trim() || !niveauId}
                        className="flex-1"
                        icon={Check}
                    >
                        Générer la série
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
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
                            <label className="text-sm font-medium text-gray-300">Nb d'exercices</label>
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

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Niveau (lié à la série)</label>
                        <select
                            value={niveauId}
                            onChange={(e) => setNiveauId(e.target.value)}
                            className="w-full px-4 py-2 bg-input border border-border/10 rounded-xl text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        >
                            <option value="">Sélectionner un niveau</option>
                            {levels.map(lv => (
                                <option key={lv.id} value={lv.id}>{lv.nom}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default CreateActivitySeriesModal;
