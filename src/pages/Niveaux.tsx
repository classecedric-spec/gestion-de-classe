import React, { useState, useRef, useLayoutEffect } from 'react';
import { useLevels } from '../features/levels/hooks/useLevels';
import SortableLevelItem from '../features/levels/components/SortableLevelItem';
import AddLevelModal from '../features/levels/components/AddLevelModal';
import { Badge, EmptyState, Avatar, ListItem, CardInfo, CardList, CardTabs, ConfirmModal, Input, InfoSection, InfoRow } from '../components/ui';
import { Layers, GraduationCap, Plus, Search, User, BookOpen, Clock, Tag } from 'lucide-react';
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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const Niveaux: React.FC = () => {
    const {
        loading,
        loadingStudents,
        filteredLevels,
        searchTerm,
        setSearchTerm,
        selectedLevel,
        setSelectedLevel,
        students,
        createLevel,
        updateLevel,
        deleteLevel,
        reorderLevels
    } = useLevels();

    const [activeTab, setActiveTab] = useState<'students' | 'details'>('students');
    const [showModal, setShowModal] = useState(false);
    const [niveauToEdit, setNiveauToEdit] = useState<any>(null);
    const [niveauToDelete, setNiveauToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

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
        return () => clearTimeout(t);
    }, [filteredLevels.length, selectedLevel, searchTerm]);

    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = filteredLevels.findIndex((item) => item.id === active.id);
            const newIndex = filteredLevels.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(filteredLevels, oldIndex, newIndex);
            reorderLevels(newItems);
        }
    };

    // Handlers
    const handleOpenAdd = () => {
        setNiveauToEdit(null);
        setShowModal(true);
    };

    const handleOpenEdit = (e: React.MouseEvent, niveau: any) => {
        e.stopPropagation();
        setNiveauToEdit(niveau);
        setShowModal(true);
    };

    const handleLevelSubmit = async (levelData: any) => {
        let success = false;
        if (niveauToEdit) {
            success = await updateLevel(niveauToEdit.id, levelData);
        } else {
            success = await createLevel(levelData);
        }
        if (success) {
            setShowModal(false);
            setNiveauToEdit(null);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, niveau: any) => {
        e.stopPropagation();
        setNiveauToDelete(niveau);
    };

    const handleDeleteConfirm = async () => {
        if (!niveauToDelete) return;
        setIsDeleting(true);
        const success = await deleteLevel(niveauToDelete.id);
        setIsDeleting(false);
        if (success) setNiveauToDelete(null);
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* Left Column: List */}
            <div className="w-80 flex flex-col gap-6 h-full">
                <CardInfo ref={leftContentRef} height={headerHeight}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-text-main flex items-center gap-2">
                                <Layers size={24} className="text-primary" />
                                Niveaux
                            </h2>
                            <Badge variant="primary" size="sm" className="bg-primary/20 text-primary border-none">
                                {filteredLevels.length}
                            </Badge>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white/5 border-white/5 focus:bg-white/10"
                            />
                        </div>
                    </div>
                </CardInfo>

                <CardList
                    actionLabel="Nouveau Niveau"
                    onAction={handleOpenAdd}
                    actionIcon={Plus}
                >
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                            <Avatar size="lg" loading initials="" />
                            <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                        </div>
                    ) : filteredLevels.length === 0 ? (
                        <EmptyState
                            icon={Layers}
                            title="Aucun niveau"
                            description={searchTerm ? "Aucun niveau ne correspond." : "Commencez par créer un niveau."}
                            size="sm"
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredLevels.map(l => l.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1 flex-1">
                                    {filteredLevels.map((level, index) => (
                                        <SortableLevelItem
                                            key={level.id}
                                            level={level}
                                            index={index}
                                            isSelected={selectedLevel?.id === level.id}
                                            onClick={() => setSelectedLevel(level)}
                                            onEdit={(l) => handleOpenEdit({ stopPropagation: () => { } } as any, l)}
                                            onDelete={(l) => handleDeleteClick({ stopPropagation: () => { } } as any, l)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </CardList>
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
                {!selectedLevel ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={Layers}
                            title="Sélectionnez un niveau"
                            description="Choisissez un niveau dans la liste pour voir les élèves et les détails."
                            size="lg"
                        />
                    </div>
                ) : (
                    <>
                        <CardInfo ref={rightContentRef} height={headerHeight}>
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
                                                {students.map(student => (
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
                    </>
                )}
            </div>

            {/* Modals */}
            <ConfirmModal
                isOpen={!!niveauToDelete}
                onClose={() => setNiveauToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le niveau ?"
                message={`Êtes-vous sûr de vouloir supprimer le niveau "${niveauToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

            <AddLevelModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleLevelSubmit}
                levelToEdit={niveauToEdit}
            />
        </div>
    );
};

export default Niveaux;
