import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GitBranch, Check } from 'lucide-react';
import AddBranchModal from './AddBranchModal';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ui/ImageUpload';

const AddSubBranchModal = ({ isOpen, onClose, onAdded, subBranchToEdit = null }) => {
    const [name, setName] = useState('');
    const [branchId, setBranchId] = useState('');
    const [branches, setBranches] = useState([]);
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingBranches, setFetchingBranches] = useState(false);
    const [error, setError] = useState(null);
    const [showAddBranchModal, setShowAddBranchModal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchBranches();
            if (subBranchToEdit) {
                setName(subBranchToEdit.nom);
                setBranchId(subBranchToEdit.branche_id);
                setPhoto(subBranchToEdit.photo_base64 || null);
            } else {
                setName('');
                setBranchId('');
                setPhoto(null);
            }
            setError(null);
        }
    }, [isOpen, subBranchToEdit]);

    const fetchBranches = async () => {
        setFetchingBranches(true);
        try {
            const { data, error } = await supabase
                .from('Branche')
                .select('id, nom')
                .order('nom');
            if (error) throw error;
            setBranches(data || []);
            // Only defaults if not editing and no branchId yet
            if (data && data.length > 0 && !branchId && !subBranchToEdit) {
                setBranchId(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching branches:', err);
            setError("Impossible de charger les branches.");
        } finally {
            setFetchingBranches(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !branchId) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté.");

            let errorResult;

            let resultData = null;

            if (subBranchToEdit) {
                // UPDATE
                const { data, error } = await supabase
                    .from('SousBranche')
                    .update({
                        nom: name.trim(),
                        branche_id: branchId,
                        photo_base64: photo
                    })
                    .eq('id', subBranchToEdit.id)
                    .select()
                    .single();
                errorResult = error;
                resultData = data;
            } else {
                // INSERT
                const { data, error } = await supabase
                    .from('SousBranche')
                    .insert([{
                        nom: name.trim(),
                        branche_id: branchId,
                        photo_base64: photo,
                        user_id: user.id
                    }])
                    .select()
                    .single();
                errorResult = error;
                resultData = data;
            }

            if (errorResult) throw errorResult;

            onAdded(resultData);
            onClose();
        } catch (err) {
            console.error('Error saving sub-branch:', err);
            setError("Erreur lors de l'enregistrement. Vérifiez votre connexion.");
        } finally {
            setLoading(false);
        }
    };

    const handleBranchChange = (e) => {
        if (e.target.value === 'create_new') {
            setShowAddBranchModal(true);
            // Don't change branchId yet, keep previous or empty
        } else {
            setBranchId(e.target.value);
        }
    };

    const handleBranchAdded = (newBranch) => {
        if (newBranch) {
            setBranches(prev => [...prev, newBranch].sort((a, b) => a.nom.localeCompare(b.nom)));
            setBranchId(newBranch.id);
        } else {
            fetchBranches();
        }
        setShowAddBranchModal(false);
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={subBranchToEdit ? 'Modifier la Sous-Branche' : 'Ajouter une Sous-Branche'}
                icon={<GitBranch size={24} />}
                className="max-w-md"
                footer={
                    <>
                        <Button onClick={onClose} variant="secondary" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={!name.trim() || !branchId}
                            className="flex-1"
                            icon={Check}
                        >
                            {subBranchToEdit ? 'Sauvegarder' : 'Créer la Sous-Branche'}
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
                            <label className="text-sm font-medium text-gray-300">Nom de la Sous-branche</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Algèbre, Géométrie..."
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Branche Parente</label>
                            <select
                                value={branchId}
                                onChange={handleBranchChange}
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                disabled={fetchingBranches}
                            >
                                <option value="" disabled>Sélectionner la branche parente</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.nom}</option>
                                ))}
                                <option value="create_new" className="text-primary font-bold">+ Créer une nouvelle branche</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Logo (Optionnel)</label>
                            <ImageUpload
                                value={photo}
                                onChange={setPhoto}
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Nested Modal for creating a Branch */}
            <AddBranchModal
                isOpen={showAddBranchModal}
                onClose={() => setShowAddBranchModal(false)}
                onAdded={handleBranchAdded}
            />
        </>
    );
};

export default AddSubBranchModal;
