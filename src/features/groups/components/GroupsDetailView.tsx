import React, { useState, useEffect, useMemo } from 'react';
import { GraduationCap, LayoutList, Plus, FileText, QrCode, Table, Settings, Check, ChevronDown, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, CardInfo, CardTabs, EmptyState, ListItem, ActionItem, Button } from '../../../core';
import PdfProgress from '../../../core/PdfProgress';
import { Tables } from '../../../types/supabase';
import { StudentWithClass } from '../hooks/useGroupStudents';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import clsx from 'clsx';

interface GroupsDetailViewProps {
    selectedGroup: Tables<'Groupe'>;
    studentsInGroup: StudentWithClass[];
    loadingStudents: boolean;
    activeTab: 'students' | 'actions' | 'tableau';
    setActiveTab: (tab: 'students' | 'actions' | 'tableau') => void;
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

    // Advanced Tableau Props
    visibleColumns: string[];
    onToggleColumn: (id: string) => void;
    onReorderColumns: (newOrder: string[]) => void;
    onUpdateStudentField: (studentId: string, field: string, value: any) => void;
    eleveProfilCompetences: any;
    branches: any[];
}

/**
 * Component for inline editing a cell
 */
const InlineEditCell: React.FC<{
    value: any;
    type?: 'text' | 'number' | 'date';
    placeholder?: string;
    onSave: (value: any) => void;
    className?: string;
    fallbackValue?: any;
}> = ({ value, type = 'text', placeholder = '-', onSave, className, fallbackValue }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || '');

    useEffect(() => {
        setTempValue(value || '');
    }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue !== (value || '')) {
            onSave(tempValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setTempValue(value || '');
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="relative z-[100]">
                <input
                    autoFocus
                    type={type}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={clsx(
                        "absolute -top-1 -left-1 min-w-[140%] bg-[#0F172A] border-4 border-primary shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-white rounded-xl px-4 py-3 text-lg font-bold outline-none animate-in zoom-in-95 duration-150 opacity-100",
                        className
                    )}
                />
            </div>
        );
    }

    const displayValue = value || fallbackValue;
    const isFallback = !value && fallbackValue;

    return (
        <div
            onDoubleClick={() => setIsEditing(true)}
            className={clsx(
                "cursor-text py-1 px-2 rounded hover:bg-white/5 transition-colors truncate min-h-[24px]",
                !displayValue && "text-grey-dark italic",
                isFallback && "text-primary/60 font-medium italic opacity-70",
                !isFallback && displayValue && "text-text-main",
                className
            )}
        >
            {displayValue || placeholder}
            {isFallback && <span className="ml-1 text-[8px] uppercase tracking-tighter">(défaut)</span>}
        </div>
    );
};

/**
 * Sortable Header Component
 */
const SortableHeader: React.FC<{ id: string; label: string; className?: string }> = ({ id, label, className }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            className={clsx(
                "px-6 py-4 select-none group/header relative",
                isDragging && "bg-surface-dark border-x border-white/10",
                className
            )}
        >
            <div className="flex items-center gap-2">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-0 group-hover/header:opacity-100 transition-opacity">
                    <GripVertical size={12} className="text-grey-medium" />
                </div>
                {label}
            </div>
        </th>
    );
};

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
    onShowQRModal,
    visibleColumns,
    onToggleColumn,
    onReorderColumns,
    onUpdateStudentField,
    eleveProfilCompetences,
    branches
}) => {
    const navigate = useNavigate();
    const [showColumnMenu, setShowColumnMenu] = React.useState(false);

    // Compute all possible columns including dynamic branches
    const allPossibleColumns = useMemo(() => {
        const base = [
            { id: 'prenom', label: 'Prénom', alwaysVisible: true },
            { id: 'nom', label: 'Nom', alwaysVisible: true },
            { id: 'date_naissance', label: 'Date de Naissance', alwaysVisible: false },
            { id: 'classe', label: 'Classe', alwaysVisible: false },
            { id: 'niveau', label: 'Niveau', alwaysVisible: false },
            { id: 'importance_suivi', label: 'Indice Global (%)', alwaysVisible: false },
            { id: 'indice_moyen', label: 'Indice Moyen (%)', alwaysVisible: false },
        ];

        const branchCols = branches.map(b => ({
            id: `branch_${b.id}`,
            label: `Indice ${b.nom} (%)`,
            alwaysVisible: false
        }));

        const contactCols = [
            { id: 'parent1_prenom', label: 'P1 - Prénom', alwaysVisible: false },
            { id: 'parent1_nom', label: 'P1 - Nom', alwaysVisible: false },
            { id: 'parent1_email', label: 'P1 - Email', alwaysVisible: false },
            { id: 'parent1_telephone', label: 'P1 - Tél', alwaysVisible: false },
            { id: 'parent2_prenom', label: 'P2 - Prénom', alwaysVisible: false },
            { id: 'parent2_nom', label: 'P2 - Nom', alwaysVisible: false },
            { id: 'parent2_email', label: 'P2 - Email', alwaysVisible: false },
            { id: 'parent2_telephone', label: 'P2 - Tél', alwaysVisible: false },
            { id: 'annee_inscription', label: 'Année Inscription', alwaysVisible: false },
        ];

        return [...base, ...branchCols, ...contactCols];
    }, [branches]);

    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = visibleColumns.indexOf(active.id.toString());
            const newIndex = visibleColumns.indexOf(over.id.toString());
            onReorderColumns(arrayMove(visibleColumns, oldIndex, newIndex));
        }
    };

    const isVisible = (id: string) => visibleColumns.includes(id);

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
                    { id: 'tableau', label: 'Tableau', icon: Table },
                    { id: 'actions', label: 'Actions', icon: LayoutList }
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as 'students' | 'actions' | 'tableau')}
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

                {/* Tableau View Tab */}
                {activeTab === 'tableau' && (
                    <div className="flex flex-col h-full p-2 space-y-4">
                        {/* Toolbar for Tableau */}
                        <div className="flex justify-end relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={Settings}
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                className="bg-surface/50 border border-white/5 hover:bg-surface"
                            >
                                Colonnes
                                <ChevronDown size={14} className={clsx("ml-2 transition-transform", showColumnMenu && "rotate-180")} />
                            </Button>

                        {showColumnMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowColumnMenu(false)} />
                                <div className="absolute top-full right-0 mt-2 w-72 bg-[#0F172A] border border-white/10 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-3xl">
                                    <div className="px-4 py-3 border-b border-white/5 bg-white/5 opacity-100">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-grey-medium">Colonnes Affichées</h4>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar space-y-1">
                                        {allPossibleColumns.filter(c => !c.alwaysVisible).map(col => (
                                            <button
                                                key={col.id}
                                                onClick={() => onToggleColumn(col.id)}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                    isVisible(col.id) ? "bg-primary/20 text-text-main shadow-lg" : "text-grey-medium hover:bg-white/5 hover:text-text-main"
                                                )}
                                            >
                                                {col.label}
                                                {isVisible(col.id) && <Check size={14} className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        </div>

                        <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-surface/30 custom-scrollbar">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <table className="w-full text-sm text-left student-table min-w-max border-collapse">
                                    <thead className="text-[10px] text-grey-medium uppercase bg-surface-dark/80 border-b border-white/5 font-black tracking-widest sticky top-0 z-10 backdrop-blur-xl">
                                        <SortableContext
                                            items={visibleColumns}
                                            strategy={horizontalListSortingStrategy}
                                        >
                                            <tr>
                                                <th className="px-6 py-4 w-12 sticky left-0 z-20 bg-surface-dark/90"></th>
                                                <th className="px-6 py-4 sticky left-12 z-20 bg-surface-dark/90">Prénom</th>
                                                <th className="px-6 py-4 sticky left-32 z-20 bg-surface-dark/90 mr-4">Nom</th>
                                                
                                                {visibleColumns.map(columnId => {
                                                    const col = allPossibleColumns.find(c => c.id === columnId);
                                                    if (!col) return null;
                                                    return (
                                                        <SortableHeader
                                                            key={columnId}
                                                            id={columnId}
                                                            label={col.label}
                                                        />
                                                    );
                                                })}
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </SortableContext>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {studentsInGroup.map(student => {
                                            const studentProfile = eleveProfilCompetences[student.id] || {};

                                            return (
                                                <tr key={student.id} className="hover:bg-white/5 transition-colors group/row">
                                                    <td className="px-6 py-3 sticky left-0 z-10 bg-background/50 backdrop-blur-sm group-hover/row:bg-surface/30">
                                                        <Avatar
                                                            size="xs"
                                                            src={student.photo_url}
                                                            initials={`${student.prenom[0]}${student.nom[0]}`}
                                                            className={student.photo_url ? "bg-[#D9B981]" : "bg-surface-dark"}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 sticky left-12 z-10 bg-background/50 backdrop-blur-sm group-hover/row:bg-surface/30">
                                                        <InlineEditCell
                                                            value={student.prenom}
                                                            onSave={(val) => onUpdateStudentField(student.id, 'prenom', val)}
                                                            className="font-bold text-text-main"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 sticky left-32 z-10 bg-background/50 backdrop-blur-sm group-hover/row:bg-surface/30">
                                                        <InlineEditCell
                                                            value={student.nom}
                                                            onSave={(val) => onUpdateStudentField(student.id, 'nom', val)}
                                                            className="font-bold text-text-main"
                                                        />
                                                    </td>

                                                    {visibleColumns.map(columnId => {
                                                        // Static fields from Eleve table
                                                        if (columnId === 'date_naissance') {
                                                            return (
                                                                <td key={columnId} className="px-6 py-3 text-grey-medium">
                                                                    <InlineEditCell
                                                                        type="text" // Use text for simplicity but could be date
                                                                        value={student.date_naissance}
                                                                        onSave={(val) => onUpdateStudentField(student.id, 'date_naissance', val)}
                                                                        placeholder="JJ/MM/AAAA"
                                                                    />
                                                                </td>
                                                            );
                                                        }
                                                        if (columnId === 'classe') {
                                                            return <td key={columnId} className="px-6 py-3 text-grey-dark italic text-xs">{student.Classe?.nom || '-'}</td>;
                                                        }
                                                        if (columnId === 'niveau') {
                                                            return <td key={columnId} className="px-6 py-3 text-grey-medium">{student.niveau_id || '-'}</td>;
                                                        }
                                                        if (columnId === 'importance_suivi') {
                                                            return (
                                                                <td key={columnId} className="px-6 py-3 text-center">
                                                                    <InlineEditCell
                                                                        type="number"
                                                                        value={student.importance_suivi}
                                                                        onSave={(val) => onUpdateStudentField(student.id, 'importance_suivi', parseInt(val))}
                                                                        className="text-center font-black !w-16"
                                                                    />
                                                                </td>
                                                            );
                                                        }

                                                        if (columnId === 'indice_moyen') {
                                                            let sum = 0;
                                                            let count = 0;
                                                            branches.forEach(b => {
                                                                const val = studentProfile[b.id];
                                                                const finalVal = (val !== undefined && val !== null && val !== "") 
                                                                    ? parseInt(val, 10) 
                                                                    : (student.importance_suivi || 50);
                                                                if (!isNaN(finalVal)) {
                                                                    sum += finalVal;
                                                                    count++;
                                                                }
                                                            });
                                                            const average = count > 0 ? Math.round(sum / count) : '-';
                                                            
                                                            return (
                                                                <td key={columnId} className="px-6 py-3 text-center">
                                                                    <div className="font-black text-primary !w-16 mx-auto text-center px-2 py-1 bg-primary/10 rounded">
                                                                        {average}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }

                                                        // Branch indices
                                                        if (columnId.startsWith('branch_')) {
                                                            const branchId = columnId.replace('branch_', '');
                                                            const branchValue = studentProfile[branchId];
                                                            const fallback = student.importance_suivi || 50;

                                                            return (
                                                                <td key={columnId} className="px-6 py-3 text-center">
                                                                    <InlineEditCell
                                                                        type="number"
                                                                        value={branchValue}
                                                                        fallbackValue={fallback}
                                                                        onSave={(val) => onUpdateStudentField(student.id, columnId, parseInt(val))}
                                                                        className="text-center font-black !w-16"
                                                                    />
                                                                </td>
                                                            );
                                                        }

                                                        // Parents & other fields
                                                        if (columnId.includes('parent') || columnId === 'annee_inscription') {
                                                            return (
                                                                <td key={columnId} className="px-6 py-3 text-grey-medium text-xs">
                                                                    <InlineEditCell
                                                                        value={(student as any)[columnId]}
                                                                        onSave={(val) => onUpdateStudentField(student.id, columnId, val)}
                                                                        placeholder="-"
                                                                    />
                                                                </td>
                                                            );
                                                        }

                                                        return <td key={columnId} className="px-6 py-3">-</td>;
                                                    })}

                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover/row:opacity-100 transition-opacity"
                                                                onClick={() => onEditStudent(student)}
                                                            >
                                                                Editer
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {studentsInGroup.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-12 text-center text-grey-medium italic">
                                                    Aucun élève dans ce groupe.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </DndContext>
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
