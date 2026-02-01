import React from 'react';
import { Layers, GraduationCap, BookOpen, User, Tag, Clock } from 'lucide-react';
import { Badge, EmptyState, Avatar, ListItem, CardInfo, CardTabs, InfoSection, InfoRow } from '../../../core';

interface LevelDetailPanelProps {
    selectedLevel: any;
    students: any[];
    loadingStudents: boolean;
    activeTab: 'students' | 'details';
    setActiveTab: (tab: 'students' | 'details') => void;
    contentRef?: React.Ref<HTMLDivElement>;
    headerHeight?: number;
}

export const LevelDetailPanel: React.FC<LevelDetailPanelProps> = ({
    selectedLevel,
    students,
    loadingStudents,
    activeTab,
    setActiveTab,
    contentRef,
    headerHeight
}) => {

    if (!selectedLevel) {
        return (
            <div className="flex-1 card-flat overflow-hidden">
                <EmptyState
                    icon={Layers}
                    title="Sélectionnez un niveau"
                    description="Choisissez un niveau dans la liste pour voir les élèves et les détails."
                    size="lg"
                />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
            <CardInfo ref={contentRef} height={headerHeight}>
                <div className="flex gap-6 items-center">
                    <Avatar
                        size="xl"
                        initials={selectedLevel.nom ? selectedLevel.nom[0] : '?'}
                        className="bg-surface"
                    />
                    <div className="min-w-0">
                        <h1 className="text-cq-xl font-black text-text-main mb-1 tracking-tight truncate">{selectedLevel.nom}</h1>
                        <div className="flex items-center gap-3">
                            <Badge variant="primary" size="sm" className="border border-primary/20">
                                Niveau scolaire
                            </Badge>
                            <div className="w-1 h-1 rounded-full bg-grey-dark" />
                            <p className="text-grey-medium text-sm font-medium">
                                {students.length} {students.length > 1 ? 'Élèves' : 'Élève'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardInfo>

            <CardTabs
                tabs={[
                    { id: 'students', label: 'Élèves inscrits', icon: GraduationCap },
                    { id: 'details', label: 'Informations', icon: BookOpen }
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as any)}
            >
                {activeTab === 'students' ? (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto px-2 pt-2 custom-scrollbar">
                            {loadingStudents ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Avatar size="lg" loading initials="" />
                                    <p className="text-grey-medium animate-pulse text-sm">Chargement des élèves...</p>
                                </div>
                            ) : students.length === 0 ? (
                                <EmptyState
                                    icon={User}
                                    title="Aucun élève"
                                    description="Aucun élève n'est encore inscrit dans ce niveau."
                                    size="md"
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {students.map((student: any) => (
                                        <ListItem
                                            key={student.id}
                                            id={student.id}
                                            title={`${student.prenom} ${student.nom}`}
                                            subtitle={student.date_naissance ? `Né(e) le ${new Date(student.date_naissance).toLocaleDateString()}` : 'Date inconnue'}
                                            avatar={{
                                                initials: `${student.prenom[0]}${student.nom[0]}`,
                                                className: "bg-background"
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <InfoSection title="Détails du Niveau">
                            <InfoRow
                                icon={Tag}
                                label="Nom du niveau"
                                value={selectedLevel.nom}
                            />
                            <InfoRow
                                icon={Clock}
                                label="Dernière mise à jour"
                                value={new Date().toLocaleDateString()}
                            />
                        </InfoSection>
                    </div>
                )}
            </CardTabs>
        </div>
    );
};
