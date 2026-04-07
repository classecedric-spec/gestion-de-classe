/**
 * Nom du module/fichier : AddStudentToGroupModal.tsx
 * 
 * Données en entrée : 
 *   - `groupId` : L'identifiant interne du groupe qui va recevoir les nouveaux élèves.
 *   - `groupName` : Le nom de l'atelier (pour personnaliser le titre de la fenêtre).
 *   - `showModal` : Un interrupteur (vrai/faux) qui commande l'apparition ou la disparition de la fenêtre.
 * 
 * Données en sortie : 
 *   - L'enregistrement effectif des élèves sélectionnés dans le groupe (en base de données).
 *   - Un signal `onAdded` prévenant le reste de l'application qu'il faut rafraîchir l'affichage.
 * 
 * Objectif principal : Offrir une interface de "Recrutement massif" pour un groupe ou un atelier. Au lieu d'ajouter les élèves un par un, cette fenêtre permet de parcourir tout l'annuaire de l'école, d'utiliser des filtres intelligents (par nom, par classe, par niveau scolaire) et de cocher plusieurs élèves d'un coup pour les inscrire instantanément dans l'atelier sélectionné.
 * 
 * Ce que ça affiche : Une grande fenêtre surgissante avec une barre de recherche, des boutons de filtres (Classes, Niveaux, Autres groupes...) et une galerie de cartes d'élèves interactives munies de cases à cocher.
 */

import React from 'react';
import { Check, User as UserIcon, Search, Filter, Layers, GraduationCap, Plus, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Modal, Button, Input, Avatar, Badge } from '../../../core';
import { useAddStudentToGroupFlow } from '../hooks/useAddStudentToGroupFlow';

interface AddStudentToGroupModalProps {
    showModal: boolean;
    handleCloseModal: () => void;
    groupId: string;
    groupName: string;
    onAdded?: () => void;
}

/**
 * Fenêtre interactive pour l'inscription de plusieurs élèves dans un groupe.
 */
export const AddStudentToGroupModal: React.FC<AddStudentToGroupModalProps> = ({
    showModal,
    handleCloseModal,
    groupId,
    groupName,
    onAdded
}) => {
    /** 
     * ASSISTANT DE FLUX (Hook) : 
     * On confie toute la complexité (recherche, filtrage, calculs, appels serveur) 
     * à `useAddStudentToGroupFlow`. Ce fichier se contente de dessiner ce que l'assistant lui dit.
     */
    const { states, actions } = useAddStudentToGroupFlow(showModal, groupId, onAdded, handleCloseModal);

    const {
        students, classes, groups, niveaux, loading, saving,
        searchQuery, selectedClasses, selectedGroups, selectedNiveaux,
        sortBy, showFilters, selectedStudentIds
    } = states;

    const {
        setSearchQuery, setSelectedClasses, setSelectedGroups, setSelectedNiveaux,
        setSortBy, setShowFilters, handleToggleStudent, handleSelectAll, handleSave
    } = actions;

    // Si la fenêtre n'est pas censée être ouverte, on ne dessine rien.
    if (!showModal) return null;

    return (
        <Modal
            isOpen={showModal}
            onClose={handleCloseModal}
            title={`Ajouter au groupe : ${groupName}`}
            noPadding={true}
            className="max-w-2xl max-h-[85vh] h-[85vh]"
            footer={
                <>
                    <Button onClick={handleCloseModal} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSave}
                        loading={saving}
                        className="flex-1"
                        icon={Plus}
                        disabled={selectedStudentIds.length === 0}
                    >
                        Inscrire les {selectedStudentIds.length} élèves
                    </Button>
                </>
            }
        >
            {/* --- ZONE DE PILOTAGE : Recherche et Boutons de Filtres --- */}
            <div className="sticky top-0 z-20 bg-surface border-b border-white/10 p-4 space-y-3 shadow-md">
                <div className="flex gap-2">
                    <Input
                        placeholder="Trouver un élève par son nom..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={Search}
                        className="flex-1"
                    />
                    <Button
                        variant={showFilters ? 'primary' : 'ghost'}
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                            "px-3 h-[46px]",
                            !showFilters && "bg-black/20 text-gray-400 border border-white/10"
                        )}
                        icon={Filter}
                    >
                        <span className="hidden sm:inline">Options</span>
                        {(selectedClasses.length > 0 || selectedGroups.length > 0 || selectedNiveaux.length > 0) && (
                            <Badge variant="primary" size="xs" className="ml-1">
                                {selectedClasses.length + selectedGroups.length + selectedNiveaux.length} actif(s)
                            </Badge>
                        )}
                    </Button>
                    <button
                        onClick={() => handleSelectAll(students.map(s => s.id))}
                        className="px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        <span className="hidden sm:inline">Tout sélectionner</span>
                        <Check size={18} className="sm:hidden" />
                    </button>
                </div>

                {/* --- TIROIR DES FILTRES (Classes, Niveaux...) --- */}
                {showFilters && (
                    <div className="pt-2 animate-in slide-in-from-top-2 space-y-4 border-t border-white/5 mt-2 overflow-y-auto max-h-[40vh]">
                        {/* Filtre par Niveau scolaire */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <Layers size={12} /> Niveaux scolaires
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {niveaux.map(niv => (
                                    <button
                                        key={niv.id}
                                        onClick={() => setSelectedNiveaux(prev =>
                                            prev.includes(niv.id) ? prev.filter(id => id !== niv.id) : [...prev, niv.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedNiveaux.includes(niv.id)
                                                ? "bg-primary/20 border-primary text-primary"
                                                : "bg-white/5 border-transparent text-gray-400 hover:border-white/10"
                                        )}
                                    >
                                        {niv.nom}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtre par Nom de Classe */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <GraduationCap size={12} /> Classes
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {classes.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => setSelectedClasses(prev =>
                                            prev.includes(cls.id) ? prev.filter(id => id !== cls.id) : [...prev, cls.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedClasses.includes(cls.id)
                                                ? "bg-primary/20 border-primary text-primary"
                                                : "bg-white/5 border-transparent text-gray-400 hover:border-white/10"
                                        )}
                                    >
                                        {cls.nom}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Options de Tri */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            <span className="text-xs text-gray-400">Classer par :</span>
                            <div className="flex bg-black/20 rounded-lg p-0.5">
                                {['nom', 'prenom'].map(sort => (
                                    <button
                                        key={sort}
                                        onClick={() => setSortBy(sort as any)}
                                        className={clsx(
                                            "px-3 py-1 text-xs rounded-md capitalize transition-colors",
                                            sortBy === sort ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        {sort}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- GRILLE DES ÉLÈVES (Résultats de la recherche) --- */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Préparation de l'annuaire...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-xl bg-white/5 border border-dashed border-white/10 mx-auto max-w-sm">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                        <h3 className="text-lg font-medium text-white">Aucun élève trouvé</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {searchQuery || selectedClasses.length > 0 || selectedGroups.length > 0
                                ? "Modifiez vos filtres de recherche."
                                : "Tous les élèves de l'école sont déjà dans ce groupe !"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {students.map(student => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            return (
                                <div
                                    key={student.id}
                                    onClick={() => handleToggleStudent(student.id)}
                                    className={clsx(
                                        "relative group p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                                        isSelected
                                            ? "bg-primary/20 border-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]"
                                            : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar
                                            size="md"
                                            src={student.photo_url}
                                            initials={`${(student.prenom || '')[0]}${(student.nom || '')[0]}`}
                                            className={clsx(
                                                "shrink-0",
                                                isSelected ? "bg-background" : student.photo_url ? "bg-[#D9B981]" : "bg-white/10"
                                            )}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className={clsx("font-bold truncate", isSelected ? "text-primary" : "text-white")}>
                                                {student.prenom} {student.nom}
                                            </h4>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {student.Classe && (
                                                    <Badge variant="default" size="xs" className="opacity-70">
                                                        {student.Classe.nom}
                                                    </Badge>
                                                )}
                                                {student.Niveau && (
                                                    <Badge variant="default" size="xs" className="opacity-70">
                                                        {student.Niveau.nom}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {/* Case à cocher visuelle */}
                                        <div className={clsx(
                                            "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                                            isSelected
                                                ? "bg-primary border-primary text-text-dark"
                                                : "border-white/20 bg-transparent text-transparent group-hover:border-white/40"
                                        )}>
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur "Inscrire des élèves" dans son atelier "Lecture".
 * 2. La fenêtre surgissante `AddStudentToGroupModal` s'ouvre au centre de l'écran.
 * 3. L'assistant `useAddStudentToGroupFlow` télécharge immédiatement la liste de TOUS les élèves déjà inscrits dans l'application.
 * 4. L'enseignant cherche les élèves de la classe "CM1" :
 *    - Il ouvre "Options", clique sur "CM1".
 *    - La liste se réduit en temps réel pour ne garder que les enfants de CM1.
 * 5. L'enseignant tape "DU" pour trouver les "Dumont" et les "Dupont" :
 *    - Il coche les cases à côté de leurs noms.
 * 6. L'enseignant valide en cliquant sur le gros bouton "Inscrire les élèves".
 * 7. L'application enregistre les nouveaux membres, ferme la fenêtre, et rafraîchit la page pour montrer les nouveaux élèves.
 */
export default AddStudentToGroupModal;
