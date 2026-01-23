import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/database';
import { ModuleWithDetails, WeeklyPlanningItem } from './useWeeklyPlanner';
import { Tables } from '../../types/supabase';
import { SupabaseActivityRepository } from '../../features/activities/repositories/SupabaseActivityRepository';

interface PreparationModalProps {
    isOpen: boolean;
    onClose: () => void;
    modules: ModuleWithDetails[];
    dockedItems: WeeklyPlanningItem[];
    onToggleDock: (module: { nom: string; isCustom?: boolean }, isCurrentlyDocked: boolean) => void;
    currentWeekDate: string;
}

const activityRepository = new SupabaseActivityRepository();

/**
 * PreparationModal - Modal pour préparer le dock
 */
const PreparationModal: React.FC<PreparationModalProps> = ({ isOpen, onClose, modules, dockedItems, onToggleDock, currentWeekDate }) => {
    const [activeTab, setActiveTab] = useState<'modules' | 'custom'>('modules');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('en_cours');
    const [customText, setCustomText] = useState('');
    const [savedCustom, setSavedCustom] = useState<Tables<'custom_activities'>[]>([]);
    const [customSearch, setCustomSearch] = useState('');
    const [showAddInput, setShowAddInput] = useState(false);

    useEffect(() => {
        if (isOpen) fetchSavedCustom();
    }, [isOpen]);

    const fetchSavedCustom = async () => {
        try {
            const data = await activityRepository.getCustomActivities();
            setSavedCustom(data);
        } catch (error) {
            console.error('Error fetching custom activities:', error);
        }
    };

    const filteredModules = modules.filter(m => {
        const matchesSearch = m.nom.toLowerCase().includes(search.toLowerCase());
        if (search.length > 0) return matchesSearch;
        const matchesFilter = filter === 'all' || (m.statut === filter);
        return matchesFilter;
    });

    const filteredCustom = savedCustom.filter(s => s.title.toLowerCase().includes(customSearch.toLowerCase()));

    const handleAddCustom = async (textToUse: string | null = null) => {
        const text = textToUse || customText;
        if (!text.trim()) return;

        onToggleDock({ nom: text, isCustom: true }, false);

        if (!textToUse) {
            setCustomText('');
            if (!savedCustom.some(s => s.title.toLowerCase() === text.toLowerCase())) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const newActivity = await activityRepository.createCustomActivity(text, user.id);
                        if (newActivity) setSavedCustom(prev => [newActivity, ...prev]);
                    }
                } catch (error) {
                    console.error('Error creating custom activity:', error);
                }
            }
        }
    };

    const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await activityRepository.deleteCustomActivity(id);
            setSavedCustom(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting custom activity:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
                <div>
                    <h3 className="text-xl font-black text-text-main uppercase flex items-center gap-3">
                        <Briefcase className="text-primary" /> Préparation du DOCK
                    </h3>
                    <p className="text-grey-medium text-sm mt-1">Sélectionnez les modules ou créez vos activités.</p>
                </div>
                <button onClick={onClose} className="px-6 py-2 bg-text-main text-background font-bold rounded-lg hover:bg-grey-light transition-colors">
                    Terminer
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 flex gap-4 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('modules')}
                    className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'modules' ? 'text-primary border-primary' : 'text-grey-medium border-transparent hover:text-text-main'}`}
                >
                    Modules Existants
                </button>
                <button
                    onClick={() => setActiveTab('custom')}
                    className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'custom' ? 'text-primary border-primary' : 'text-grey-medium border-transparent hover:text-text-main'}`}
                >
                    Activités Perso
                </button>
            </div>

            {/* Content: Modules */}
            {activeTab === 'modules' && (
                <>
                    <div className="p-4 border-b border-border bg-surface/50">
                        <div className="max-w-4xl mx-auto flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un module..."
                                    className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-input p-1 rounded-xl gap-1">
                                {['en_cours', 'en_preparation', 'archive', 'all'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filter === f ? 'bg-primary text-white' : 'text-grey-medium hover:text-text-main'}`}
                                    >
                                        {f === 'en_cours' ? 'En cours' : f === 'en_preparation' ? 'Prepa' : f === 'archive' ? 'Archivé' : 'Tout'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredModules.map(module => {
                                const isDocked = dockedItems.some(item => item.activity_title === module.nom);
                                return (
                                    <div
                                        key={module.id}
                                        onClick={() => onToggleDock(module, isDocked)}
                                        className={`p-[5px] rounded-xl border cursor-pointer transition-all flex items-center justify-start text-left group h-[2.5rem] ${isDocked ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-surface hover:bg-input border-border'}`}
                                    >
                                        <span className={`font-bold text-xs line-clamp-2 leading-tight px-1 ${isDocked ? 'text-white' : 'text-text-main'}`}>{module.nom}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Content: Custom */}
            {activeTab === 'custom' && (
                <>
                    <div className="p-4 border-b border-border bg-surface/50">
                        <div className="max-w-4xl mx-auto flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher une activité perso..."
                                    className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary"
                                    value={customSearch}
                                    onChange={e => setCustomSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-4xl mx-auto flex flex-col gap-6">
                            {savedCustom.length > 0 ? (
                                <div>
                                    <h4 className="text-xs font-bold text-grey-medium uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Briefcase size={12} /> Activités Mémorisées
                                    </h4>
                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {filteredCustom.map(saved => {
                                            const isDocked = dockedItems.some(item => item.activity_title === saved.title);
                                            return (
                                                <div
                                                    key={saved.id}
                                                    onClick={() => onToggleDock({ nom: saved.title, isCustom: true }, isDocked)}
                                                    className={`group relative border rounded-xl p-[5px] cursor-pointer transition-all active:scale-95 flex items-center justify-between h-[2.5rem] ${isDocked ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-surface hover:bg-input border-border'}`}
                                                >
                                                    <span className={`font-bold text-xs line-clamp-2 leading-tight ${isDocked ? 'text-white' : 'text-text-main'}`}>{saved.title}</span>
                                                    <button
                                                        onClick={(e) => handleDeleteSaved(saved.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/20 hover:text-danger text-grey-medium rounded-md transition-all ml-1"
                                                        title="Supprimer définitivement"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-b border-border mb-4">
                                    <p className="text-grey-medium text-sm">Aucune activité mémorisée pour l'instant.</p>
                                </div>
                            )}

                            {!showAddInput ? (
                                <div className="flex justify-center py-4">
                                    <button
                                        onClick={() => setShowAddInput(true)}
                                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 group"
                                    >
                                        <Plus size={16} className="group-hover:scale-110 transition-transform" />
                                        Ajouter une activité
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-4 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <label className="text-sm font-bold text-grey-medium uppercase tracking-wide">Nouvelle activité</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Ex: Échecs, Réunion..."
                                            className="w-full bg-input border border-border rounded-xl px-4 py-3 text-lg text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                            value={customText}
                                            onChange={e => setCustomText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddCustom(null);
                                                    setShowAddInput(false);
                                                }
                                            }}
                                            onBlur={() => !customText && setShowAddInput(false)}
                                        />
                                        <button
                                            onClick={() => { handleAddCustom(null); setShowAddInput(false); }}
                                            disabled={!customText.trim()}
                                            className="px-6 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            title="Ajouter l'activité"
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-grey-medium text-xs">Sera ajoutée au DOC et mémorisée.</p>
                                        <button onClick={() => setShowAddInput(false)} className="text-xs text-grey-medium hover:text-text-main underline">Annuler</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PreparationModal;
