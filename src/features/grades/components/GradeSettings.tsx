/**
 * Nom du module/fichier : GradeSettings.tsx
 * 
 * Données en entrée : Les réglages actuels de l'enseignant (ses systèmes de notation et ses périodes scolaires enregisrés).
 * 
 * Données en sortie : La création, modification ou suppression de "barèmes types" (ex: "Interro sur 20", "Lettres A-E") et de trimestres/semestres.
 * 
 * Objectif principal : Fournir un panneau de configuration propre et centralisé où l'enseignant prépare les règles du jeu de son carnet de cotes.
 * 
 * Ce que ça affiche : Deux gros onglets. Le premier permet de construire ses propres systèmes de notation (avec de belles couleurs pour les lettres). Le second permet de découper l'année en périodes (géré par un autre fichier).
 */

import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X, Calculator, CalendarDays, Trash } from 'lucide-react';
import Card from '../../../core/Card';
import Button from '../../../core/Button';
import Input from '../../../core/Input';
import Tabs from '../../../core/Tabs';
import { useGrades } from '../hooks/useGrades';
import { Tables } from '../../../types/supabase';
import { useAuth } from '../../../hooks/useAuth';
import PeriodSettings from './PeriodSettings';
import EvaluationTrash from './EvaluationTrash';

const GradeSettings: React.FC = () => {
    const { noteTypes, saveNoteType, deleteNoteType } = useGrades();
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<'noteTypes' | 'periods' | 'trash'>('noteTypes');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nom: '',
        systeme: 'numerique', 
        config: {} as any
    });

    // Prépare l'envoi sécurisé du nouveau barème (ou de ses modifications) vers la base de données du professeur.
    const handleSave = async () => {
        if (!session?.user) return;
        
        // Ensure config has at least an empty paliers array for conversion
        const finalConfig = { ...formData.config };
        if (formData.systeme === 'conversion' && !finalConfig.paliers) {
            finalConfig.paliers = [];
        }

        await saveNoteType({
            typeNote: {
                ...formData,
                config: finalConfig,
                id: editingId || undefined,
                user_id: session.user.id
            }
        });
        resetForm();
    };

    const resetForm = () => {
        setFormData({ nom: '', systeme: 'numerique', config: { max: 20 } });
        setIsAdding(false);
        setEditingId(null);
    };

    // Ouvre le formulaire pré-rempli lorsqu'on clique sur le bouton "Modifier" d'un barème existant.
    const startEdit = (type: Tables<'TypeNote'>) => {
        setFormData({
            nom: type.nom,
            systeme: (type.systeme as any) || 'numerique', // Cast to any to handle potential DB values
            config: type.config || {}
        });
        setEditingId(type.id);
        setIsAdding(true);
    };

    // Mécanique spéciale pour les barèmes de type "Lettres" : ajoute une nouvelle ligne vide pour définir une nouvelle lettre (ex: 'TB') et sa couleur.
    const addPalier = () => {
        const paliers = [...(formData.config.paliers || [])];
        paliers.push({ letter: '', minPercent: 0, maxPercent: 0, color: 'emerald' });
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

    const updatePalier = (index: number, field: keyof any, value: any) => {
        const paliers = [...(formData.config.paliers || [])];
        paliers[index] = { 
            ...paliers[index], 
            [field]: field === 'minPercent' || field === 'maxPercent' ? parseFloat(value) || 0 : value 
        };
        setFormData({
            ...formData,
            config: { ...formData.config, paliers }
        });
    };

    // Range automatiquement les paliers (les lettres) du pourcentage le plus faible au plus fort pour éviter les erreurs de logique lors de la création d'un barème.
    const sortPaliers = () => {
        const paliers = [...(formData.config.paliers || [])];
        paliers.sort((a, b) => (a.minPercent || 0) - (b.minPercent || 0));
        setFormData({
            ...formData,
            config: { ...formData.config, paliers }
        });
    };

    const settingsTabs = [
        { id: 'noteTypes', label: 'Systèmes de Notation', icon: Calculator },
        { id: 'periods', label: 'Périodes d\'évaluation', icon: CalendarDays },
        { id: 'trash', label: 'Corbeille', icon: Trash }
    ];

    return (
        <div className="space-y-6">
            {/* Settings Tabs */}
            <div className="flex justify-start">
                <Tabs
                    tabs={settingsTabs}
                    activeTab={activeTab}
                    onChange={(id) => setActiveTab(id as 'noteTypes' | 'periods')}
                    variant="capsule"
                    level={2}
                />
            </div>

            {activeTab === 'periods' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <PeriodSettings />
                </div>
            ) : activeTab === 'trash' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <EvaluationTrash />
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Note Types Section */}
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
                <Card variant="gradient" className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Card.Header className="flex justify-between items-center bg-primary/5">
                        <h3 className="font-black text-text-main uppercase tracking-tighter flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/20 text-primary shadow-inner">
                                <Settings size={18} />
                            </div>
                            {editingId ? 'Modifier le système' : 'Nouveau système de notation'}
                        </h3>
                        <button onClick={resetForm} className="p-2 rounded-lg text-grey-medium hover:text-white hover:bg-white/5 transition-all" title="Fermer">
                            <X size={20} />
                        </button>
                    </Card.Header>

                    <Card.Body className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input 
                                label="Nom du barème" 
                                placeholder="ex: Points (sur 20), Conversion CED..." 
                                value={formData.nom}
                                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                            />
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-grey-medium uppercase tracking-wider">Type de système</label>
                                <div className="flex bg-black/20 rounded-2xl p-1.5 gap-1.5 border border-white/5">
                                    <button
                                        onClick={() => setFormData({...formData, systeme: 'numerique'})}
                                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.systeme === 'numerique' ? 'bg-primary text-text-dark shadow-lg' : 'text-grey-medium hover:text-white hover:bg-white/5'}`}
                                    >
                                        Numérique
                                    </button>
                                    <button
                                        onClick={() => setFormData({...formData, systeme: 'conversion'})}
                                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.systeme === 'conversion' ? 'bg-primary text-text-dark shadow-lg' : 'text-grey-medium hover:text-white hover:bg-white/5'}`}
                                    >
                                        Conversion
                                    </button>
                                </div>
                            </div>
                        </div>

                        {formData.systeme === 'numerique' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2">
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
                        )}

                        {formData.systeme === 'conversion' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <h4 className="text-xs font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                        Grille de Conversion
                                    </h4>
                                    <Button size="sm" variant="ghost" icon={Plus} onClick={addPalier} className="text-primary hover:bg-primary/10 rounded-xl">
                                        Ajouter un palier
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {/* Header Labels */}
                                    {(formData.config.paliers || []).length > 0 && (
                                        <div className="flex items-center gap-2 px-2 text-[10px] font-black text-grey-medium uppercase tracking-widest mb-1">
                                            <div className="w-1/4 px-2">Titre</div>
                                            <div className="w-[18%] text-right pr-4">Inf.</div>
                                            <div className="w-[18%] text-right pr-4">Sup.</div>
                                            <div className="w-[15%] text-center">Couleur</div>
                                            <div className="flex-1"></div>
                                        </div>
                                    )}
                                    
                                    {(formData.config.paliers || []).map((palier: any, idx: number) => {
                                        const paliers = formData.config.paliers || [];
                                        const hasInnerError = palier.minPercent > palier.maxPercent;
                                        
                                        // Overlap detection
                                        const overlapsWithPrevious = idx > 0 && paliers[idx-1].maxPercent > palier.minPercent;
                                        const overlapsWithNext = idx < paliers.length - 1 && palier.maxPercent > paliers[idx+1].minPercent;
                                        const hasOverlap = overlapsWithPrevious || overlapsWithNext;

                                        const hasError = hasInnerError || hasOverlap;

                                        const colors = [
                                            { name: 'emerald', class: 'bg-emerald-500' },
                                            { name: 'blue', class: 'bg-blue-500' },
                                            { name: 'amber', class: 'bg-amber-500' },
                                            { name: 'rose', class: 'bg-rose-500' },
                                            { name: 'purple', class: 'bg-purple-500' },
                                            { name: 'grey', class: 'bg-grey-medium' }
                                        ];
                                        
                                        return (
                                            <div key={idx} className={`flex items-center gap-2 p-2 bg-input/50 rounded-xl border-2 transition-all group animate-in zoom-in-95 duration-200
                                                ${hasError ? 'border-danger flex-shake shadow-lg shadow-danger/10' : 'border-white/5'}
                                            `}>
                                                <div className="w-1/4">
                                                    <input 
                                                        placeholder="Lettre (ex: A, TB)" 
                                                        className="w-full bg-transparent border-none outline-none text-sm font-bold text-text-main px-2"
                                                        value={palier.letter}
                                                        onChange={(e) => updatePalier(idx, 'letter', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 w-[18%]">
                                                    <input 
                                                        type="number"
                                                        placeholder="Min" 
                                                        className={`w-full bg-transparent border-none outline-none text-sm font-bold text-right ${hasInnerError || overlapsWithPrevious ? 'text-danger' : 'text-primary'}`}
                                                        value={palier.minPercent}
                                                        onChange={(e) => updatePalier(idx, 'minPercent', e.target.value)}
                                                        onBlur={sortPaliers}
                                                    />
                                                    <span className="text-grey-medium text-[10px]">%</span>
                                                </div>
                                                <div className="flex items-center gap-1 w-[18%]">
                                                    <input 
                                                        type="number"
                                                        placeholder="Max" 
                                                        className={`w-full bg-transparent border-none outline-none text-sm font-bold text-right ${hasInnerError || overlapsWithNext ? 'text-danger' : 'text-primary'}`}
                                                        value={palier.maxPercent}
                                                        onChange={(e) => updatePalier(idx, 'maxPercent', e.target.value)}
                                                        onBlur={sortPaliers}
                                                    />
                                                    <span className="text-grey-medium text-[10px]">%</span>
                                                </div>
                                                <div className="w-[15%] flex justify-center gap-1">
                                                    <div className="flex flex-wrap justify-center gap-0.5 max-w-[60px]">
                                                        {colors.map(c => (
                                                            <button
                                                                key={c.name}
                                                                type="button"
                                                                onClick={() => {
                                                                    updatePalier(idx, 'color' as any, c.name);
                                                                }}
                                                                className={`w-3 h-3 rounded-full ${c.class} transition-transform hover:scale-125 ${palier.color === c.name ? 'ring-2 ring-white ring-offset-1 ring-offset-grey-dark' : 'opacity-40 hover:opacity-100'}`}
                                                                title={c.name}
                                                            />
                                                        ))}
                                                    </div>
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
                                        );
                                    })}
                                    {(formData.config.paliers || []).length === 0 && (
                                        <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl text-grey-medium text-sm">
                                            Aucun palier défini. Cliquez sur "Ajouter un palier" pour commencer.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card.Body>
                    
                    <Card.Footer className="flex justify-end gap-3 bg-black/20">
                        <Button variant="ghost" onClick={resetForm}>Annuler</Button>
                        <Button 
                            variant="primary" 
                            icon={Save} 
                            onClick={handleSave} 
                            className="shadow-xl shadow-primary/20"
                            disabled={
                                !formData.nom || 
                                (formData.systeme === 'numerique' && !formData.config.max) ||
                                (formData.systeme === 'conversion' && (
                                    (formData.config.paliers || []).some((p: any, idx: number) => {
                                        const paliers = formData.config.paliers;
                                        const hasInnerError = p.minPercent > p.maxPercent;
                                        const overlapsWithNext = idx < paliers.length - 1 && p.maxPercent > paliers[idx+1].minPercent;
                                        return hasInnerError || overlapsWithNext;
                                    })
                                ))
                            }
                        >
                            Enregistrer le barème
                        </Button>
                    </Card.Footer>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {noteTypes.map((type) => (
                    <Card 
                        key={type.id} 
                        hover
                        className="group transition-all duration-300"
                    >
                        <Card.Body className="flex justify-between items-center p-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 shadow-inner
                                    ${type.systeme === 'conversion' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}
                                `}>
                                    <Settings size={22} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-text-main leading-none uppercase tracking-tight">{type.nom}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-grey-medium border border-white/10 uppercase font-black tracking-wider">
                                            {type.systeme === 'conversion' ? 'Conversion' : 'Numérique'}
                                        </span>
                                        {type.systeme === 'numerique' && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 uppercase font-black tracking-wider">
                                                Sur {(type.config as any)?.max || '?'}
                                            </span>
                                        )}
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
                                    className="hover:bg-primary/10 hover:text-primary rounded-xl" 
                                    title="Modifier"
                                />
                                <Button 
                                    variant="ghost" 
                                    icon={Trash2} 
                                    onClick={() => deleteNoteType({ id: type.id })} 
                                    size="sm" 
                                    className="text-danger/60 hover:text-danger hover:bg-danger/10 rounded-xl"
                                    title="Supprimer"
                                />
                            </div>
                        </Card.Body>
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
            )}
        </div>
    );
};

/**
 * 1. Le panneau de configuration s'ouvre, par défaut sur l'onglet "Systèmes de Notation".
 * 2. Il lit la base de données et affiche sous forme de belles cartes tous les barèmes déjà créés par le prof.
 * 3. Si l'enseignant clique sur "Nouveau", un formulaire intelligent apparaît.
 * 4. Selon qu'il choisisse "Numérique" ou "Conversion", les options changent (ex: demander juste une note max, ou demander de colorier un système de lettres complexe).
 * 5. Lors de la conception d'un système de lettres (paliers), le code surveille en temps réel qu'il n'y ait pas d'incohérence entre les pourcentages (ex: qu'un pourcentage max ne soit pas inférieur à un min).
 * 6. Une fois parfait, l'enseignant clique sur "Enregistrer", l'information part dans le cloud, la surcouche disparaît, et la nouvelle carte apparaît instantanément dans la liste de ses réglages.
 */
export default GradeSettings;
