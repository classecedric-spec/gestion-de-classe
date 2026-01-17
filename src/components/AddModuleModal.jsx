import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Plus, Box, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { branchService } from '../features/branches/services/branchService';
import AddBranchModal from '../features/branches/components/AddBranchModal';
import AddSubBranchModal from '../features/branches/components/AddSubBranchModal';
import Modal from './ui/Modal';
import Button from './ui/Button';

const AddModuleModal = ({ isOpen, onClose, onAdded, moduleToEdit }) => {
    const [name, setName] = useState('');
    const [endDate, setEndDate] = useState('');
    const [branchId, setBranchId] = useState('');
    const [subBranchId, setSubBranchId] = useState('');
    const [status, setStatus] = useState('en_preparation');
    const [branches, setBranches] = useState([]);
    const [subBranches, setSubBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddBranchModal, setShowAddBranchModal] = useState(false);
    const [showAddSubBranchModal, setShowAddSubBranchModal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchBranches();
            if (moduleToEdit) {
                setName(moduleToEdit.nom);
                setStatus(moduleToEdit.statut || 'en_preparation');
                setEndDate(moduleToEdit.date_fin || '');
                if (moduleToEdit.SousBranche) {
                    setSubBranchId(moduleToEdit.sous_branche_id);
                    if (moduleToEdit.SousBranche.branche_id) {
                        setBranchId(moduleToEdit.SousBranche.branche_id);
                        fetchSubBranches(moduleToEdit.SousBranche.branche_id);
                    }
                }
            } else {
                setName('');
                setStatus('en_preparation');
                setEndDate('');
                setBranchId('');
                setSubBranchId('');
                setSubBranches([]);
            }
            setError(null);
        }
    }, [isOpen, moduleToEdit]);

    const fetchBranches = async () => {
        try {
            const { data, error } = await supabase.from('Branche').select('id, nom').order('nom');
            if (error) throw error;
            setBranches(data || []);
        } catch (err) {
            // ignore error
        }
    };

    const fetchSubBranches = async (bId) => {
        try {
            const { data, error } = await supabase.from('SousBranche').select('id, nom').eq('branche_id', bId).order('nom');
            if (error) throw error;
            setSubBranches(data || []);
        } catch (err) {
            // ignore error
        }
    };

    // Calculate the next 3 relevant Fridays
    const getFridayShortcuts = () => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 5 = Friday

        let daysUntilNextFriday = 5 - currentDay;
        if (daysUntilNextFriday < 0) {
            daysUntilNextFriday += 7;
        }

        const f1 = new Date(today);
        f1.setDate(today.getDate() + daysUntilNextFriday);

        const f2 = new Date(f1);
        f2.setDate(f1.getDate() + 7);

        const f3 = new Date(f2);
        f3.setDate(f2.getDate() + 7);

        return [f1, f2, f3];
    };

    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    const formatDateLabel = (date) => {
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const handleDateShortcut = (date) => {
        setEndDate(formatDateForInput(date));
    };

    const fridayShortcuts = getFridayShortcuts();

    const handleBranchChange = (e) => {
        const val = e.target.value;
        if (val === 'create_new') {
            setShowAddBranchModal(true);
        } else {
            setBranchId(val);
            setSubBranchId('');
            if (val) fetchSubBranches(val);
            else setSubBranches([]);
        }
    };

    const handleSubBranchChange = (e) => {
        const val = e.target.value;
        if (val === 'create_new') {
            setShowAddSubBranchModal(true);
        } else {
            setSubBranchId(val);
        }
    };

    const handleBranchSubmit = async (branchData) => {
        try {
            const newBranch = await branchService.createBranch(branchData);
            if (newBranch) {
                setBranches(prev => [...prev, newBranch].sort((a, b) => a.nom.localeCompare(b.nom)));
                setBranchId(newBranch.id);
                setSubBranchId('');
                setSubBranches([]);
            }
        } catch (error) {
            console.error("Error creating branch:", error);
            throw error;
        }
    };

    const handleSubBranchSubmit = async (subBranchData) => {
        try {
            const newSubBranch = await branchService.createSubBranch(subBranchData);
            if (newSubBranch) {
                setBranchId(newSubBranch.branche_id);

                const data = await branchService.fetchSubBranches(newSubBranch.branche_id);
                setSubBranches(data || []);
                setSubBranchId(newSubBranch.id);
            }
        } catch (error) {
            console.error("Error creating sub-branch:", error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !subBranchId) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté.");

            const moduleData = {
                nom: name.trim(),
                sous_branche_id: subBranchId,
                statut: status,
                date_fin: endDate || null
            };

            let savedModule;
            const selectQuery = `
                *,
                SousBranche (
                    id, nom, branche_id,
                    Branche (id, nom)
                )
            `;

            if (moduleToEdit) {
                const { data, error: updateError } = await supabase
                    .from('Module')
                    .update(moduleData)
                    .eq('id', moduleToEdit.id)
                    .select(selectQuery)
                    .single();
                if (updateError) throw updateError;
                savedModule = data;
            } else {
                const { data, error: insertError } = await supabase
                    .from('Module')
                    .insert([{
                        ...moduleData,
                        user_id: user.id
                    }])
                    .select(selectQuery)
                    .single();
                if (insertError) throw insertError;
                savedModule = data;
            }

            onAdded(savedModule);
            onClose();
        } catch (err) {
            setError(err.message || "Erreur lors de l'enregistrement.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={moduleToEdit ? 'Modifier le Module' : 'Ajouter un Module'}
                icon={<Box size={24} />}
                className="max-w-md"
                footer={
                    <>
                        <Button onClick={onClose} variant="secondary" className="flex-1">
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={!name.trim() || !subBranchId}
                            className="flex-1"
                            icon={moduleToEdit ? null : Plus}
                        >
                            {moduleToEdit ? 'Enregistrer' : 'Ajouter le Module'}
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
                            <label htmlFor="module_name" className="text-sm font-medium text-gray-300">Nom du Module</label>
                            <input
                                id="module_name"
                                name="module_name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Algèbre Linéaire..."
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="branche_select" className="text-sm font-medium text-gray-300">Branche</label>
                            <select
                                id="branche_select"
                                name="branche"
                                value={branchId}
                                onChange={handleBranchChange}
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            >
                                <option value="">Sélectionner une branche</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.nom}</option>
                                ))}
                                <option value="create_new" className="text-primary font-bold">+ Créer une nouvelle branche</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="sub_branche_select" className="text-sm font-medium text-gray-300">Sous-branche</label>
                            <select
                                id="sub_branche_select"
                                name="sub_branche"
                                value={subBranchId}
                                onChange={handleSubBranchChange}
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                disabled={!branchId}
                            >
                                <option value="">Sélectionner une sous-branche</option>
                                {subBranches.map(sb => (
                                    <option key={sb.id} value={sb.id}>{sb.nom}</option>
                                ))}
                                <option value="create_new" className="text-primary font-bold">+ Créer une nouvelle sous-branche</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="end_date" className="text-sm font-medium text-gray-300">Date de fin (objectif)</label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input
                                        id="end_date"
                                        name="end_date"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        onClick={(e) => { try { e.target.showPicker(); } catch { } }}
                                        onFocus={(e) => { try { e.target.showPicker(); } catch { } }}
                                        className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {fridayShortcuts.map((friday, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleDateShortcut(friday)}
                                            className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors truncate"
                                            title={formatDateForInput(friday)}
                                        >
                                            Ven. {formatDateLabel(friday)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Statut du module</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'en_cours', label: 'En cours', activeClass: 'bg-success border-success text-white' },
                                    { value: 'archive', label: 'Archive', activeClass: 'bg-danger border-danger text-white' },
                                    { value: 'en_preparation', label: 'En préparation', activeClass: 'bg-primary border-primary text-[#1e1e1e]' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setStatus(option.value)}
                                        className={clsx(
                                            "flex-1 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all",
                                            status === option.value
                                                ? option.activeClass
                                                : "bg-black/20 text-gray-400 border-white/10 hover:border-white/30"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Nested Modal: Add Branch */}
            <AddBranchModal
                isOpen={showAddBranchModal}
                onClose={() => setShowAddBranchModal(false)}
                onSubmit={handleBranchSubmit}
            />

            {/* Nested Modal: Add SubBranch */}
            <AddSubBranchModal
                isOpen={showAddSubBranchModal}
                onClose={() => setShowAddSubBranchModal(false)}
                onSubmit={handleSubBranchSubmit}
                branches={branches}
            />
        </>
    );
};

export default AddModuleModal;
