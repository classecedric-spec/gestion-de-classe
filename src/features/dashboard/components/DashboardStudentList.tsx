/**
 * Nom du module/fichier : DashboardStudentList.tsx
 * 
 * Données en entrée : 
 *   - students : La liste complète de tous les élèves rattachés à l'enseignant.
 *   - activeGroup : Le groupe (classe) actuellement sélectionné pour le filtrage.
 *   - groups : La liste des groupes disponibles.
 *   - searchQuery : Le texte saisi par l'utilisateur pour rechercher un élève par nom/prénom.
 *   - onStudentClick : Fonction pour naviguer vers le profil d'un élève.
 * 
 * Données en sortie : Une grille d'élèves filtrable et triée par niveau scolaire.
 * 
 * Objectif principal : Offrir un annuaire visuel et interactif des élèves. Ce composant permet de trouver rapidement un enfant, de filtrer par classe ou par nom, et d'accéder à sa fiche individuelle d'un simple clic. Les élèves sont regroupés par niveau (ex: PS, MS, GS) pour une meilleure lisibilité.
 */

import React, { useMemo } from 'react';
import { Users, ChevronRight, Search } from 'lucide-react';
import { getInitials } from '../../../lib/helpers';
import { Student, Group } from '../../attendance/services/attendanceService';
import { Avatar, EmptyState, Badge, Input } from '../../../core';

interface DashboardStudentListProps {
    students: Student[];
    activeGroup: Group | null;
    groups: Group[];
    onGroupChange: (group: Group | null) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onStudentClick: (student: Student) => void;
}

/**
 * Composant de liste des élèves avec recherche et filtrage par groupe.
 */
const DashboardStudentList: React.FC<DashboardStudentListProps> = ({
    students,
    activeGroup,
    groups,
    onGroupChange,
    searchQuery,
    onSearchChange,
    onStudentClick
}) => {

    // LOGIQUE DE FILTRAGE : On combine le filtre par groupe et la recherche textuelle.
    const filteredStudents = useMemo(() => {
        let filtered = students;

        // Si un groupe spécifique est sélectionné, on ne garde que ses élèves.
        if (activeGroup) {
            filtered = filtered.filter(s => s.groupe_id === activeGroup.id);
        }

        // Si une recherche est en cours, on filtre sur le prénom ou le nom.
        if (searchQuery) {
            filtered = filtered.filter(s =>
                s.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.nom?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [students, searchQuery, activeGroup]);

    // LOGIQUE DE RANGEMENT : On regroupe les élèves filtrés par leur niveau (PS, MS, GS, etc.).
    const sortedLevels = useMemo(() => {
        const studentsByLevel = filteredStudents.reduce((acc, student) => {
            const levelName = student.Niveau?.nom || 'Sans niveau';
            const levelOrder = student.Niveau?.ordre || 999;
            if (!acc[levelName]) {
                acc[levelName] = {
                    order: levelOrder,
                    students: []
                };
            }
            acc[levelName].students.push(student);
            return acc;
        }, {} as Record<string, { order: number; students: Student[] }>);

        // On trie les niveaux selon leur ordre défini (ex: PS avant MS).
        const sorted = Object.entries(studentsByLevel).sort((a, b) => a[1].order - b[1].order);

        // Dans chaque niveau, on trie les élèves par prénom (ordre alphabétique).
        sorted.forEach(([, data]) => {
            data.students.sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''));
        });

        return sorted;
    }, [filteredStudents]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* Barre de titre et compteur */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                        <Users className="text-primary" /> Vos Élèves
                    </h2>
                    <Badge variant="secondary" size="sm">
                        {filteredStudents.length} / {students.length}
                    </Badge>
                </div>

                {/* Filtres de recherche et de sélection de groupe */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:max-w-md">
                        <Input
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            icon={Search}
                            className="bg-surface border-white/5 focus:border-primary/50"
                        />
                    </div>

                    {groups && groups.length > 0 && (
                        <div className="w-full md:w-64">
                            <select
                                value={activeGroup?.id || ''}
                                onChange={(e) => {
                                    const group = groups.find(g => g.id === e.target.value);
                                    onGroupChange(group || null);
                                }}
                                className="w-full h-10 px-3 rounded-xl bg-surface border border-white/5 text-sm text-text-main focus:outline-none focus:border-primary/50"
                            >
                                <option value="">Tous les groupes</option>
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Affichage des groupes par niveau */}
            <div className="space-y-12">
                {sortedLevels.map(([levelName, { students: levelStudents }]) => (
                    <div key={levelName} className="space-y-4">
                        {/* En-tête du niveau scolaire */}
                        <div className="flex items-center gap-3 px-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black text-grey-medium border border-white/5 uppercase tracking-widest">
                                {levelName}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        {/* Grille des élèves pour ce niveau */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {levelStudents.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => onStudentClick(student)}
                                    className="group relative bg-surface hover:bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-row items-center gap-4 transition-all hover:translate-x-1 hover:shadow-lg cursor-pointer"
                                >
                                    <Avatar
                                        size="md"
                                        src={student.photo_url}
                                        initials={getInitials(student as any)}
                                        className="group-hover:border-primary/50"
                                    />

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-text-main truncate">{student.prenom}</h3>
                                        <p className="text-[9px] font-black text-grey-medium uppercase tracking-tighter truncate">
                                            {student.Classe?.nom}
                                        </p>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-grey-dark group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* État vide si aucun élève ne correspond aux filtres */}
                {filteredStudents.length === 0 && (
                    <EmptyState
                        icon={Users}
                        title="Aucun élève trouvé"
                        description="Vérifiez vos filtres ou ajoutez de nouveaux élèves."
                        size="md"
                    />
                )}
            </div>
        </div>
    );
};

export default DashboardStudentList;
