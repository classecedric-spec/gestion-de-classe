import React, { ChangeEvent } from 'react';
import clsx from 'clsx';
import { BookOpen, GraduationCap, Plus, Search, LayoutGrid, Table as TableIcon, ArrowUp, ArrowDown, ArrowUpDown, Edit, Trash2, Tag } from 'lucide-react';
import { Badge, Button, EmptyState, Avatar, SmartTabs, ListItem, CardInfo, CardList, CardTabs, Input, ConfirmModal, InfoSection, InfoRow } from '../components/ui';
import { User, ShieldCheck } from 'lucide-react';

// Feature Hooks & Services
import { useClasses } from '../features/classes/hooks/useClasses';
import { StudentWithRelations } from '../features/classes/services/classService';

// Modals
import AddClassModal from '../features/classes/components/AddClassModal';
import StudentModal from '../features/students/components/StudentModal';
import AddStudentToClassModal from '../components/AddStudentToClassModal';

// --- Sub Components for Views ---

interface TableViewProps {
    students: StudentWithRelations[];
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    onUpdateStudent: (id: string, field: string, value: any) => void;
    onEditStudent: (student: StudentWithRelations) => void;
    onRemoveStudent: (e: React.MouseEvent, id: string) => void;
}

const TableView: React.FC<TableViewProps> = ({ students, sortConfig, onSort, onUpdateStudent, onEditStudent, onRemoveStudent }) => {
    return (
        <div className="rounded-xl border border-white/5 bg-surface/30 overflow-hidden">
            <table className="w-full text-sm text-left student-table">
                <thead className="text-xs text-grey-medium uppercase bg-surface/50 border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        <SortableTh label="Prénom" sortKey="prenom" config={sortConfig} onSort={onSort} />
                        <SortableTh label="Nom" sortKey="nom" config={sortConfig} onSort={onSort} />
                        <SortableTh label="Sexe" sortKey="sex" config={sortConfig} onSort={onSort} width="w-24" />
                        <SortableTh label="Date de naissance" sortKey="date_naissance" config={sortConfig} onSort={onSort} />
                        <th className="px-4 py-3 font-bold w-24 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {students.map(student => (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={student.prenom || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'prenom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                    title="Prénom de l'élève"
                                    placeholder="Prénom"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={student.nom || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'nom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                    title="Nom de l'élève"
                                    placeholder="Nom"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <select
                                    value={student.sex || ''}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => onUpdateStudent(student.id, 'sex', e.target.value)}
                                    title="Sexe de l'élève"
                                    className={clsx(
                                        "w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium cursor-pointer appearance-none",
                                        student.sex === 'M' ? "text-blue-400" : student.sex === 'F' ? "text-pink-400" : "text-grey-medium"
                                    )}
                                >
                                    <option value="" className="bg-surface text-grey-medium">-</option>
                                    <option value="M" className="bg-surface text-blue-400">G</option>
                                    <option value="F" className="bg-surface text-pink-400">F</option>
                                </select>
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="date"
                                    value={student.date_naissance || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'date_naissance', e.target.value)}
                                    title="Date de naissance de l'élève"
                                    placeholder="JJ/MM/AAAA"
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all text-grey-light [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                />
                            </td>
                            <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditStudent(student)}
                                        className="h-8 w-8 p-0"
                                        title="Modifier l'élève"
                                        icon={Edit}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => onRemoveStudent(e, student.id)}
                                        className="h-8 w-8 p-0 text-danger hover:text-danger hover:bg-danger/10"
                                        title="Supprimer l'élève de la classe"
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

interface GridViewProps {
    students: StudentWithRelations[];
    onEditStudent: (student: StudentWithRelations) => void;
    onRemoveStudent: (e: React.MouseEvent, id: string) => void;
}

const GridView: React.FC<GridViewProps> = ({ students, onEditStudent, onRemoveStudent }) => {
    return (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
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
                    noTruncate={true}
                    className="pr-5"
                    avatar={{
                        src: student.photo_base64,
                        initials: (student.prenom || '?')[0] + (student.nom || '?')[0],
                        className: student.photo_base64 ? "bg-[#D9B981]" : "bg-input"
                    }}
                />
            ))}
        </div>
    );
};

interface SortableThProps {
    label: string;
    sortKey: string;
    config: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    width?: string;
}

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

const Classes: React.FC = () => {
    const {
        // Data
        filteredClasses,
        loading,
        loadingStudents,
        selectedClass,
        studentsInClass,
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        sortConfig,

        // Actions
        handleSelectClass,
        handleSort,
        handleAddClass,
        handleUpdateClass,
        handleDeleteClass,
        handleAddStudent,
        handleRemoveStudent,
        handleUpdateStudent,
        refreshStudents,

        // Modal State
        modals,
        activeItem,
        toggleModal
    } = useClasses();

    const [activeDetailTab, setActiveDetailTab] = React.useState('students');

    // --- Height Synchronization ---
    const leftHeaderRef = React.useRef<HTMLDivElement>(null);
    const rightHeaderRef = React.useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = React.useState<number | undefined>(undefined);

    // Local state for student removal confirmation
    const [studentToRemove, setStudentToRemove] = React.useState<string | null>(null);

    // --- Height Measure Effect ---
    React.useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftHeaderRef.current;
            const rightEl = rightHeaderRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50);
        const t2 = setTimeout(syncHeight, 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [filteredClasses.length, selectedClass, searchQuery]);

    const handleCreateClass = () => toggleModal('createEditClass', true, null);

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* Sidebar Column */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftHeaderRef}
                    height={headerHeight}
                    contentClassName="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <BookOpen className="text-primary" size={24} />
                            Liste des Classes
                        </h2>
                        <Badge variant="primary" size="sm">
                            {filteredClasses.length} Total
                        </Badge>
                    </div>
                    <Input
                        placeholder="Rechercher une classe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={Search}
                        className="bg-background/50"
                    />
                </CardInfo>

                <CardList
                    actionLabel="Nouvelle Classe"
                    onAction={handleCreateClass}
                    actionIcon={Plus}
                >
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Avatar size="md" loading={true} initials="" />
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <EmptyState
                            icon={BookOpen}
                            title="Aucune classe"
                            description="Commencez par créer une nouvelle classe."
                            size="sm"
                        />
                    ) : (
                        filteredClasses.map((classe) => {
                            const principalAdult = classe.ClasseAdulte?.find(ca => ca.role === 'principal')?.Adulte?.nom;

                            return (
                                <ListItem
                                    key={classe.id}
                                    id={classe.id}
                                    title={classe.nom}
                                    subtitle={principalAdult ? `Pr. ${principalAdult}` : (classe.acronyme || 'Sans acronyme')}
                                    isSelected={selectedClass?.id === classe.id}
                                    onClick={() => handleSelectClass(classe)}
                                    onEdit={() => toggleModal('createEditClass', true, classe)}
                                    onDelete={() => toggleModal('deleteConfirm', true, classe)}
                                    deleteTitle="Supprimer la classe"
                                    avatar={{
                                        src: (classe as any).photo_base64 || classe.logo_url,
                                        initials: classe.acronyme || (classe.nom ? classe.nom[0] : '?'),
                                        className: ((classe as any).photo_base64 || classe.logo_url) ? "bg-[#D9B981]" : "bg-background"
                                    }}
                                />
                            );
                        })
                    )}
                </CardList>
            </div>

            {/* Main Content Column */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                {!selectedClass ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={BookOpen}
                            title="Sélectionnez une classe"
                            description="Choisissez une classe dans la liste pour voir les élèves et les détails."
                            size="lg"
                        />
                    </div>
                ) : (
                    <>
                        <CardInfo
                            ref={rightHeaderRef}
                            height={headerHeight}
                        >
                            <div className="flex gap-6 items-center">
                                <Avatar
                                    size="xl"
                                    src={(selectedClass as any).photo_base64 || selectedClass.logo_url}
                                    initials={selectedClass.acronyme || (selectedClass.nom ? selectedClass.nom[0] : '?')}
                                    className={((selectedClass as any).photo_base64 || selectedClass.logo_url) ? "bg-[#D9B981]" : "bg-input"}
                                />
                                <div>
                                    <h1 className="text-cq-xl font-black text-text-main mb-2 tracking-tight">{selectedClass.nom}</h1>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="primary" size="sm" style="outline">
                                            {selectedClass.acronyme || 'N/A'}
                                        </Badge>
                                        <div className="w-1 h-1 rounded-full bg-grey-dark" />
                                        <p className="text-grey-medium text-sm font-medium">
                                            <strong className="text-text-main">{studentsInClass.length}</strong> {studentsInClass.length > 1 ? 'Enfants' : 'Enfant'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardInfo>

                        <CardTabs
                            tabs={[
                                { id: 'students', label: 'Liste des élèves', icon: GraduationCap },
                                { id: 'details', label: 'Détails', icon: BookOpen }
                            ]}
                            activeTab={activeDetailTab}
                            onChange={setActiveDetailTab}
                            contentClassName="flex flex-col h-full bg-background/5"
                            actionLabel={activeDetailTab === 'students' ? "Ajouter un enfant" : undefined}
                            onAction={activeDetailTab === 'students' ? () => toggleModal('addStudentToClass', true) : undefined}
                            actionIcon={Plus}
                        >
                            {activeDetailTab === 'students' ? (
                                <div className="flex flex-col h-full">
                                    <div className="px-6 py-2 border-b border-white/5 flex items-center gap-4">
                                        <SmartTabs
                                            tabs={[
                                                { id: 'grid', label: 'Grille', icon: LayoutGrid },
                                                { id: 'table', label: 'Tableau', icon: TableIcon }
                                            ]}
                                            activeTab={viewMode}
                                            onChange={(id) => setViewMode(id as 'grid' | 'table')}
                                            level={3}
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar relative">
                                        {loadingStudents ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                <Avatar size="lg" loading={true} initials="" />
                                                <p className="text-grey-medium animate-pulse text-[10px] uppercase tracking-widest font-bold">Chargement...</p>
                                            </div>
                                        ) : studentsInClass.length === 0 ? (
                                            <EmptyState
                                                icon={GraduationCap}
                                                title="Aucun enfant"
                                                description="Aucun enfant dans cette classe. Commencez par ajouter des élèves."
                                                size="md"
                                            />
                                        ) : viewMode === 'table' ? (
                                            <TableView
                                                students={studentsInClass}
                                                sortConfig={sortConfig as any}
                                                onSort={handleSort}
                                                onUpdateStudent={handleUpdateStudent}
                                                onEditStudent={(student: any) => toggleModal('studentDetails', true, student)}
                                                onRemoveStudent={(e: any, id: string) => {
                                                    e.stopPropagation();
                                                    setStudentToRemove(id);
                                                }}
                                            />
                                        ) : (
                                            <GridView
                                                students={studentsInClass}
                                                onEditStudent={(student: any) => toggleModal('studentDetails', true, student)}
                                                onRemoveStudent={(e: any, id: string) => {
                                                    e.stopPropagation();
                                                    setStudentToRemove(id);
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InfoSection title="Informations de la Classe">
                                        <InfoRow
                                            icon={BookOpen}
                                            label="Nom de la classe"
                                            value={selectedClass.nom}
                                        />
                                        <InfoRow
                                            icon={Tag}
                                            label="Acronyme"
                                            value={selectedClass.acronyme || 'N/A'}
                                        />
                                    </InfoSection>

                                    <InfoSection title="Équipe Pédagogique">
                                        {selectedClass.ClasseAdulte && selectedClass.ClasseAdulte.length > 0 ? (
                                            selectedClass.ClasseAdulte.map((ca, idx) => (
                                                <InfoRow
                                                    key={idx}
                                                    icon={ca.role === 'principal' ? ShieldCheck : User}
                                                    label={ca.role === 'principal' ? 'Titulaire' : ca.role === 'coenseignant' ? 'Co-Enseignant' : 'Intervenant'}
                                                    value={ca.Adulte ? `${ca.Adulte.prenom} ${ca.Adulte.nom}` : 'Enseignant inconnu'}
                                                />
                                            ))
                                        ) : (
                                            <p className="text-grey-medium italic opacity-60">Aucun enseignant assigné.</p>
                                        )}
                                    </InfoSection>
                                </div>
                            )}
                        </CardTabs>
                    </>
                )}
            </div>

            {/* --- Modals --- */}

            {/* Create/Edit Class */}
            <AddClassModal
                isOpen={modals.createEditClass}
                onClose={() => toggleModal('createEditClass', false)}
                onAdded={(c) => {
                    if (activeItem.classToEdit && c) {
                        handleUpdateClass(c as any);
                    } else if (c) {
                        handleAddClass(c as any);
                    }
                }}
                classToEdit={activeItem.classToEdit}
            />

            {/* Student Details (Global Student Modal) */}
            <StudentModal
                showModal={modals.studentDetails}
                onClose={() => toggleModal('studentDetails', false)}
                isEditing={!!activeItem.studentToEditId}
                editId={activeItem.studentToEditId}
                onSaved={(student) => {
                    if (activeItem.studentToEditId) {
                        refreshStudents();
                    } else if (student) {
                        handleAddStudent(student);
                    }
                }}
            />

            {/* Add Student To Class (Existing Student) */}
            <AddStudentToClassModal
                showModal={modals.addStudentToClass}
                handleCloseModal={() => toggleModal('addStudentToClass', false)}
                classId={selectedClass?.id || ''}
                className={selectedClass?.nom || ''}
                onAdded={() => refreshStudents()}
            />

            {/* Delete Class Confirmation */}
            <ConfirmModal
                isOpen={modals.deleteConfirm && !!activeItem.classToDelete}
                onClose={() => toggleModal('deleteConfirm', false)}
                onConfirm={handleDeleteClass}
                title="Supprimer la classe ?"
                message={`Êtes-vous sûr de vouloir supprimer "${activeItem.classToDelete?.nom || 'cette classe'}" ? Les élèves ne seront pas supprimés.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />

            {/* Remove Student Confirmation */}
            <ConfirmModal
                isOpen={!!studentToRemove}
                onClose={() => setStudentToRemove(null)}
                onConfirm={() => {
                    if (studentToRemove) handleRemoveStudent(studentToRemove);
                    setStudentToRemove(null);
                }}
                title="Retirer l'élève ?"
                message="Voulez-vous retirer cet élève de la classe ?"
                confirmText="Retirer"
                cancelText="Annuler"
                variant="warning"
            />
        </div>
    );
};

export default Classes;
