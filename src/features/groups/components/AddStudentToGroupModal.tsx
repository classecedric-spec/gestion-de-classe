/**
 * @component AddStudentToGroupModal
 * @description Modale permettant de sélectionner et d'ajouter plusieurs élèves à un groupe spécifique.
 * Inclut des fonctionnalités de recherche, de filtrage par classe/niveau/groupe et de sélection multiple.
 * 
 * @param {AddStudentToGroupModalProps} props - Propriétés du composant.
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

export const AddStudentToGroupModal: React.FC<AddStudentToGroupModalProps> = ({
    showModal,
    handleCloseModal,
    groupId,
    groupName,
    onAdded
}) => {
    const { states, actions } = useAddStudentToGroupFlow(showModal, groupId, onAdded, handleCloseModal);

    const {
        students,
        classes,
        groups,
        niveaux,
        loading,
        saving,
        searchQuery,
        selectedClasses,
        selectedGroups,
        selectedNiveaux,
        sortBy,
        showFilters,
        selectedStudentIds
    } = states;

    const {
        setSearchQuery,
        setSelectedClasses,
        setSelectedGroups,
        setSelectedNiveaux,
        setSortBy,
        setShowFilters,
        handleToggleStudent,
        handleSelectAll,
        handleSave
    } = actions;

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
                        Ajouter ({selectedStudentIds.length})
                    </Button>
                </>
            }
        >
            {/* Search & Filters - Sticky Header */}
            <div className="sticky top-0 z-20 bg-surface border-b border-white/10 p-4 space-y-3 shadow-md">
                <div className="flex gap-2">
                    <Input
                        placeholder="Rechercher un enfant..."
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
                        {(selectedClasses.length > 0 || selectedGroups.length > 0 || selectedNiveaux.length > 0) && (
                            <Badge variant="primary" size="xs" className="ml-1">
                                {selectedClasses.length + selectedGroups.length + selectedNiveaux.length}
                            </Badge>
                        )}
                    </Button>
                    <button
                        onClick={() => handleSelectAll(students.map(s => s.id))}
                        className="px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        <Check size={18} className="sm:hidden" />
                        <span className="hidden sm:inline">Tout sélect.</span>
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="pt-2 animate-in slide-in-from-top-2 space-y-4 border-t border-white/5 mt-2 overflow-y-auto max-h-[40vh]">
                        {/* Levels Filter */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <Layers size={12} /> Niveaux
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
                                {niveaux.length === 0 && <span className="text-xs text-gray-600 italic">Aucun niveau</span>}
                            </div>
                        </div>

                        {/* Classes Filter */}
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
                                {classes.length === 0 && <span className="text-xs text-gray-600 italic">Aucune classe</span>}
                            </div>
                        </div>

                        {/* Groups Filter (Others) */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <Layers size={12} /> Autres Groupes
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {groups.filter(g => g.id !== groupId).map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setSelectedGroups(prev =>
                                            prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                                        )}
                                        className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                                            selectedGroups.includes(g.id)
                                                ? "bg-secondary/20 border-secondary text-secondary"
                                                : "bg-white/5 border-transparent text-gray-400 hover:border-white/10"
                                        )}
                                    >
                                        {g.nom}
                                    </button>
                                ))}
                                {groups.length <= 1 && <span className="text-xs text-gray-600 italic">Aucun autre groupe</span>}
                            </div>
                        </div>

                        {/* Sorting Options */}
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

            {/* Students List */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Chargement des élèves...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-xl bg-white/5 border border-dashed border-white/10 mx-auto max-w-sm">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                        <h3 className="text-lg font-medium text-white">Aucun élève trouvé</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {searchQuery || selectedClasses.length > 0 || selectedGroups.length > 0
                                ? "Essaie de modifier tes filtres."
                                : "Tous les élèves sont déjà dans ce groupe !"}
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
                                            ? "bg-primary/10 border-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]"
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

export default AddStudentToGroupModal;
