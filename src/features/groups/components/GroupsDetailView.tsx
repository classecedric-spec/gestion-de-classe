import React from 'react';
import { GraduationCap, LayoutList, Plus, FileText, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, CardInfo, CardTabs, EmptyState, ListItem, ActionItem } from '../../../core';
import PdfProgress from '../../../core/PdfProgress';
import { Tables } from '../../../types/supabase';
import { StudentWithClass } from '../hooks/useGroupStudents';

interface GroupsDetailViewProps {
    selectedGroup: Tables<'Groupe'>;
    studentsInGroup: StudentWithClass[];
    loadingStudents: boolean;
    activeTab: 'students' | 'actions';
    setActiveTab: (tab: 'students' | 'actions') => void;
    headerHeight?: number;
    headerRef: React.RefObject<HTMLDivElement | null>;
    onAddStudents: () => void;
    onEditStudent: (student: StudentWithClass) => void;
    onRemoveStudent: (student: StudentWithClass) => void;

    // Action Props
    isGeneratingPDF: boolean;
    progressText: string;
    pdfProgress: number;
    onGeneratePDF: () => void;
    onShowQRModal: (tab?: 'encodage' | 'planification' | 'both') => void;
}

export const GroupsDetailView: React.FC<GroupsDetailViewProps> = ({
    selectedGroup,
    studentsInGroup,
    loadingStudents,
    activeTab,
    setActiveTab,
    headerHeight,
    headerRef,
    onAddStudents,
    onEditStudent,
    onRemoveStudent,
    isGeneratingPDF,
    progressText,
    pdfProgress,
    onGeneratePDF,
    onShowQRModal
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
            <CardInfo
                ref={headerRef}
                height={headerHeight}
            >
                <div className="flex gap-6 items-center">
                    <Avatar
                        size="xl"
                        src={selectedGroup.photo_url}
                        initials={selectedGroup.acronyme || (selectedGroup.nom ? selectedGroup.nom[0] : '?')}
                        className={selectedGroup.photo_url ? "bg-[#D9B981]" : "bg-surface"}
                    />
                    <div className="min-w-0">
                        <h1 className="text-cq-xl font-black text-text-main mb-1 tracking-tight truncate">{selectedGroup.nom}</h1>
                        <div className="flex items-center gap-3">
                            <Badge variant="primary" size="sm" className="border border-primary/20">
                                {selectedGroup.acronyme || 'N/A'}
                            </Badge>
                            <div className="w-1 h-1 rounded-full bg-grey-dark" />
                            <p className="text-grey-medium text-sm font-medium">
                                {studentsInGroup.length} {studentsInGroup.length > 1 ? 'Enfants' : 'Enfant'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardInfo>

            <CardTabs
                tabs={[
                    { id: 'students', label: 'Liste des élèves', icon: GraduationCap },
                    { id: 'actions', label: 'Actions', icon: LayoutList }
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as 'students' | 'actions')}
                actionLabel={activeTab === 'students' ? "Ajouter des enfants" : undefined}
                onAction={activeTab === 'students' ? onAddStudents : undefined}
                actionIcon={activeTab === 'students' ? Plus : undefined}
            >
                {/* Students List Tab */}
                {activeTab === 'students' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto px-2 pt-2 custom-scrollbar">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                <GraduationCap size={18} className="text-primary" />
                                Les enfants de ce groupe ({studentsInGroup.length})
                            </h3>

                            {loadingStudents ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Avatar size="lg" loading initials="" />
                                    <p className="text-grey-medium animate-pulse text-sm">Chargement des élèves...</p>
                                </div>
                            ) : studentsInGroup.length === 0 ? (
                                <EmptyState
                                    icon={GraduationCap}
                                    title="Aucun enfant"
                                    description="Aucun enfant dans ce groupe pour le moment. Ajoutez des élèves pour commencer l'organisation."
                                    size="md"
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {studentsInGroup.map(student => (
                                        <ListItem
                                            key={student.id}
                                            id={student.id}
                                            title={`${student.prenom} ${student.nom}`}
                                            subtitle={student.Classe?.nom || 'Sans classe'}
                                            onClick={() => navigate('/dashboard/user/students', { state: { selectedStudentId: student.id } })}
                                            onDelete={() => onRemoveStudent(student)}
                                            deleteTitle="Retirer du groupe"
                                            onEdit={() => onEditStudent(student)}
                                            avatar={{
                                                src: student.photo_url,
                                                initials: `${student.prenom[0]}${student.nom[0]}`,
                                                className: student.photo_url ? "bg-[#D9B981]" : "bg-background"
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                    <div className="space-y-8 p-2">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium border-b border-white/5 pb-2 mb-4">
                                Impression des documents
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <ActionItem
                                    icon={FileText}
                                    label={isGeneratingPDF ? "Génération..." : "To do list"}
                                    subtitle={isGeneratingPDF ? (progressText || "Préparation...") : "Génération PDF"}
                                    progress={pdfProgress}
                                    onClick={onGeneratePDF}
                                    loading={isGeneratingPDF}
                                />
                                <ActionItem
                                    icon={QrCode}
                                    label="Exporter PDF Encodage"
                                    subtitle="Accès au Kiosque"
                                    onClick={() => onShowQRModal('encodage')}
                                />
                                <ActionItem
                                    icon={QrCode}
                                    label="Exporter PDF Planification"
                                    subtitle="Fiches de planning"
                                    onClick={() => onShowQRModal('planification')}
                                />
                                <ActionItem
                                    icon={QrCode}
                                    label="Exporter PDF Les deux"
                                    subtitle="Format mixte (recommandé)"
                                    onClick={() => onShowQRModal('both')}
                                />
                            </div>

                            {/* Progress Indicator (shared component) */}
                            <PdfProgress
                                isGenerating={isGeneratingPDF}
                                progressText={progressText}
                                progressPercentage={pdfProgress}
                                className="mt-8"
                            />
                        </div>
                    </div>
                )}
            </CardTabs>
        </div>
    );
};
