/**
 * Nom du module/fichier : AddStudentToTaskModal.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Affiche ou cache la fenêtre.
 *   - `alreadyAssignedIds` : Liste des élèves qui ont déjà cette responsabilité (pour éviter les doublons).
 *   - `taskTitle` : Nom de la mission (ex: 'Arrosage des plantes').
 * 
 * Données en sortie : 
 *   - `onSelect` : Renvoie la liste des identifiants des nouveaux élèves choisis.
 * 
 * Objectif principal : Permettre à l'enseignant de choisir visuellement un ou plusieurs élèves pour une tâche précise. La fenêtre affiche un trombinoscope complet de la classe, permet de chercher par nom, et grise automatiquement les enfants qui sont déjà affectés à ce rôle.
 * 
 * Ce que ça affiche : 
 *   - Une barre de recherche.
 *   - Une grille de "cartes" d'élèves (Photo, Prénom, Nom) que l'on peut cocher.
 *   - Un bouton de validation qui indique le nombre de sélections.
 */

import React, { useState, useMemo } from 'react';
import { Modal, Input, Avatar, Button } from '../../../core';
import { Search, Check } from 'lucide-react';
import { useStudentsData } from '../../students/hooks/useStudentsData';
import { getInitials } from '../../../lib/helpers';
import clsx from 'clsx';

interface AddStudentToTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (eleveIds: string[]) => void;
    alreadyAssignedIds: string[];
    taskTitle: string;
}

/**
 * Fenêtre de sélection d'élèves pour une responsabilité.
 */
const AddStudentToTaskModal: React.FC<AddStudentToTaskModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    alreadyAssignedIds,
    taskTitle
}) => {
    // Récupération de la liste des élèves depuis le service dédié
    const { students, loading } = useStudentsData();
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    /**
     * FILTRAGE : Filtre les élèves selon ce que l'utilisateur tape dans la barre de recherche.
     */
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const fullName = `${s.prenom} ${s.nom}`.toLowerCase();
            return fullName.includes(search.toLowerCase());
        });
    }, [students, search]);

    /**
     * SÉLECTION : Ajoute ou retire un élève de la liste temporaire.
     */
    const handleToggleSelect = (eleveId: string) => {
        setSelectedIds(prev =>
            prev.includes(eleveId)
                ? prev.filter(id => id !== eleveId)
                : [...prev, eleveId]
        );
    };

    /**
     * VALIDATION : Envoie le choix final au parent.
     */
    const handleValidate = () => {
        if (selectedIds.length > 0) {
            onSelect(selectedIds);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Assigner à : ${taskTitle}`}
            className="!max-w-[800px]"
        >
            <div className="space-y-6">
                {/* Barre de recherche et Bouton de validation */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-2/3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-medium" />
                        <Input
                            placeholder="Rechercher un élève..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11 bg-white/5 border-white/10"
                            autoFocus
                        />
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleValidate}
                        disabled={selectedIds.length === 0}
                        className="w-full sm:w-auto"
                    >
                        Valider ({selectedIds.length})
                    </Button>
                </div>

                {/* Trombinoscope / Liste des élèves */}
                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center text-grey-medium animate-pulse">
                            Chargement des élèves...
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-20 text-center text-grey-medium italic">
                            Aucun élève trouvé
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {filteredStudents.map(student => {
                                const isAlreadyAssigned = alreadyAssignedIds.includes(student.id);
                                const isSelected = selectedIds.includes(student.id);

                                return (
                                    <button
                                        key={student.id}
                                        disabled={isAlreadyAssigned} // Grise l'élève s'il a déjà cet emploi
                                        onClick={() => handleToggleSelect(student.id)}
                                        className={clsx(
                                            "flex items-center gap-3 p-2 rounded-2xl transition-all group relative border",
                                            isAlreadyAssigned
                                                ? "bg-grey-light/5 opacity-40 cursor-not-allowed border-transparent"
                                                : isSelected
                                                    ? "bg-primary/20 border-primary shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_22%,transparent)]"
                                                    : "bg-white/5 border-white/5 hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar
                                                size="sm"
                                                initials={getInitials(student as any)}
                                                src={student.photo_url}
                                                className={clsx(
                                                    "ring-1 ring-transparent transition-all",
                                                    !isAlreadyAssigned && !isSelected && "group-hover:ring-primary/50",
                                                    isSelected && "ring-primary shadow-lg shadow-primary/20"
                                                )}
                                            />
                                            {/* Petit 'vu' si sélectionné */}
                                            {isSelected && (
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-text-dark p-0.5 rounded-full z-10">
                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className={clsx(
                                                "font-black text-xs transition-colors truncate",
                                                isAlreadyAssigned ? "text-grey-medium" : isSelected ? "text-primary" : "text-white group-hover:text-primary"
                                            )}>
                                                {student.prenom}
                                            </p>
                                            <p className="text-[9px] font-bold text-grey-dark uppercase tracking-wider truncate mb-0.5">
                                                {student.nom}
                                            </p>
                                        </div>

                                        {/* Déjà assigné : petit badge vert permanent */}
                                        {isAlreadyAssigned && (
                                            <div className="absolute top-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-lg">
                                                <Check className="w-2.5 h-2.5 stroke-[4]" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AddStudentToTaskModal;

/**
 * LOGIGRAMME DE SÉLECTION :
 * 
 * 1. OUVERTURE -> La fenêtre demande au système la liste de tous les élèves de l'école.
 * 2. PRÉPARATION -> Elle regarde quels élèves sont déjà responsables de cette tâche et les grise.
 * 3. RECHERCHE -> L'enseignant tape un nom pour trouver l'élève plus vite.
 * 4. CHOIX -> L'enseignant clique sur une ou plusieurs photos. Le bouton "Valider" s'illumine.
 * 5. VALIDATION -> L'enseignant clique sur "Valider". La fenêtre se ferme et transmet la liste des élus au service de sauvegarde.
 */
