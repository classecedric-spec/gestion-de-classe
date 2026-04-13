/**
 * Nom du module/fichier : PeriodSettings.tsx
 * 
 * Données en entrée : Les périodes existantes de l'utilisateur (Trimestre 1, Semestre A, etc.).
 * 
 * Données en sortie : Un ordre nouveau ou de nouvelles périodes créées et sauvegardées.
 * 
 * Objectif principal : Gérer le découpage de l'année scolaire de manière personnalisée pour l'enseignant.
 * 
 * Ce que ça affiche : Une liste des périodes existantes sous forme de petits blocs qu'on peut attraper avec la souris pour changer leur ordre, les renommer ou les effacer. 
 */

import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, GripVertical, Check } from 'lucide-react';
import Card from '../../../core/Card';
import Button from '../../../core/Button';
import Input from '../../../core/Input';
import { usePeriods, Period } from '../hooks/usePeriods';

const PeriodSettings: React.FC = () => {
    const { periods, addPeriod, updatePeriod, deletePeriod, reorderPeriods, loading } = usePeriods();

    // Add mode
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');

    // Edit mode
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');

    // Drag state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Intercepte le clic sur "Ajouter" pour créer officiellement la nouvelle période en base de données, à la stricte condition que le nom ne soit pas composé que d'espaces vides.
    const handleAdd = () => {
        if (!newLabel.trim()) return;
        const label = newLabel.trim();
        setIsAdding(false);
        setNewLabel('');
        addPeriod(label); // Triggers optimistic update in cache
    };

    const handleEdit = () => {
        if (!editingId || !editLabel.trim()) return;
        const id = editingId;
        const label = editLabel.trim();
        setEditingId(null);
        setEditLabel('');
        updatePeriod(id, label); // Triggers optimistic update in cache
    };

    const startEdit = (period: Period) => {
        setEditingId(period.id);
        setEditLabel(period.label);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditLabel('');
    };

    // Drag & Drop
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    // S'occupe du moment magique où le professeur lâche le bloc qu'il était en train de glisser (Drag & Drop), calcule sa nouvelle position, et demande au système d'enregistrer ce nouvel ordre.
    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const reordered = [...periods];
        const [moved] = reordered.splice(draggedIndex, 1);
        reordered.splice(dropIndex, 0, moved);
        reorderPeriods(reordered);

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    if (loading && periods.length === 0) {
        return (
            <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-xl bg-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-text-main">Périodes d'évaluation</h2>
                    <p className="text-sm text-grey-medium">
                        Définissez les périodes disponibles pour vos évaluations (trimestres, semestres, etc.)
                    </p>
                </div>
                {!isAdding && (
                    <Button
                        icon={Plus}
                        onClick={() => setIsAdding(true)}
                        variant="primary"
                    >
                        Nouvelle période
                    </Button>
                )}
            </div>

            {/* Add Form */}
            {isAdding && (
                <Card className="p-5 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary shrink-0">
                            <Calendar size={18} />
                        </div>
                        <div className="flex-1">
                            <Input
                                placeholder="ex: Trimestre 1, Semestre A, Période 1..."
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAdd();
                                    if (e.key === 'Escape') { setIsAdding(false); setNewLabel(''); }
                                }}
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setIsAdding(false); setNewLabel(''); }}
                                className="text-grey-medium hover:text-text-main"
                            >
                                <X size={16} />
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAdd}
                                disabled={!newLabel.trim()}
                            >
                                <Check size={16} className="mr-1" />
                                Ajouter
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Period List */}
            <div className="space-y-2">
                {periods.map((period, index) => (
                    <div
                        key={period.id}
                        draggable={editingId !== period.id}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                            flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 group
                            ${draggedIndex === index ? 'opacity-40 scale-95' : ''}
                            ${dragOverIndex === index ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10' : 'border-white/5 bg-surface hover:border-white/15'}
                        `}
                    >
                        {/* Drag Handle */}
                        <div className="cursor-grab active:cursor-grabbing text-grey-medium/30 group-hover:text-grey-medium transition-colors">
                            <GripVertical size={16} />
                        </div>

                        {/* Order Badge */}
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                            {index + 1}
                        </div>

                        {/* Label or Edit Input */}
                        {editingId === period.id ? (
                            <div className="flex-1 flex items-center gap-2">
                                <Input
                                    value={editLabel}
                                    onChange={(e) => setEditLabel(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                    }}
                                    autoFocus
                                    className="flex-1"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEdit}
                                    className="text-grey-medium hover:text-text-main shrink-0"
                                >
                                    <X size={14} />
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleEdit}
                                    disabled={!editLabel.trim()}
                                    className="shrink-0"
                                >
                                    <Save size={14} />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 min-w-0">
                                    <span className="font-bold text-text-main text-sm truncate block">
                                        {period.label}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                                    <button
                                        onClick={() => startEdit(period)}
                                        className="p-2 rounded-lg text-grey-medium hover:text-primary hover:bg-primary/10 transition-all"
                                        title="Modifier"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => deletePeriod(period.id)}
                                        className="p-2 rounded-lg text-grey-medium hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {periods.length === 0 && !isAdding && (
                <Card className="p-12 flex flex-col items-center justify-center text-center bg-input/10 border-dashed border-2 text-grey-medium">
                    <Calendar size={40} className="mb-4 opacity-20" />
                    <h3 className="text-lg font-bold text-text-main mb-2">Aucune période définie</h3>
                    <p className="text-sm max-w-sm mb-6">
                        Ajoutez des périodes (trimestres, semestres, etc.) pour organiser vos évaluations.
                    </p>
                    <Button
                        icon={Plus}
                        onClick={() => setIsAdding(true)}
                        variant="primary"
                    >
                        Créer une période
                    </Button>
                </Card>
            )}

            {/* Info Helper */}
            {periods.length > 0 && (
                <p className="text-[10px] text-grey-medium/60 font-bold uppercase tracking-widest text-center">
                    Glissez-déposez les périodes pour modifier l'ordre • Cliquez sur l'icône pour modifier
                </p>
            )}
        </div>
    );
};

/**
 * 1. L'application charge les périodes de l'enseignant (la mémoire demande quelques dixièmes de seconde, l'interface affiche d'abord un faux chargement clignotant 'animate-pulse').
 * 2. Une fois chargé, si le professeur clique sur "Nouvelle période", une boîte de saisie apparaît.
 * 3. Chaque période trouvée s'affiche sur une ligne avec ses boutons d'action au survol ("Modifier", "Supprimer").
 * 4. Les blocs de périodes utilisent la mécanique "Drag & Drop" : quand l'enseignant clique et glisse les 6 petits points (GripVertical) d'une ligne, le composant mémorise son numéro de départ.
 * 5. Quand la souris est relâchée (le "Drop"), le programme réorganise un copie virtuelle de son tableau avant de la sauvegarder définitivement.
 */
export default PeriodSettings;
