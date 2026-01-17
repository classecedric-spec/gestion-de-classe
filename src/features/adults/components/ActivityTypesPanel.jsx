import React, { useState } from 'react';
import { Activity, Plus, Edit, Trash2, X, Loader2, Save } from 'lucide-react';

const ActivityTypesPanel = ({
    activityTypes,
    loading,
    onAdd,
    onEdit,
    onDelete
}) => {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentActivity, setCurrentActivity] = useState({ label: '' });
    const [activityToDelete, setActivityToDelete] = useState(null);

    const openAddModal = () => {
        setCurrentActivity({ label: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (act) => {
        setCurrentActivity(act);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let success = false;
        if (isEditing) {
            success = await onEdit(currentActivity.id, currentActivity.label);
        } else {
            success = await onAdd(currentActivity.label);
        }
        if (success) setShowModal(false);
    };

    const handleDeleteConfirm = async () => {
        if (activityToDelete) {
            await onDelete(activityToDelete.id);
            setActivityToDelete(null);
        }
    };

    return (
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
                    onClick={openAddModal}
                    className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all active:scale-95 flex items-center gap-2 border border-primary/20"
                >
                    <Plus size={18} />
                    Nouveau type
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background/20">
                {loading && activityTypes.length === 0 ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activityTypes.map(act => (
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
                                            onClick={() => openEditModal(act)}
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">{isEditing ? 'Modifier le type' : 'Nouvelle action'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-grey-medium hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Libellé</label>
                                <input required type="text" placeholder="Ex: Observation, Coaching..." value={currentActivity.label} onChange={(e) => setCurrentActivity({ ...currentActivity, label: e.target.value })} className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none" />
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
            {activityToDelete && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le type ?</h2>
                        <p className="text-sm text-grey-medium mb-6">Voulez-vous vraiment supprimer l'action <span className="text-white font-bold">{activityToDelete.label}</span> ?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setActivityToDelete(null)} className="flex-1 py-3 bg-white/5 text-grey-light rounded-xl font-medium">Annuler</button>
                            <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-danger text-white rounded-xl font-bold">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityTypesPanel;
