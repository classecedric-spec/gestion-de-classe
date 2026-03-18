import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import Card from '../../../core/Card';
import Button from '../../../core/Button';
import Input from '../../../core/Input';
import { useGrades } from '../hooks/useGrades';
import { Tables } from '../../../types/supabase';
import { useAuth } from '../../../hooks/useAuth';

const GradeSettings: React.FC = () => {
    const { noteTypes, saveNoteType, deleteNoteType } = useGrades();
    const { session } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nom: '',
        systeme: 'numerique', 
        config: {} as any
    });

    const handleSave = async () => {
        if (!session?.user) return;
        
        // Ensure config has at least an empty paliers array for conversion
        const finalConfig = { ...formData.config };
        if (formData.systeme === 'conversion' && !finalConfig.paliers) {
            finalConfig.paliers = [];
        }

        await saveNoteType({
            ...formData,
            config: finalConfig,
            id: editingId || undefined,
            user_id: session.user.id
        });
        resetForm();
    };

    const resetForm = () => {
        setFormData({ nom: '', systeme: 'numerique', config: { max: 20 } });
        setIsAdding(false);
        setEditingId(null);
    };

    const startEdit = (type: Tables<'TypeNote'>) => {
        setFormData({
            nom: type.nom,
            systeme: (type.systeme as any) || 'numerique', // Cast to any to handle potential DB values
            config: type.config || {}
        });
        setEditingId(type.id);
        setIsAdding(true);
    };

    const addPalier = () => {
        const paliers = [...(formData.config.paliers || [])];
        paliers.push({ letter: '', minPercent: 0, maxPercent: 0 });
        setFormData({
            ...formData,
            config: { ...formData.config, paliers }
        });
    };

    const removePalier = (index: number) => {
        const paliers = [...(formData.config.paliers || [])];
        paliers.splice(index, 1);
        setFormData({
            ...formData,
            config: { ...formData.config, paliers }
        });
    };

    const updatePalier = (index: number, field: 'letter' | 'minPercent' | 'maxPercent', value: any) => {
        const paliers = [...(formData.config.paliers || [])];
        paliers[index] = { 
            ...paliers[index], 
            [field]: (field === 'minPercent' || field === 'maxPercent') ? parseFloat(value) : value 
        };
        setFormData({
            ...formData,
            config: { ...formData.config, paliers }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-text-main">Systèmes de Notation</h2>
                    <p className="text-sm text-grey-medium">Configurez vos barèmes personnalisés (Numérique ou Conversion en lettres)</p>
                </div>
                {!isAdding && (
                    <Button 
                        icon={Plus} 
                        onClick={() => setIsAdding(true)}
                        variant="primary"
                    >
                        Nouveau système
                    </Button>
                )}
            </div>

            {isAdding && (
                <Card className="p-6 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-text-main flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                                <Settings size={16} />
                            </div>
                            {editingId ? 'Modifier le système' : 'Nouveau système de notation'}
                        </h3>
                        <button onClick={resetForm} className="text-grey-medium hover:text-text-main transition-colors" title="Fermer">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input 
                                label="Nom du barème" 
                                placeholder="ex: Points (sur 20), Conversion CED..." 
                                value={formData.nom}
                                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                            />
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-grey-medium uppercase tracking-wider">Type de système</label>
                                <div className="flex bg-input rounded-xl p-1 gap-1 border border-white/5">
                                    <button
                                        onClick={() => setFormData({...formData, systeme: 'numerique'})}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${formData.systeme === 'numerique' ? 'bg-primary text-white shadow-lg' : 'text-grey-medium hover:text-grey-dark'}`}
                                    >
                                        Numérique
                                    </button>
                                    <button
                                        onClick={() => setFormData({...formData, systeme: 'conversion'})}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${formData.systeme === 'conversion' ? 'bg-primary text-white shadow-lg' : 'text-grey-medium hover:text-grey-dark'}`}
                                    >
                                        Conversion
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <Input 
                                label="Note Maximale par Défaut" 
                                type="number"
                                placeholder="10, 20, 100..." 
                                value={formData.config.max || ''}
                                onChange={(e) => setFormData({
                                    ...formData, 
                                    config: { ...formData.config, max: parseFloat(e.target.value) }
                                })}
                            />
                            <div className="text-xs text-grey-medium flex items-center italic">
                                Cette valeur sera proposée automatiquement lors de la création d'une évaluation avec ce barème.
                            </div>
                        </div>

                        {formData.systeme === 'conversion' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-text-main uppercase tracking-widest">Grille de Conversion</h4>
                                    <Button size="sm" variant="ghost" icon={Plus} onClick={addPalier} className="text-primary hover:bg-primary/10">
                                        Ajouter un palier
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {(formData.config.paliers || []).map((palier: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-input/50 rounded-xl border border-white/5 group animate-in zoom-in-95 duration-200">
                                            <div className="w-1/4">
                                                <input 
                                                    placeholder="Lettre (ex: A, TB)" 
                                                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-text-main px-2"
                                                    value={palier.letter}
                                                    onChange={(e) => updatePalier(idx, 'letter', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 w-1/4">
                                                <span className="text-grey-medium font-bold text-[10px]">[</span>
                                                <input 
                                                    type="number"
                                                    placeholder="Min" 
                                                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-primary text-right"
                                                    value={palier.minPercent}
                                                    onChange={(e) => updatePalier(idx, 'minPercent', e.target.value)}
                                                />
                                                <span className="text-grey-medium text-[10px]">%</span>
                                            </div>
                                            <div className="flex items-center gap-1 w-1/4">
                                                <span className="text-grey-medium text-[10px]">..</span>
                                                <input 
                                                    type="number"
                                                    placeholder="Max" 
                                                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-primary text-right"
                                                    value={palier.maxPercent}
                                                    onChange={(e) => updatePalier(idx, 'maxPercent', e.target.value)}
                                                />
                                                <span className="text-grey-medium text-[10px]">%</span>
                                                <span className="text-grey-medium font-bold text-[10px]">[</span>
                                            </div>
                                            <div className="flex-1 flex justify-end">
                                                <button 
                                                    onClick={() => removePalier(idx)} 
                                                    className="p-1.5 text-danger/40 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Supprimer ce palier"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(formData.config.paliers || []).length === 0 && (
                                        <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl text-grey-medium text-sm">
                                            Aucun palier défini. Cliquez sur "Ajouter un palier" pour commencer.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/5">
                        <Button variant="ghost" onClick={resetForm}>Annuler</Button>
                        <Button variant="primary" icon={Save} onClick={handleSave} disabled={!formData.nom || !formData.config.max}>
                            Enregistrer le barème
                        </Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {noteTypes.map((type) => (
                    <Card key={type.id} className="p-4 flex justify-between items-center group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 shadow-inner
                                ${type.systeme === 'conversion' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}
                            `}>
                                <Settings size={22} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-text-main leading-none">{type.nom}</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-grey-medium border border-white/10 uppercase font-black tracking-wider">
                                        {type.systeme === 'conversion' ? 'Conversion en Lettres' : 'Numérique'}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-primary border border-primary/20 uppercase font-black tracking-wider">
                                        Sur {(type.config as any)?.max || '?'}
                                    </span>
                                    {type.systeme === 'conversion' && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-black tracking-wider">
                                            {(type.config as any)?.paliers?.length || 0} paliers
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button 
                                variant="ghost" 
                                icon={Edit2} 
                                onClick={() => startEdit(type)} 
                                size="sm" 
                                className="hover:bg-primary/10 hover:text-primary" 
                                title="Modifier"
                            />
                            <Button 
                                variant="ghost" 
                                icon={Trash2} 
                                onClick={() => deleteNoteType(type.id)} 
                                size="sm" 
                                className="text-danger/60 hover:text-danger hover:bg-danger/10"
                                title="Supprimer"
                            />
                        </div>
                    </Card>
                ))}
            </div>

            {noteTypes.length === 0 && !isAdding && (
                <Card className="p-16 flex flex-col items-center justify-center text-center bg-input/10 border-dashed border-2 text-grey-medium">
                    <Settings size={40} className="mb-4 opacity-20" />
                    <h3 className="text-lg font-bold text-text-main mb-2">Aucun système de notation</h3>
                    <p className="text-sm max-w-sm mb-8">
                        Configurez vos barèmes numériques ou de conversion pour vos évaluations.
                    </p>
                    <Button 
                        icon={Plus} 
                        onClick={() => setIsAdding(true)} 
                        variant="primary"
                    >
                        Créer un barème
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default GradeSettings;
