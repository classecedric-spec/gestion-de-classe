import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Plus, X, Loader2, Trash2, Search, Edit, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const Adults = () => {
    const [adults, setAdults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAdult, setCurrentAdult] = useState({ nom: '', prenom: '', fonction: '' });
    const [adultToDelete, setAdultToDelete] = useState(null);

    useEffect(() => {
        fetchAdults();
    }, []);

    const fetchAdults = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Adulte')
                .select('*')
                .order('nom');
            if (error) throw error;
            setAdults(data || []);
        } catch (error) {
            console.error('Error fetching adults:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('Adulte')
                    .update({
                        nom: currentAdult.nom,
                        prenom: currentAdult.prenom,
                        fonction: currentAdult.fonction
                    })
                    .eq('id', currentAdult.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('Adulte')
                    .insert([currentAdult]);
                if (error) throw error;
            }
            setShowModal(false);
            fetchAdults();
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!adultToDelete) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('Adulte').delete().eq('id', adultToDelete.id);
            if (error) throw error;
            setAdultToDelete(null);
            fetchAdults();
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (adult) => {
        setCurrentAdult(adult);
        setIsEditing(true);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setCurrentAdult({ nom: '', prenom: '', fonction: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    const filteredAdults = adults.filter(a =>
        a.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.prenom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between bg-surface/30 p-6 rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <User size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-main">Gestion des Adultes</h2>
                        <p className="text-grey-medium text-sm">Enseignants, intervenants et personnel</p>
                    </div>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-6 py-2.5 bg-primary text-text-dark rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Ajouter un adulte
                </button>
            </div>

            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col">
                <div className="p-4 border-b border-white/5 bg-surface/20">
                    <div className="relative group max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un adulte..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading && adults.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : filteredAdults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-grey-medium opacity-50 space-y-4">
                            <User size={48} />
                            <p>Aucun adulte trouvé</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredAdults.map(adult => (
                                <div key={adult.id} className="p-4 bg-surface/50 rounded-xl border border-white/5 hover:border-primary/30 transition-all group relative">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center text-primary font-bold text-lg">
                                            {adult.prenom[0]}{adult.nom[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-text-main truncate">{adult.prenom} {adult.nom}</h3>
                                            <p className="text-xs text-grey-medium truncate uppercase tracking-wider">{adult.fonction || 'Personnel'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEditModal(adult)}
                                            className="p-2 hover:bg-white/5 rounded-lg text-grey-medium hover:text-primary transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => setAdultToDelete(adult)}
                                            className="p-2 hover:bg-white/5 rounded-lg text-grey-medium hover:text-danger transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{isEditing ? 'Modifier l\'adulte' : 'Ajouter un adulte'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-grey-medium hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1">Prénom</label>
                                <input
                                    required
                                    type="text"
                                    value={currentAdult.prenom}
                                    onChange={(e) => setCurrentAdult({ ...currentAdult, prenom: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1">Nom</label>
                                <input
                                    required
                                    type="text"
                                    value={currentAdult.nom}
                                    onChange={(e) => setCurrentAdult({ ...currentAdult, nom: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1">Fonction (ex: Titulaire, Intervenant...)</label>
                                <input
                                    type="text"
                                    value={currentAdult.fonction}
                                    onChange={(e) => setCurrentAdult({ ...currentAdult, fonction: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Mettre à jour' : 'Créer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Conf */}
            {adultToDelete && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Voulez-vous vraiment supprimer <span className="text-white font-bold">{adultToDelete.prenom} {adultToDelete.nom}</span> ?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setAdultToDelete(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl">Annuler</button>
                            <button onClick={handleDelete} className="flex-1 py-3 bg-danger text-white rounded-xl font-bold">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Adults;
