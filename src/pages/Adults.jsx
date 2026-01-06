import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Plus, X, Loader2, Trash2, Search, Edit, Activity, Save, ChevronRight, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const Adults = () => {
    // --- ADULT STATE ---
    const [adults, setAdults] = useState([]);
    const [loadingAdults, setLoadingAdults] = useState(true);
    const [adultSearchTerm, setAdultSearchTerm] = useState('');
    const [showAdultModal, setShowAdultModal] = useState(false);
    const [isEditingAdult, setIsEditingAdult] = useState(false);
    const [currentAdult, setCurrentAdult] = useState({ nom: '', prenom: '', fonction: '' });
    const [adultToDelete, setAdultToDelete] = useState(null);

    // --- ACTIVITY TYPES STATE ---
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [isEditingActivity, setIsEditingActivity] = useState(false);
    const [currentActivity, setCurrentActivity] = useState({ label: '' });
    const [activityToDelete, setActivityToDelete] = useState(null);

    useEffect(() => {
        fetchAdults();
        fetchActivities();
    }, []);

    // --- ADULT LOGIC ---
    const fetchAdults = async () => {
        setLoadingAdults(true);
        try {
            const { data, error } = await supabase
                .from('Adulte')
                .select('*')
                .order('nom');
            if (error) throw error;
            setAdults(data || []);
        } catch (error) {
        } finally {
            setLoadingAdults(false);
        }
    };

    const handleAdultSubmit = async (e) => {
        e.preventDefault();
        setLoadingAdults(true);
        try {
            if (isEditingAdult) {
                const { error } = await supabase
                    .from('Adulte')
                    .update({
                        nom: currentAdult.nom,
                        prenom: currentAdult.prenom,
                        fonction: currentAdult.fonction
                    })
                    .eq('id', currentAdult.id);
                if (error) throw error;
                toast.success("Profil mis à jour");
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                const { error } = await supabase
                    .from('Adulte')
                    .insert([{ ...currentAdult, user_id: user.id }]);
                if (error) throw error;
                toast.success("Adulte ajouté");
            }
            setShowAdultModal(false);
            fetchAdults();
        } catch (error) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setLoadingAdults(false);
        }
    };

    const handleAdultDelete = async () => {
        if (!adultToDelete) return;
        setLoadingAdults(true);
        try {
            const { error } = await supabase.from('Adulte').delete().eq('id', adultToDelete.id);
            if (error) throw error;
            setAdultToDelete(null);
            fetchAdults();
            toast.success("Adulte supprimé");
        } catch (error) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setLoadingAdults(false);
        }
    };

    // --- ACTIVITY LOGIC ---
    const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
            const { data, error } = await supabase
                .from('TypeActiviteAdulte')
                .select('*')
                .order('created_at');

            if (error) throw error;

            if (data && data.length === 0) {
                await seedDefaultActivities();
            } else {
                setActivities(data || []);
            }
        } catch (error) {
        } finally {
            setLoadingActivities(false);
        }
    };

    const seedDefaultActivities = async () => {
        const defaults = [
            "Observation de la classe",
            "Présentation",
            "Accompagnement individualisé",
            "Entretien famille",
            "Autre"
        ];

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const toInsert = defaults.map(label => ({ label, user_id: user.id }));

        const { error } = await supabase
            .from('TypeActiviteAdulte')
            .insert(toInsert);

        if (!error) {
            fetchActivities();
        }
    };

    const handleActivitySubmit = async (e) => {
        e.preventDefault();
        setLoadingActivities(true);
        try {
            if (isEditingActivity) {
                const { error } = await supabase
                    .from('TypeActiviteAdulte')
                    .update({ label: currentActivity.label })
                    .eq('id', currentActivity.id);
                if (error) throw error;
                toast.success("Action mise à jour");
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                const { error } = await supabase
                    .from('TypeActiviteAdulte')
                    .insert([{ label: currentActivity.label, user_id: user.id }]);
                if (error) throw error;
                toast.success("Action ajoutée");
            }
            setShowActivityModal(false);
            fetchActivities();
        } catch (error) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleActivityDelete = async () => {
        if (!activityToDelete) return;
        setLoadingActivities(true);
        try {
            const { error } = await supabase.from('TypeActiviteAdulte').delete().eq('id', activityToDelete.id);
            if (error) throw error;
            setActivityToDelete(null);
            fetchActivities();
            toast.success("Action supprimée");
        } catch (error) {
            toast.error('Erreur: ' + error.message);
        } finally {
            setLoadingActivities(false);
        }
    };

    // --- FILTERING ---
    const filteredAdults = adults.filter(a =>
        a.nom.toLowerCase().includes(adultSearchTerm.toLowerCase()) ||
        a.prenom.toLowerCase().includes(adultSearchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500">

            {/* LEFT PANEL: ADULT LIST */}
            <div className="w-1/3 min-w-[320px] flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <User className="text-primary" size={24} />
                            Adultes
                        </h2>
                        <button
                            onClick={() => {
                                setCurrentAdult({ nom: '', prenom: '', fonction: '' });
                                setIsEditingAdult(false);
                                setShowAdultModal(true);
                            }}
                            className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher un adulte..."
                            value={adultSearchTerm}
                            onChange={(e) => setAdultSearchTerm(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loadingAdults && adults.length === 0 ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                    ) : filteredAdults.length === 0 ? (
                        <div className="text-center py-8 text-grey-dark text-sm italic">Aucun adulte trouvé.</div>
                    ) : (
                        filteredAdults.map(adult => (
                            <div key={adult.id} className="group flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 hover:bg-surface transition-all">
                                <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center text-primary font-bold text-sm shadow-inner shrink-0">
                                    {adult.prenom[0]}{adult.nom[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-text-main truncate">{adult.prenom} {adult.nom}</h3>
                                    <p className="text-[10px] text-grey-medium truncate uppercase tracking-wider">{adult.fonction || 'Personnel'}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setCurrentAdult(adult);
                                            setIsEditingAdult(true);
                                            setShowAdultModal(true);
                                        }}
                                        className="p-1.5 text-grey-medium hover:text-primary transition-colors"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => setAdultToDelete(adult)}
                                        className="p-1.5 text-grey-medium hover:text-danger transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: ACTIVITY TYPES */}
            <div className="flex-1 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <Activity className="text-primary" size={24} />
                            Types d'Actions Adultes
                        </h2>
                        <p className="text-xs text-grey-medium mt-1 font-medium">Configurez les types de suivi disponibles pour les adultes</p>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentActivity({ label: '' });
                            setIsEditingActivity(false);
                            setShowActivityModal(true);
                        }}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all active:scale-95 flex items-center gap-2 border border-primary/20"
                    >
                        <Plus size={18} />
                        Nouveau type
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background/20">
                    {loadingActivities && activities.length === 0 ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activities.map(act => (
                                <div key={act.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all group pointer-events-none">
                                    <div className="flex items-center justify-between pointer-events-auto">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-primary">
                                                <Activity size={16} />
                                            </div>
                                            <span className="font-bold text-sm text-text-main">{act.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setCurrentActivity(act);
                                                    setIsEditingActivity(true);
                                                    setShowActivityModal(true);
                                                }}
                                                className="p-2 text-grey-medium hover:text-primary transition-colors"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => setActivityToDelete(act)}
                                                className="p-2 text-grey-medium hover:text-danger transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ADULT MODAL */}
            {showAdultModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{isEditingAdult ? 'Modifier l\'adulte' : 'Ajouter un adulte'}</h2>
                            <button onClick={() => setShowAdultModal(false)} className="text-grey-medium hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdultSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Prénom</label>
                                <input required type="text" value={currentAdult.prenom} onChange={(e) => setCurrentAdult({ ...currentAdult, prenom: e.target.value })} className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Nom</label>
                                <input required type="text" value={currentAdult.nom} onChange={(e) => setCurrentAdult({ ...currentAdult, nom: e.target.value })} className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Fonction</label>
                                <div className="relative group">
                                    <select
                                        value={currentAdult.fonction}
                                        onChange={(e) => setCurrentAdult({ ...currentAdult, fonction: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-surface">Sélectionner une fonction...</option>
                                        <option value="Titulaire" className="bg-surface">Titulaire</option>
                                        <option value="AESH" className="bg-surface">AESH</option>
                                        <option value="ATSEM" className="bg-surface">ATSEM</option>
                                        <option value="Stagiaire" className="bg-surface">Stagiaire</option>
                                        <option value="Remplaçant" className="bg-surface">Remplaçant</option>
                                        <option value="Autre" className="bg-surface">Autre</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                                {currentAdult.fonction === 'Autre' && (
                                    <input
                                        type="text"
                                        placeholder="Précisez la fonction..."
                                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none mt-2 animate-in slide-in-from-top-1"
                                        onChange={(e) => setCurrentAdult({ ...currentAdult, fonctionAlt: e.target.value })}
                                        onBlur={(e) => {
                                            if (e.target.value) {
                                                setCurrentAdult({ ...currentAdult, fonction: e.target.value });
                                            }
                                        }}
                                    />
                                )}
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAdultModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium">Annuler</button>
                                <button type="submit" disabled={loadingAdults} className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    {loadingAdults ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    {isEditingAdult ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ACTIVITY MODAL */}
            {showActivityModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{isEditingActivity ? 'Modifier le type' : 'Nouvelle action'}</h2>
                            <button onClick={() => setShowActivityModal(false)} className="text-grey-medium hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleActivitySubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Libellé</label>
                                <input required type="text" placeholder="Ex: Observation, Coaching..." value={currentActivity.label} onChange={(e) => setCurrentActivity({ ...currentActivity, label: e.target.value })} className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowActivityModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium">Annuler</button>
                                <button type="submit" disabled={loadingActivities} className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    {loadingActivities ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    {isEditingActivity ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADULT DELETE CONFIRM */}
            {adultToDelete && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer l'adulte ?</h2>
                        <p className="text-sm text-grey-medium mb-6">Voulez-vous vraiment supprimer <span className="text-white font-bold">{adultToDelete.prenom} {adultToDelete.nom}</span> ?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setAdultToDelete(null)} className="flex-1 py-3 bg-white/5 text-grey-light rounded-xl font-medium">Annuler</button>
                            <button onClick={handleAdultDelete} className="flex-1 py-3 bg-danger text-white rounded-xl font-bold">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVITY DELETE CONFIRM */}
            {activityToDelete && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le type ?</h2>
                        <p className="text-sm text-grey-medium mb-6">Voulez-vous vraiment supprimer l'action <span className="text-white font-bold">{activityToDelete.label}</span> ?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setActivityToDelete(null)} className="flex-1 py-3 bg-white/5 text-grey-light rounded-xl font-medium">Annuler</button>
                            <button onClick={handleActivityDelete} className="flex-1 py-3 bg-danger text-white rounded-xl font-bold">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Adults;
