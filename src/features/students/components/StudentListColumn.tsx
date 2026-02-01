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
            {/* Card 1: Title & Controls */}
            <CardInfo contentClassName="space-y-5">
                {/* Header Row: Title & Badge */}
                <div className="flex items-center justify-between">
                    <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                        <GraduationCap className="text-primary" size={24} />
                        Liste
                    </h2>
                    <Badge variant="default" size="xs">{filteredStudents.length} / {students.length}</Badge>
                </div>

                {/* Separator */}
                <div className="border-t border-white/10" />

                {/* Search & Filters */}
                <div className="space-y-4">
                    {/* Search & Toggle Row */}
                    <div className="flex gap-3">
                        <SearchBar
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            iconColor="text-primary"
                        />

                        {/* Filters Toggle Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={clsx(
                                "p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0",
                                showFilters
                                    ? "bg-primary text-text-dark border-primary shadow-lg shadow-primary/20"
                                    : "bg-surface/50 border-white/10 text-grey-medium hover:text-white hover:border-white/20"
                            )}
                            title="Afficher les filtres"
                        >
                            <SlidersHorizontal size={20} />
                        </button>
                    </div>

                    {/* Filters Row - Collapsible */}
                    {showFilters && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            <FilterSelect
                                options={[
                                    { value: 'all', label: 'Groupes: Tous' },
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
                                    { value: 'all', label: 'Classes: Tous' },
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

            {/* Card 2: List Only */}
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
                            deleteTitle="Supprimer l'élève"
                            avatar={{
                                src: student.photo_url,
                                initials: `${student.prenom[0]}${student.nom[0]}`,
                                editable: true,
                                loading: updatingPhotoId === student.id,
                                onImageChange: (file) => processAndSavePhoto(file, student),
                                onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(student.id); },
                                onDragLeave: (e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(null); },
                                onDrop: (e, file) => {
                                    e.preventDefault();
                                    e.stopPropagation();
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
                        title="Aucun élève trouvé"
                        description="Essayez d'ajuster vos filtres de recherche"
                        size="sm"
                    />
                )}
            </CardList>
        </div>
    );
};
