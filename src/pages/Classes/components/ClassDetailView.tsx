import React from 'react';
import { BookOpen, GraduationCap, Plus, LayoutGrid, Table as TableIcon, Tag, ShieldCheck, Users } from 'lucide-react';
import { Badge, Avatar, CardInfo, CardTabs, Tabs, EmptyState, InfoSection, InfoRow } from '../../../core';
import { ClassWithAdults, StudentWithRelations } from '../../../features/classes/services/classService';
import { ClassTableView } from './ClassTableView';
import { ClassGridView } from './ClassGridView';

interface ClassDetailViewProps {
    selectedClass: ClassWithAdults;
    studentsInClass: StudentWithRelations[];
    loadingStudents: boolean;
    headerHeight?: number;
    headerRef: React.RefObject<HTMLDivElement | null>;
    activeDetailTab: string;
    setActiveDetailTab: (tab: string) => void;
    viewMode: 'grid' | 'table';
    setViewMode: (mode: 'grid' | 'table') => void;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    onAddStudent: () => void;
    onUpdateStudent: (id: string, field: string, value: any) => void;
    onEditStudent: (student: StudentWithRelations) => void;
    onRemoveStudent: (id: string) => void;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({
    selectedClass,
    studentsInClass,
    loadingStudents,
    headerHeight,
    headerRef,
    activeDetailTab,
    setActiveDetailTab,
    viewMode,
    setViewMode,
    sortConfig,
    onSort,
    onAddStudent,
    onUpdateStudent,
    onEditStudent,
    onRemoveStudent
}) => {
    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
            <CardInfo
                ref={headerRef}
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
                onAction={activeDetailTab === 'students' ? onAddStudent : undefined}
                actionIcon={Plus}
            >
                {activeDetailTab === 'students' ? (
                    <div className="flex flex-col h-full">
                        <div className="px-6 py-2 border-b border-white/5 flex items-center gap-4">
                            <Tabs
                                tabs={[
                                    { id: 'grid', label: 'Grille', icon: LayoutGrid },
                                    { id: 'table', label: 'Tableau', icon: TableIcon }
                                ]}
                                activeTab={viewMode}
                                onChange={(id) => setViewMode(id as 'grid' | 'table')}
                                level={3}
                                smart
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
                                <ClassTableView
                                    students={studentsInClass}
                                    sortConfig={sortConfig}
                                    onSort={onSort}
                                    onUpdateStudent={onUpdateStudent}
                                    onEditStudent={onEditStudent}
                                    onRemoveStudent={(e, id) => {
                                        e.stopPropagation();
                                        onRemoveStudent(id);
                                    }}
                                />
                            ) : (
                                <ClassGridView
                                    students={studentsInClass}
                                    onEditStudent={onEditStudent}
                                    onRemoveStudent={(e, id) => {
                                        e.stopPropagation();
                                        onRemoveStudent(id);
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
                                selectedClass.ClasseAdulte.map((ca: any, idx: number) => (
                                    <InfoRow
                                        key={idx}
                                        icon={ca.role === 'principal' ? ShieldCheck : Users}
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
        </div>
    );
};
