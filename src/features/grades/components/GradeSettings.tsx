import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import Card from '../../../core/Card';
import Button from '../../../core/Button';
import Input from '../../../core/Input';
import Select from '../../../core/Select';
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
        systeme: 'numerique', // 'numerique', 'lettre', 'conversion'
        config: {} as any
    });

    const handleSave = async () => {
        if (!session?.user) return;
        await saveNoteType({
            ...formData,
            id: editingId || undefined,
            user_id: session.user.id
        });
        resetForm();
    };

    const resetForm = () => {
        setFormData({ nom: '', systeme: 'numerique', config: {} });
        setIsAdding(false);
        setEditingId(null);
    };

    const startEdit = (type: Tables<'TypeNote'>) => {
        setFormData({
            nom: type.nom,
            systeme: type.systeme,
            config: type.config || {}
        });
        setEditingId(type.id);
        setIsAdding(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-text-main">Systèmes de Notation</h2>
                    <p className="text-sm text-grey-medium">Configurez vos barèmes personnalisés (Points, Lettres, Compétences)</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Input 
                            label="Nom du système" 
                            placeholder="ex: Points (sur 20), ABCD, Compétences..." 
                            value={formData.nom}
                            onChange={(e) => setFormData({...formData, nom: e.target.value})}
                        />
                        <Select 
                            label="Type de barème"
                            value={formData.systeme}
                            onChange={(e) => setFormData({...formData, systeme: e.target.value})}
                            options={[
                                { value: 'numerique', label: 'Points Numériques (0-20, 0-10...)' },
                                { value: 'lettre', label: 'Lettres (A, B, C...)' },
                                { value: 'conversion', label: 'Tableau de conversion (Competences)' }
                            ]}
                        />
                    </div>
                    
                    {/* Config editor placeholder */}
                    {formData.systeme !== 'numerique' && (
                        <div className="mb-6 bg-input/50 border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center gap-3 text-grey-medium mb-4">
                                <div className="p-2 rounded-full bg-white/5">
                                    <Settings size={18} className="animate-pulse" />
                                </div>
                                <p className="text-sm italic">
                                    L'éditeur visuel de barèmes (A, B, C...) sera disponible dans une prochaine mise à jour. 
                                    Pour l'instant, seuls les titres des systèmes sont enregistrés.
                                </p>
                            </div>
                            <div className="h-24 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center">
                                <span className="text-xs uppercase tracking-widest font-black text-white/20">Editeur en cours de développement</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={resetForm}>Annuler</Button>
                        <Button variant="primary" icon={Save} onClick={handleSave} disabled={!formData.nom}>
                            Enregistrer le système
                        </Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {noteTypes.map((type) => (
                    <Card key={type.id} className="p-4 flex justify-between items-center group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-input flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                <Settings size={22} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-text-main leading-none">{type.nom}</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-grey-medium border border-white/5 uppercase font-black tracking-wider">
                                        {type.systeme === 'numerique' ? 'Points' : type.systeme === 'lettre' ? 'Lettres' : 'Conversion'}
                                    </span>
                                    {type.systeme === 'numerique' && (
                                        <span className="text-[10px] text-primary font-bold">Standard</span>
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
                <Card className="p-16 flex flex-col items-center justify-center text-center bg-input/10 border-dashed border-2">
                    <div className="w-20 h-20 rounded-full bg-input flex items-center justify-center text-grey-medium/30 mb-6 group-hover:bg-primary/5 transition-colors">
                        <Settings size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-text-main mb-2">Aucun système de notation personnalisé</h3>
                    <p className="text-sm text-grey-medium max-w-sm">
                        Créez vos propres barèmes pour évaluer vos élèves avec des lettres, des icônes ou des tableaux de conversion.
                    </p>
                    <Button 
                        icon={Plus} 
                        onClick={() => setIsAdding(true)} 
                        variant="primary"
                        className="mt-8"
                    >
                        Créer mon premier barème
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default GradeSettings;
