import React, { useRef, useState, useEffect } from 'react';
import { Plus, Check, X, Trash2, Pencil } from 'lucide-react';
import clsx from 'clsx';
import { useMaterialTypes } from '../hooks/useMaterialTypes';

/**
 * ActivityMaterialSelector
 * 
 * Composant pur (ou presque) chargé de l'affichage de la sélection de matériel.
 * La logique de données des types de matériel est gérée par le hook useMaterialTypes interne,
 * mais la "sélection" (quels ids sont cochés) est passée en props.
 */

interface ActivityMaterialSelectorProps {
    selectedMaterialIds: string[];
    onToggle: (id: string) => void;
}

const ActivityMaterialSelector: React.FC<ActivityMaterialSelectorProps> = ({ selectedMaterialIds, onToggle }) => {
    // Ce hook gère la liste globale des types disponibles (CRUD types), pas la sélection de l'activité.
    const {
        materialTypes,
        createMaterialType,
        updateMaterialType,
        deleteMaterialType
    } = useMaterialTypes();

    // États UI locaux (pour l'édition inline)
    const [isAdding, setIsAdding] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Refs pour le focus et click outside
    const editInputRef = useRef<HTMLDivElement>(null);

    // Click outside effect pour fermer l'édition
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (editInputRef.current && !editInputRef.current.contains(event.target as Node)) {
                setEditingId(null);
                setIsAdding(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreate = async () => {
        if (newTypeName.trim()) {
            await createMaterialType(newTypeName);
            setNewTypeName('');
            setIsAdding(false);
        }
    };

    const handleUpdate = async () => {
        if (editingId && editingName.trim()) {
            await updateMaterialType(editingId, editingName);
            setEditingId(null);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Supprimer définitivement ce type de matériel ?")) {
            await deleteMaterialType(id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Matériel Requis</h4>
                {!isAdding && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="text-[10px] bg-white/5 hover:bg-white/10 text-primary px-2 py-1 rounded border border-primary/20 transition-colors flex items-center gap-1 font-bold uppercase"
                    >
                        <Plus size={10} /> Nouveau
                    </button>
                )}
            </div>

            {isAdding && (
                <div ref={editInputRef} className="bg-primary/5 border border-primary/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 mb-4">
                    <label className="text-xs font-bold text-primary mb-2 block">Nom du nouveau type</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTypeName}
                            onChange={e => setNewTypeName(e.target.value)}
                            className="flex-1 bg-black/20 border border-primary/30 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-primary"
                            placeholder="Ex: Règle, Compas..."
                            autoFocus
                        />
                        <button type="button" onClick={handleCreate} title="Confirmer la création" className="bg-primary text-text-dark p-2 rounded-lg hover:brightness-110">
                            <Check size={16} strokeWidth={3} />
                        </button>
                        <button type="button" onClick={() => setIsAdding(false)} title="Annuler" className="bg-danger text-white p-2 rounded-lg hover:bg-danger/90">
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {materialTypes.length === 0 ? (
                    <p className="col-span-3 text-xs text-gray-500 italic text-center py-2">Aucun type de matériel défini.</p>
                ) : (
                    materialTypes.map(mt => (
                        <div
                            key={mt.id}
                            onClick={() => onToggle(mt.id)}
                            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 group cursor-pointer"
                        >
                            <div className={clsx(
                                "w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0",
                                selectedMaterialIds.includes(mt.id) ? "bg-primary border-primary" : "border-gray-500 bg-transparent hover:border-white"
                            )}>
                                {selectedMaterialIds.includes(mt.id) && <Check size={12} className="text-black" strokeWidth={4} />}
                            </div>

                            {editingId === mt.id ? (
                                <div ref={editInputRef} className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={e => setEditingName(e.target.value)}
                                        className="flex-1 bg-black/20 border border-primary/30 rounded py-1 px-2 text-white text-xs focus:outline-none"
                                        autoFocus
                                        title="Nom du type de matériel"
                                    />
                                    <button type="button" onClick={handleUpdate} className="text-primary p-1" title="Confirmer"><Check size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 text-xs font-medium text-gray-400 hover:text-white truncate select-none">
                                        {mt.nom}
                                    </div>
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingId(mt.id);
                                                setEditingName(mt.nom);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-white"
                                            title="Renommer"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(mt.id, e)}
                                            className="p-1.5 text-gray-500 hover:text-danger"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ActivityMaterialSelector;
