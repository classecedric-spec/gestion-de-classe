/**
 * Nom du module/fichier : ClassDetails.tsx
 * 
 * Données en entrée : 
 *   - selectedClass : L'objet contenant les informations de la classe sélectionnée (Nom, Acronyme, Logo).
 *   - students : La liste des élèves rattachés à cette classe.
 *   - loadingStudents : Indicateur visuel indiquant si la liste est en cours de téléchargement.
 *   - viewMode : Choix de l'enseignant pour l'affichage (Grille 'Trombinoscope' ou Tableau 'Administratif').
 *   - Fonctions d'interaction (onSort, onUpdateStudent, onEditStudent, etc.) permettant de piloter les changements.
 * 
 * Données en sortie : Un panneau d'affichage riche et interactif occupant la partie centrale de l'écran.
 * 
 * Objectif principal : Servir de centre de pilotage pour une classe précise. C'est l'espace où l'enseignant gère sa liste d'élèves au quotidien. Il offre une flexibilité totale entre une vue visuelle (pour reconnaître les visages) et une vue sous forme de tableau (pour les modifications administratives rapides comme corriger un nom ou une date de naissance).
 * 
 * Ce que ça affiche : 
 *    - Un en-tête stylisé avec le blason de la classe et les statistiques (nombre d'enfants).
 *    - Une barre d'outils pour alterner entre les modes d'affichage.
 *    - La liste des élèves, soit sous forme de cartes d'identité, soit sous forme de tableau éditable.
 */

import React, { ChangeEvent } from 'react';
import { BookOpen, GraduationCap, LayoutGrid, Table as TableIcon, ArrowUp, ArrowDown, ArrowUpDown, Edit, Trash2, Plus } from 'lucide-react';
import clsx from 'clsx';
import { ClassWithAdults, StudentWithRelations } from '../services/classService';
import { Badge, Button, EmptyState, Avatar, Tabs, ListItem } from '../../../core';

export interface ClassDetailsProps {
    selectedClass: ClassWithAdults | null;
    students: StudentWithRelations[];
    loadingStudents: boolean;
    viewMode: 'grid' | 'table';
    setViewMode: (mode: 'grid' | 'table') => void;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    onUpdateStudent: (id: string, field: string, value: any) => void;
    onEditStudent: (student: StudentWithRelations) => void;
    onRemoveStudent: (e: React.MouseEvent, id: string) => void;
    onAddStudent: () => void;
}

/**
 * Composant principal affichant le contenu détaillé d'une classe.
 */
const ClassDetails: React.FC<ClassDetailsProps> = ({
    selectedClass,
    students,
    loadingStudents,
    viewMode,
    setViewMode,
    sortConfig,
    onSort,
    onUpdateStudent,
    onEditStudent,
    onRemoveStudent,
    onAddStudent
}) => {

    /**
     * État initial : Si aucune classe n'est sélectionnée, on affiche un message pédagogique 
     * invitant l'utilisateur à choisir une classe dans la barre latérale.
     */
    if (!selectedClass) {
        return (
            <EmptyState
                icon={BookOpen}
                title="Sélectionnez une classe"
                description="Choisissez une classe dans la liste à gauche pour voir ses élèves et gérer les détails."
                size="lg"
                className="flex-1 bg-surface/80 backdrop-blur-md rounded-2xl border border-border/5 shadow-xl"
            />
        );
    }

    return (
        <div className="flex-1 bg-surface/80 backdrop-blur-md rounded-2xl border border-border/5 overflow-hidden shadow-xl flex flex-col relative text-text-main animate-in slide-in-from-right-4 duration-300">

            {/* EN-TÊTE : Identité visuelle de la classe sélectionnée */}
            <div className="p-8 border-b border-border/5 flex items-start justify-between bg-surface/30">
                <div className="flex gap-6 items-center">
                    <Avatar
                        size="xl"
                        src={(selectedClass as any).photo_base64 || selectedClass.logo_url}
                        initials={selectedClass.acronyme || (selectedClass.nom ? selectedClass.nom[0] : '?')}
                        className={clsx(
                            ((selectedClass as any).photo_base64 || selectedClass.logo_url) ? "bg-[#D9B981]" : "bg-input"
                        )}
                    />
                    <div>
                        <h1 className="text-3xl font-black text-text-main mb-2 tracking-tight">{selectedClass.nom}</h1>
                        <div className="flex items-center gap-3">
                            <Badge variant="primary" size="sm" style="outline">
                                {selectedClass.acronyme || 'N/A'}
                            </Badge>
                            <div className="w-1 h-1 rounded-full bg-grey-dark" />
                            <p className="text-grey-medium text-sm font-medium">
                                <strong className="text-text-main">{students.length}</strong> {students.length > 1 ? 'Élèves' : 'Élève'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRE D'OUTILS : Gestion de l'affichage (Grille ou Tableau) */}
            <div className="px-6 py-4 border-b border-border/5 bg-surface/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-grey-dark flex items-center gap-2">
                    <GraduationCap size={16} className="text-primary" />
                    Registre de la Classe
                </h3>
                <Tabs
                    tabs={[
                        { id: 'grid', label: 'Trombinoscope', icon: LayoutGrid },
                        { id: 'table', label: 'Tableau', icon: TableIcon }
                    ]}
                    activeTab={viewMode}
                    onChange={(id) => setViewMode(id as 'grid' | 'table')}
                    variant="capsule"
                />
            </div>

            {/* CONTENU PRINCIPAL : La liste des élèves */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar relative">
                {loadingStudents ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Avatar size="lg" loading={true} initials="" />
                        <p className="text-grey-medium animate-pulse text-xs uppercase tracking-widest">Récupération des élèves...</p>
                    </div>
                ) : students.length === 0 ? (
                    <EmptyState
                        icon={GraduationCap}
                        title="Classe vide"
                        description="Cette classe ne contient pas encore d'élèves. Vous pouvez en importer ou en ajouter manuellement."
                        size="md"
                        action={
                            <Button variant="primary" size="sm" onClick={onAddStudent} icon={Plus}>
                                Ajouter un élève
                            </Button>
                        }
                    />
                ) : viewMode === 'table' ? (
                    <TableView
                        students={students}
                        sortConfig={sortConfig}
                        onSort={onSort}
                        onUpdateStudent={onUpdateStudent}
                        onEditStudent={onEditStudent}
                        onRemoveStudent={onRemoveStudent}
                    />
                ) : (
                    <GridView
                        students={students}
                        onEditStudent={onEditStudent}
                        onRemoveStudent={onRemoveStudent}
                    />
                )}
            </div>

            {/* PIED DE PAGE : Bouton d'ajout rapide */}
            <div className="p-6 border-t border-border/5 bg-surface/30">
                <Button
                    onClick={onAddStudent}
                    variant="secondary"
                    className="w-full border-dashed"
                    size="lg"
                    icon={Plus}
                >
                    Ajouter un enfant à cette classe
                </Button>
            </div>
        </div>
    );
};

// --- SOUS-COMPOSANTS : Les différentes vues ---

/**
 * Vue Tableau : Idéale pour les modifications administratives rapides 
 * (correction de nom, de date de naissance, de sexe) directement dans la liste.
 */
const TableView: React.FC<TableViewProps> = ({ students, sortConfig, onSort, onUpdateStudent, onEditStudent, onRemoveStudent }) => {
    return (
        <div className="rounded-xl border border-white/5 bg-surface/30 overflow-hidden">
            <table className="w-full text-sm text-left student-table">
                <thead className="text-xs text-grey-medium uppercase bg-surface/50 border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        <SortableTh label="Prénom" sortKey="prenom" config={sortConfig} onSort={onSort} />
                        <SortableTh label="Nom" sortKey="nom" config={sortConfig} onSort={onSort} />
                        <SortableTh label="Sexe" sortKey="sex" config={sortConfig} onSort={onSort} width="w-24" />
                        <SortableTh label="Naissance" sortKey="date_naissance" config={sortConfig} onSort={onSort} />
                        <th className="px-4 py-3 font-bold w-24 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {students.map(student => (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                            {/* Les champs sont de simples entrées de texte pour une édition "au clic" */}
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={student.prenom || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'prenom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                    title="Prénom de l'élève"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={student.nom || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'nom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                    title="Nom de l'élève"
                                />
                            </td>
                            <td className="px-2 py-2 text-center">
                                <select
                                    value={student.sex || ''}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => onUpdateStudent(student.id, 'sex', e.target.value)}
                                    title="Sexe de l'élève"
                                    className={clsx(
                                        "w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium cursor-pointer appearance-none",
                                        student.sex === 'M' ? "text-blue-400 font-black" : student.sex === 'F' ? "text-pink-400 font-black" : "text-grey-medium"
                                    )}
                                >
                                    <option value="" className="bg-surface text-grey-medium">-</option>
                                    <option value="M" className="bg-surface text-blue-400 font-bold">G</option>
                                    <option value="F" className="bg-surface text-pink-400 font-bold">F</option>
                                </select>
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="date"
                                    value={student.date_naissance || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'date_naissance', e.target.value)}
                                    title="Date de naissance de l'élève"
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all text-grey-light cursor-pointer"
                                />
                            </td>
                            <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditStudent(student)}
                                        className="h-8 w-8 p-0"
                                        title="Détails complets de l'élève"
                                        icon={Edit}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => onRemoveStudent(e, student.id)}
                                        className="h-8 w-8 p-0 text-danger hover:text-danger hover:bg-danger/10"
                                        title="Retirer cet élève de la classe"
                                        icon={Trash2}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/**
 * Vue Grille : La fameuse "vue trombinoscope" privilégiée pour une vision d'ensemble 
 * et une reconnaissance faciale des élèves.
 */
const GridView: React.FC<GridViewProps> = ({ students, onEditStudent, onRemoveStudent }) => {
    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
            {students.map(student => (
                <ListItem
                    key={student.id}
                    id={student.id}
                    title={`${student.prenom} ${student.nom}`}
                    subtitle={student.EleveGroupe && student.EleveGroupe.length > 0 ? (student.EleveGroupe[0] as any).Groupe?.nom : 'Sans groupe'}
                    onClick={() => onEditStudent(student)}
                    onDelete={() => onRemoveStudent({ stopPropagation: () => { } } as any, student.id)}
                    onEdit={() => onEditStudent(student)}
                    deleteTitle="Retirer de la classe"
                    avatar={{
                        src: student.photo_base64,
                        initials: (student.prenom || '?')[0] + (student.nom || '?')[0],
                        className: student.photo_base64 ? "bg-[#D9B981] p-1" : "bg-input"
                    }}
                />
            ))}
        </div>
    );
};

/**
 * Outil de tri : Un titre de colonne sur lequel on peut cliquer pour organiser 
 * la liste de A à Z ou de Z à A.
 */
const SortableTh: React.FC<SortableThProps> = ({ label, sortKey, config, onSort, width }) => (
    <th
        className={clsx("px-4 py-3 font-bold cursor-pointer hover:bg-white/10 transition-colors select-none group/th", width)}
        onClick={() => onSort(sortKey)}
    >
        <div className="flex items-center gap-1">
            {label}
            {config.key === sortKey ? (
                config.direction === 'asc' ? <ArrowUp size={12} className="text-primary" /> : <ArrowDown size={12} className="text-primary" />
            ) : <ArrowUpDown size={12} className="opacity-0 group-hover/th:opacity-50" />}
        </div>
    </th>
);

export default ClassDetails;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant choisit "CM1-Vert" dans sa liste latérale.
 * 2. `ClassDetails` reçoit les informations : le blason s'affiche en grand.
 * 3. Par défaut, l'enseignant voit ses 25 élèves sous forme de tableau interactif.
 * 4. Il remarque une erreur sur la date de naissance d'un enfant :
 *    - Il clique directement sur la case de la date et corrige le jour.
 *    - La modification est transmise instantanément au serveur.
 * 5. Il souhaite organiser sa liste par groupe de soutien :
 *    - Il utilise le menu de tri en haut du tableau pour regrouper les élèves selon leurs besoins.
 * 6. S'il souhaite voir les photos :
 *    - Il clique sur l'onglet "Trombinoscope", l'affichage bascule vers une vue en grille visuelle.
 */
