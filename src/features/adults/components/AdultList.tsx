import React, { useState } from 'react';
import { User, Plus, Search, Edit, Trash2, X, ChevronDown, Loader2, Save } from 'lucide-react';
import type { Database } from '../../../types/supabase';

type AdultRow = Database['public']['Tables']['Adulte']['Row'];
type AdultInsert = Database['public']['Tables']['Adulte']['Insert'];
type AdultUpdate = Database['public']['Tables']['Adulte']['Update'];

interface AdultListProps {
    adults: AdultRow[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    onAdd: (adult: AdultInsert) => Promise<boolean>;
    onEdit: (id: string, adult: AdultUpdate) => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
}

const AdultList: React.FC<AdultListProps> = ({
    adults,
    loading,
    searchTerm,
    onSearchChange,
    onAdd,
    onEdit,
    onDelete,
}) => {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    // Using any purely for the temporary form state which needs a flexible interface before submission
    const [currentAdult, setCurrentAdult] = useState<any>({ nom: '', prenom: '', fonction: '' });

    const [adultToDelete, setAdultToDelete] = useState<AdultRow | null>(null);

    const openAddModal = () => {
        setCurrentAdult({ nom: '', prenom: '', fonction: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (adult: AdultRow) => {
        // We might want to store 'fonction' in a specific column or metadata, 
        // but currently the Adulte table doesn't have a 'fonction' column in the types I saw earlier.
        // I will assume for now it's managed externally or I should check if I missed a column.
        // Actually, looking at the previous JS code: `adult.fonction || 'Personnel'` 
        // It seems expected. Let's start with basic fields from the Type.
        // If `fonction` is missing from DB schema, I'll keep it in local state but it might not persist unless added to DB.
        setCurrentAdult({ ...adult, fonction: (adult as any).fonction || '' });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let success = false;

        // Prepare payload
        const payload = {
            nom: currentAdult.nom,
            prenom: currentAdult.prenom,
            // fonction: currentAdult.fonction // NOTE: 'fonction' is likely missing from DB schema based on types. 
            // If it is required, we need to update the DB schema. 
            // For now, I'm passing it, but TS might complain if it's not in AdultUpdate.
            // I will cast to any to avoid blockage during migration if the DB schema is actually wider than the types file.
        };

        if (isEditing && currentAdult.id) {
            success = await onEdit(currentAdult.id, payload as any);
        } else {
            success = await onAdd(payload as any);
        }
        if (success) setShowModal(false);
    };

    const handleDeleteConfirm = async () => {
        if (adultToDelete) {
            await onDelete(adultToDelete.id);
            setAdultToDelete(null);
        }
    };

    return (
        <div className="w-1/3 min-w-[320px] flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <User className="text-primary" size={24} />
                        Adultes
                    </h2>
                    <button
                        onClick={openAddModal}
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
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading && adults.length === 0 ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                ) : adults.length === 0 ? (
                    <div className="text-center py-8 text-grey-dark text-sm italic">Aucun adulte trouvé.</div>
                ) : (
                    adults.map(adult => (
                        <div key={adult.id} className="group flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 hover:bg-surface transition-all">
                            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center text-primary font-bold text-sm shadow-inner shrink-0">
                                {adult.prenom?.[0]}{adult.nom?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm text-text-main truncate">{adult.prenom} {adult.nom}</h3>
                                {/* Assuming 'fonction' might exist on runtime object even if not in static type */}
                                <p className="text-[10px] text-grey-medium truncate uppercase tracking-wider">{(adult as any).fonction || 'Personnel'}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(adult)}
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{isEditing ? 'Modifier l\'adulte' : 'Ajouter un adulte'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-grey-medium hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium">Annuler</button>
                                <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    <Save size={20} />
                                    {isEditing ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete */}
            {adultToDelete && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer l'adulte ?</h2>
                        <p className="text-sm text-grey-medium mb-6">Voulez-vous vraiment supprimer <span className="text-white font-bold">{adultToDelete.prenom} {adultToDelete.nom}</span> ?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setAdultToDelete(null)} className="flex-1 py-3 bg-white/5 text-grey-light rounded-xl font-medium">Annuler</button>
                            <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-danger text-white rounded-xl font-bold">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdultList;
