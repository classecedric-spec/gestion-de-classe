/**
 * Nom du module/fichier : AddStudentToClassModal.tsx
 * 
 * Données en entrée : 
 *   - showModal : Indique si la fenêtre de sélection doit être affichée à l'écran.
 *   - handleCloseModal : Fonction permettant de fermer la fenêtre (annulation).
 *   - classId / className : Identifiant et nom de la classe qui va recevoir les nouveaux élèves (destination).
 *   - onAdded : Fonction appelée automatiquement après un ajout réussi pour rafraîchir l'affichage principal.
 * 
 * Données en sortie : Une interface utilisateur interactive permettant de choisir visuellement des élèves.
 * 
 * Objectif principal : Permettre à l'enseignant de piocher des élèves dans sa base de données (ex: élèves sans classe ou venant d'une autre classe) pour les intégrer dans la classe qu'il consulte actuellement. L'interface propose une recherche rapide et des filtres puissants (par classe d'origine ou par groupe) pour retrouver facilement les enfants parmi une longue liste.
 * 
 * Ce que ça affiche : Une fenêtre modale contenant :
 *    - Une barre de recherche "collante" (qui reste visible en haut lors du défilement).
 *    - Des filtres avancés par classe et par groupe.
 *    - Une grille de "cartes d'élèves" (trombinoscope) où chaque enfant peut être coché pour un ajout massif.
 *    - Un compteur d'élèves sélectionnés sur le bouton de validation.
 */

import React from 'react';
import { Check, User as UserIcon, Search, Filter, Layers, GraduationCap, Plus, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Modal, Button, Avatar, Badge, Input } from '../../../core';
import { useAddStudentToClassFlow } from '../hooks/useAddStudentToClassFlow';

interface AddStudentToClassModalProps {
    showModal: boolean;
    handleCloseModal: () => void;
    classId: string;
    className: string;
    onAdded: () => void;
}

/**
 * Composant visuel pour la recherche et l'affectation massive d'élèves à une classe.
 */
export const AddStudentToClassModal: React.FC<AddStudentToClassModalProps> = ({
    showModal,
    handleCloseModal,
    classId,
    className,
    onAdded
}) => {
    // On récupère tout le "moteur" de logique via un Hook spécialisé
    const { states, actions } = useAddStudentToClassFlow(showModal, classId, onAdded, handleCloseModal);

    // Extraction des informations d'état (ce qu'on voit)
    const {
        students,
        classes,
        groups,
        loading,
        saving,
        searchQuery,
        selectedClasses,
        selectedGroups,
        sortBy,
        showFilters,
        selectedStudentIds
    } = states;

    // Extraction des fonctions d'action (ce qu'on peut faire)
    const {
        setSearchQuery,
        setSelectedClasses,
        setSelectedGroups,
        setSortBy,
        setShowFilters,
        handleToggleStudent,
        handleSelectAll,
        handleSave
    } = actions;

    // Si la fenêtre n'est pas censée être ouverte, on n'affiche rien du tout
    if (!showModal) return null;

    return (
        <Modal
            isOpen={showModal}
            onClose={handleCloseModal}
            title={`Ajouter élèves à : ${className}`}
            noPadding={true} // On gère nous-mêmes les marges pour un effet "liste" plus propre
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
                        disabled={selectedStudentIds.length === 0} // Bouton grisé si personne n'est coché
                    >
                        Ajouter ({selectedStudentIds.length})
                    </Button>
                </>
            }
        >
            {/* EN-TÊTE FIXE : Recherche et Boutons de Filtres */}
            <div className="sticky top-0 z-20 bg-surface border-b border-white/10 p-4 space-y-3 shadow-md">
                <div className="flex gap-2">
                    <Input
                        placeholder="Rechercher un élève par son nom..."
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
                        <span className="hidden sm:inline">Filtres</span>
                        {(selectedClasses.length > 0 || selectedGroups.length > 0) && (
                            <Badge variant="primary" size="xs" className="ml-1">
                                {selectedClasses.length + selectedGroups.length}
                            </Badge>
                        )}
                    </Button>
                    {/* Bouton rapide pour tout cocher d'un coup */}
                    <button
                        onClick={() => handleSelectAll(students.map(s => s.id))}
                        className="px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        <Check size={18} className="sm:hidden" />
                        <span className="hidden sm:inline">Tout sélectionner</span>
                    </button>
                </div>

                {/* ZONE DE FILTRES AVANCÉS (S'affiche au clic sur "Filtres") */}
                {showFilters && (
                    <div className="pt-2 animate-in slide-in-from-top-2 space-y-4 border-t border-white/5 mt-2">
                        {/* Filtre par classe d'origine */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <GraduationCap size={12} /> Selon sa classe actuelle
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

                        {/* Filtre par appartenance à un groupe (ex: soutien, cantine) */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <Layers size={12} /> Selon ses groupes
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {groups.length === 0 && <span className="text-xs text-gray-500 italic">Aucun groupe disponible</span>}
                                {groups.map(grp => (
                                    <button
                                        key={grp.id}
                                        onClick={() => setSelectedGroups(prev =>
                                            prev.includes(grp.id) ? prev.filter(id => id !== grp.id) : [...prev, grp.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedGroups.includes(grp.id)
                                                ? "bg-secondary/20 border-secondary text-secondary"
                                                : "bg-white/5 border-transparent text-gray-400 hover:border-white/10"
                                        )}
                                    >
                                        {grp.nom}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Options de tri alphabétique */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            <span className="text-xs text-gray-400">Trier par :</span>
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

            {/* LISTE DES ÉLÈVES (TROMBINOSCOPE DE SÉLECTION) */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Préparation de la liste...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-xl bg-white/5 border border-dashed border-white/10 mx-auto max-w-sm">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                        <h3 className="text-lg font-medium text-white">Aucun élève trouvé</h3>
                        <p className="text-gray-500 text-sm mt-1">Modifie ta recherche ou tes filtres pour trouver les enfants.</p>
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
                                            ? "bg-primary/10 border-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]"
                                            : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar de l'élève */}
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
                                            {/* Informations secondaires (classe, groupes) */}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {student.Classe && (
                                                    <Badge variant="default" size="xs" className="opacity-70">
                                                        <GraduationCap size={10} className="mr-1" />
                                                        {student.Classe.nom}
                                                    </Badge>
                                                )}
                                                {student.EleveGroupe && student.EleveGroupe.length > 0 && (
                                                    <Badge variant="default" size="xs" className="opacity-70">
                                                        <Layers size={10} className="mr-1" />
                                                        {student.EleveGroupe.length} grp
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {/* Petite coche de confirmation de sélection */}
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

export default AddStudentToClassModal;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant consulte la classe 'MS Verte' et s'aperçoit qu'il manque des élèves.
 * 2. Il clique sur "Ajouter". La fenêtre surgissante s'affiche.
 * 3. Par défaut, il voit tous les élèves de l'école (environ 150).
 * 4. Il tape "Emma" dans la barre de recherche : la liste se réduit à 3 élèves.
 * 5. Il active le filtre 'Classe actuelle' pour vérifier qu'elles ne sont pas déjà ailleurs.
 * 6. Il clique sur la carte d'Emma Bernard : la carte devient bleutée et cochée.
 * 7. Il valide en cliquant sur "Ajouter (1)".
 * 8. Le Hook met à jour la fiche d'Emma pour la lier à 'MS Verte', ferme la fenêtre 
 *    et rafraîchit l'écran pour que l'enseignant voit Emma apparaître dans sa liste.
 */
