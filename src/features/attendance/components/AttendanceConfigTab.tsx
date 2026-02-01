import React from 'react';
import { Plus, Settings, Trash2, X, Save } from 'lucide-react';
import { Input, Button } from '../../../core';
import { SetupPresence } from '../services/attendanceService';
import { CategoryWithTemp } from '../hooks/useAttendanceConfig';

const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B',
];

interface AttendanceConfigTabProps {
    view: 'list' | 'edit';
    setView: (view: 'list' | 'edit') => void;
    sets: SetupPresence[];
    currentSet: { id: string | null; nom: string; description: string | null } | null;
    setCurrentSet: (set: any) => void;
    categories: CategoryWithTemp[];
    loading: boolean;
    handleCreateNew: () => void;
    handleEdit: (set: SetupPresence) => void;
    handleDeleteSet: (id: string, name: string) => void;
    handleSaveSet: () => void;
    addCategory: () => void;
    removeCategory: (index: number) => void;
    updateCategory: (index: number, field: keyof CategoryWithTemp, value: any) => void;
}

export const AttendanceConfigTab: React.FC<AttendanceConfigTabProps> = ({
    view,
    setView,
    sets,
    currentSet,
    setCurrentSet,
    categories,
    loading,
    handleCreateNew,
    handleEdit,
    handleDeleteSet,
    handleSaveSet,
    addCategory,
    removeCategory,
    updateCategory
}) => {
    const withStyle = (style: React.CSSProperties) => ({ style });
    const categoryStyle = (cat: CategoryWithTemp) => ({ '--dynamic-bg': cat.couleur } as React.CSSProperties);
    const colorPickerStyle = (c: string) => ({ '--dynamic-bg': c } as React.CSSProperties);

    return (
        <div className="animate-in fade-in zoom-in-95 duration-200">
            {view === 'list' ? (
                <div className="space-y-4">
                    <button
                        onClick={handleCreateNew}
                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        <span>Créer un nouveau Set</span>
                    </button>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {sets.map(set => (
                            <div key={set.id} className="flex items-center justify-between p-4 bg-surface border border-white/10 rounded-xl hover:bg-white/5 transition-colors group">
                                <div>
                                    <h3 className="font-bold text-text-main">{set.nom}</h3>
                                    {set.description && <p className="text-xs text-grey-medium">{set.description}</p>}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(set)}
                                        className="h-8 w-8 p-0 text-primary"
                                        title="Modifier"
                                        icon={Settings}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSet(set.id, set.nom)}
                                        className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                                        title="Supprimer"
                                        icon={Trash2}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : currentSet && (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <Input
                            label="Nom du Set"
                            placeholder="ex: Cantine, Ateliers..."
                            value={currentSet.nom}
                            onChange={(e: any) => setCurrentSet({ ...currentSet, nom: e.target.value })}
                        />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-grey-light uppercase">Catégories</label>
                            <button onClick={addCategory} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Plus size={12} /> Ajouter
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg opacity-50 select-none">
                                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white text-xs font-bold">A</div>
                                <span className="text-grey-medium italic flex-1">Absent (Par défaut)</span>
                            </div>
                            {categories.map((cat, idx) => (
                                <div key={cat.id || idx} className="flex items-center gap-2">
                                    <div className="relative group/color shrink-0">
                                        <div
                                            className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 dynamic-bg"
                                            {...withStyle(categoryStyle(cat))}
                                        />
                                        <div className="absolute top-full mt-2 left-0 bg-surface border border-white/10 rounded-lg p-2 grid grid-cols-5 gap-1 z-50 hidden group-hover/color:grid w-40 shadow-xl">
                                            {COLORS.map(c => (
                                                <React.Fragment key={c}>
                                                    <div
                                                        onClick={() => updateCategory(idx, 'couleur', c)}
                                                        className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform dynamic-bg"
                                                        {...withStyle(colorPickerStyle(c))}
                                                    />
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    <Input
                                        placeholder="Nom de la catégorie"
                                        value={cat.nom}
                                        onChange={(e: any) => updateCategory(idx, 'nom', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCategory(idx)}
                                        className="text-grey-dark hover:text-danger"
                                        icon={X}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                        <button onClick={() => setView('list')} className="text-sm text-grey-medium hover:text-white">&larr; Retour</button>
                        <Button onClick={handleSaveSet} loading={loading} icon={Save}>Enregistrer</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
