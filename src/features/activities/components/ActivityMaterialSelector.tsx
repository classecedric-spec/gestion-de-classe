/**
 * Nom du module/fichier : ActivityMaterialSelector.tsx
 * 
 * Données en entrée : 
 *   - selectedMaterialIds : Liste des identifiants des matériels déjà sélectionnés pour l'activité en cours.
 *   - onToggle : Fonction pour ajouter ou retirer un matériel de la sélection.
 * 
 * Données en sortie : Une interface de sélection visuelle et des fonctions de gestion de l'inventaire matériel (CRUD).
 * 
 * Objectif principal : Permettre à l'enseignant de choisir le matériel nécessaire pour un atelier (ex: Ciseaux, Colle). Ce composant permet aussi d'enrichir la "bibliothèque" de matériel de la classe en créant de nouveaux types d'objets à la volée.
 * 
 * Ce que ça affiche : Un titre "Matériel Requis", un bouton "+ Nouveau" pour créer de nouveaux types de matériel, et une grille de cases à cocher interactives pour chaque objet disponible.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Plus, Check, X, Trash2, Pencil } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../../../core';
import { useMaterialTypes } from '../hooks/useMaterialTypes';

interface ActivityMaterialSelectorProps {
    selectedMaterialIds: string[];
    onToggle: (id: string) => void;
}

/**
 * Composant mixte : gère à la fois le choix du matériel pour l'activité et l'inventaire global.
 */
const ActivityMaterialSelector: React.FC<ActivityMaterialSelectorProps> = ({ selectedMaterialIds, onToggle }) => {
    // Ce hook gère la liste globale des types disponibles (création, modification, suppression), 
    // tandis que la "sélection" pour l'activité est gérée par le parent.
    const {
        materialTypes,
        createMaterialType,
        updateMaterialType,
        deleteMaterialType
    } = useMaterialTypes();

    // États UI locaux pour gérer l'ajout et l'édition en ligne (sans changer de page)
    const [isAdding, setIsAdding] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Référence pour détecter si on clique en dehors de la zone d'édition
    const editInputRef = useRef<HTMLDivElement>(null);

    // Effet visuel : ferme automatiquement le mode édition si l'utilisateur clique ailleurs sur l'écran
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

    /**
     * Valide la création d'un nouveau matériel dans la base de données.
     */
    const handleCreate = async () => {
        if (newTypeName.trim()) {
            await createMaterialType(newTypeName);
            setNewTypeName('');
            setIsAdding(false);
        }
    };

    /**
     * Valide le changement de nom d'un matériel existant.
     */
    const handleUpdate = async () => {
        if (editingId && editingName.trim()) {
            await updateMaterialType(editingId, editingName);
            setEditingId(null);
        }
    };

    /**
     * Supprime définitivement un matériel après confirmation de l'utilisateur.
     */
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Évite de "cocher" l'élément par erreur en cliquant sur supprimer
        if (window.confirm("Supprimer définitivement ce type de matériel ?")) {
            await deleteMaterialType(id);
        }
    };

    return (
        <div className="space-y-4">
            {/* En-tête avec bouton d'ajout de nouveau matériel */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Matériel Requis</h4>
                {!isAdding && (
                    <Button
                        onClick={() => setIsAdding(true)}
                        variant="secondary"
                        size="sm"
                        className="text-[10px] items-center gap-1 uppercase border-primary/20 text-primary"
                    >
                        <Plus size={10} /> Nouveau
                    </Button>
                )}
            </div>

            {/* Formulaire compact pour ajouter un nouveau type de matériel */}
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
                        <Button onClick={handleCreate} title="Confirmer la création" variant="primary" size="sm" className="p-2 h-auto rounded-lg">
                            <Check size={16} strokeWidth={3} />
                        </Button>
                        <Button onClick={() => setIsAdding(false)} title="Annuler" variant="danger" size="sm" className="p-2 h-auto rounded-lg">
                            <X size={16} strokeWidth={3} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Grille de sélection du matériel disponible */}
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
                            {/* Case à cocher visuelle (bg-primary si sélectionné) */}
                            <div className={clsx(
                                "w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0",
                                selectedMaterialIds.includes(mt.id) ? "bg-primary border-primary" : "border-gray-500 bg-transparent hover:border-white"
                            )}>
                                {selectedMaterialIds.includes(mt.id) && <Check size={12} className="text-black" strokeWidth={4} />}
                            </div>

                            {/* Nom du matériel (ou champ de modification si mode édition activé) */}
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
                                    <Button onClick={handleUpdate} variant="ghost" size="sm" className="text-primary p-1 h-auto" title="Confirmer"><Check size={14} /></Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 text-xs font-medium text-gray-400 hover:text-white truncate select-none">
                                        {mt.nom}
                                    </div>
                                    {/* Actions Modifier / Supprimer (visibles uniquement au survol de la souris) */}
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            onClick={(e: any) => {
                                                e.stopPropagation();
                                                setEditingId(mt.id);
                                                setEditingName(mt.nom);
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="p-1.5 h-auto text-gray-500 hover:text-white"
                                            title="Renommer"
                                        >
                                            <Pencil size={12} />
                                        </Button>
                                        <Button
                                            onClick={(e: any) => handleDelete(mt.id, e)}
                                            variant="ghost"
                                            size="sm"
                                            className="p-1.5 h-auto text-gray-500 hover:text-danger"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={12} />
                                        </Button>
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre l'édition d'une activité et arrive à la section "Matériel Requis".
 * 2. Il voit la grille de tout le matériel enregistré dans sa classe (ex: Peinture, Feutres).
 * 3. S'il a besoin de 'Ciseaux' et que ce n'est pas encore dans la liste globale :
 *    a. Il clique sur le bouton "+ Nouveau".
 *    b. Il tape 'Ciseaux' et valide.
 *    c. 'Ciseaux' est immédiatement ajouté à la liste et enregistré pour les prochains élèves.
 * 4. Pour sélectionner le matériel pour l'activité en cours :
 *    - Il coche les cases correspondantes dans la grille.
 *    - La case devient verte (primary) pour confirmer le choix.
 * 5. S'il veut faire du ménage dans sa liste de matériel :
 *    - Il survole un objet pour faire apparaître les icônes 'Modifier' (crayon) ou 'Supprimer' (poubelle).
 */
