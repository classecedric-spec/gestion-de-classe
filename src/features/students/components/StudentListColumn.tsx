/**
 * Nom du module/fichier : StudentListColumn.tsx
 * 
 * Données en entrée : 
 *   - students / filteredStudents : Les listes intégrale et filtrée des élèves de l'enseignant.
 *   - searchQuery / filterClass / filterGroup : Les réglages actuels de recherche et de tri.
 *   - selectedStudent : L'élève sur lequel l'enseignant a cliqué.
 *   - Fonctions d'action : Fonctions pour sélectionner, créer, éditer ou supprimer un élève.
 *   - Logique Photo : Outils pour gérer le changement de photo par glisser-déposer.
 * 
 * Données en sortie : Une colonne latérale interactive servant de trombinoscope et de moteur de recherche pour la classe.
 * 
 * Objectif principal : Offrir une navigation fluide et visuelle dans l'effectif de la classe. L'enseignant peut trouver un élève en un clin d'œil en tapant son nom ou en filtrant par classe/groupe. Le composant affiche des indicateurs de "tendance" (flèches colorées) pour savoir d'un coup d'œil quels élèves progressent ou stagnent. C'est également le point d'entrée pour ajouter de nouveaux élèves ou mettre à jour leurs portraits.
 * 
 * Ce que ça affiche : Une barre de recherche, des menus de filtrage escamotables, et une liste défilante de fiches élèves avec photos et indicateurs.
 */

import React from 'react';
import {
    Search, GraduationCap, Loader2, Filter, Plus, Users, SlidersHorizontal, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import clsx from 'clsx';
import { Badge, EmptyState, SearchBar, FilterSelect, CardInfo, CardList, ListItem } from '../../../core';

interface StudentListColumnProps {
    students: any[];
    filteredStudents: any[];
    loading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    filterGroup: string;
    setFilterGroup: (group: string) => void;
    filterClass: string;
    setFilterClass: (cls: string) => void;
    selectedStudent: any;
    setSelectedStudent: (student: any) => void;
    handleOpenCreate: () => void;
    handleEdit: (student: any) => void;
    setStudentToDelete: (student: any) => void;
    // Avatar Logic Props
    updatingPhotoId: string | null;
    draggingPhotoId: string | null;
    setDraggingPhotoId: (id: string | null) => void;
    processAndSavePhoto: (file: File, student: any) => void;
}

/**
 * Composant affichant la colonne de gauche (Trombinoscope et Recherche).
 */
export const StudentListColumn: React.FC<StudentListColumnProps> = ({
    students,
    filteredStudents,
    loading,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterGroup,
    setFilterGroup,
    filterClass,
    setFilterClass,
    selectedStudent,
    setSelectedStudent,
    handleOpenCreate,
    handleEdit,
    setStudentToDelete,
    updatingPhotoId,
    draggingPhotoId,
    setDraggingPhotoId,
    processAndSavePhoto
}) => {
    return (
        <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
            {/** 
             * BLOC 1 : TITRE, RECHERCHE ET FILTRES
             * C'est ici que l'enseignant paramètre ce qu'il souhaite voir.
             */}
            <CardInfo contentClassName="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                        <GraduationCap className="text-primary" size={24} />
                        Trombinoscope
                    </h2>
                    <Badge variant="default" size="xs">{filteredStudents.length} / {students.length}</Badge>
                </div>

                <div className="border-t border-white/10" />

                <div className="space-y-4">
                    <div className="flex gap-3">
                        {/** 
                         * RECHERCHE : Filtre la liste instantanément pendant la frappe.
                         */}
                        <SearchBar
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            iconColor="text-primary"
                        />

                        {/** 
                         * BOUTON FILTRES : Affiche ou masque les menus de sélection par Classe/Groupe.
                         */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={clsx(
                                "p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0",
                                showFilters
                                    ? "bg-primary text-text-dark border-primary shadow-lg shadow-primary/20"
                                    : "bg-surface/50 border-white/10 text-grey-medium hover:text-white hover:border-white/20"
                            )}
                            title="Filtrer la liste"
                        >
                            <SlidersHorizontal size={20} />
                        </button>
                    </div>

                    {/** 
                     * ZONE DE FILTRAGE (Escamotable) :
                     * Permet d'isoler une classe ou un groupe de besoin précis.
                     */}
                    {showFilters && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            <FilterSelect
                                options={[
                                    { value: 'all', label: 'Tous les Groupes' },
                                    ...Array.from(new Set(students.flatMap(s => s.EleveGroupe?.map((eg: any) => eg.Groupe?.nom)).filter(Boolean)))
                                        .sort()
                                        .map(g => ({ value: g as string, label: g as string }))
                                ]}
                                value={filterGroup}
                                onChange={(e) => setFilterGroup(e.target.value)}
                                icon={Users}
                                className="flex-1"
                            />

                            <FilterSelect
                                options={[
                                    { value: 'all', label: 'Toutes les Classes' },
                                    ...Array.from(new Set(students.map(s => s.Classe?.nom).filter(Boolean)))
                                        .map(c => ({ value: c as string, label: c as string }))
                                ]}
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                                icon={Filter}
                                className="flex-1"
                            />
                        </div>
                    )}
                </div>
            </CardInfo>

            {/** 
             * BLOC 2 : LISTE DES ÉLÈVES
             * Affiche chaque enfant avec sa photo et ses indicateurs.
             */}
            <CardList
                actionLabel="Ajouter un élève"
                onAction={handleOpenCreate}
                actionIcon={Plus}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="text-primary animate-spin" size={32} />
                    </div>
                ) : filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                        <ListItem
                            key={student.id}
                            id={student.id}
                            title={`${student.prenom} ${student.nom}`}
                            isSelected={selectedStudent?.id === student.id}
                            onClick={() => setSelectedStudent(student)}
                            onEdit={() => handleEdit(student)}
                            onDelete={() => setStudentToDelete(student)}
                            rightElement={
                                /** 
                                 * INDICATEUR DE TENDANCE :
                                 * Petite flèche colorée indiquant la dynamique de progrès de l'élève.
                                 */
                                student.trust_trend && (
                                    <div className={clsx(
                                        "p-1 rounded-full",
                                        student.trust_trend === 'up' && "text-success bg-success/10",
                                        student.trust_trend === 'down' && "text-danger bg-danger/10",
                                        student.trust_trend === 'stable' && "text-grey-dark bg-grey-dark/10"
                                    )}>
                                        {student.trust_trend === 'up' && <TrendingUp size={14} />}
                                        {student.trust_trend === 'down' && <TrendingDown size={14} />}
                                        {student.trust_trend === 'stable' && <Minus size={14} />}
                                    </div>
                                )
                            }
                            deleteTitle="Supprimer l'élève de la base"
                            avatar={{
                                src: student.photo_url,
                                initials: `${student.prenom[0]}${student.nom[0]}`,
                                editable: true,
                                // État de chargement si une photo est en cours d'envoi.
                                loading: updatingPhotoId === student.id,
                                onImageChange: (file) => processAndSavePhoto(file, student),
                                /**
                                 * MAGIE DU GLISSER-DÉPOSER :
                                 * Supporte le changement de photo d'un simple geste sur l'avatar.
                                 */
                                onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(student.id); },
                                onDragLeave: (e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(null); },
                                onDrop: (e, file) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setDraggingPhotoId(null);
                                    processAndSavePhoto(file, student);
                                },
                                className: clsx(
                                    draggingPhotoId === student.id && "ring-2 ring-primary scale-110 bg-primary/20"
                                )
                            }}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={Search}
                        title="Aucun élève correspondant"
                        description="Veuillez modifier votre recherche ou vos filtres de classe."
                        size="sm"
                    />
                )}
            </CardList>
        </div>
    );
};

export default StudentListColumn;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant arrive sur sa page de classe : il voit la liste complète de ses élèves avec leurs photos.
 * 2. Il tape "Ba" dans la recherche : `StudentListColumn` n'affiche plus que Baptiste et Basile.
 * 3. Il s'aperçoit qu'il y a trop de monde, il active les filtres :
 *    - Il sélectionne "Groupe : Soutien".
 *    - La liste se réduit aux élèves dont le nom contient "Ba" ET qui sont en soutien.
 * 4. Il remarque une flèche rouge à côté de Basile : il clique sur son nom pour voir ses difficultés à droite.
 * 5. Pour mettre à jour la photo de Basile, il prend le fichier sur son ordinateur, 
 *    le fait glisser sur le visage de Basile dans la liste, et lâche : la photo s'enregistre.
 */
