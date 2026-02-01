import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Badge, Avatar, SearchBar, CardInfo, CardList, ListItem, EmptyState } from '../../../core';
import { ClassWithAdults } from '../../../features/classes/services/classService';

interface ClassListSidebarProps {
    filteredClasses: ClassWithAdults[];
    selectedClass: ClassWithAdults | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    loading: boolean;
    headerHeight?: number;
    headerRef: React.RefObject<HTMLDivElement | null>;
    onSelectClass: (c: ClassWithAdults) => void;
    onCreateClass: () => void;
    onEditClass: (c: ClassWithAdults) => void;
    onDeleteClass: (c: ClassWithAdults) => void;
}

export const ClassListSidebar: React.FC<ClassListSidebarProps> = ({
    filteredClasses,
    selectedClass,
    searchQuery,
    setSearchQuery,
    loading,
    headerHeight,
    headerRef,
    onSelectClass,
    onCreateClass,
    onEditClass,
    onDeleteClass
}) => {
    return (
        <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
            <CardInfo
                ref={headerRef}
                height={headerHeight}
                contentClassName="space-y-5"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                        <BookOpen className="text-primary" size={24} />
                        Liste des Classes
                    </h2>
                    <Badge variant="primary" size="xs">
                        {filteredClasses.length} Total
                    </Badge>
                </div>

                <div className="border-t border-white/10" />

                <div className="space-y-4">
                    <SearchBar
                        placeholder="Rechercher une classe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        iconColor="text-primary"
                    />
                </div>
            </CardInfo>

            <CardList
                actionLabel="Nouvelle Classe"
                onAction={onCreateClass}
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
                                onClick={() => onSelectClass(classe)}
                                onEdit={() => onEditClass(classe)}
                                onDelete={() => onDeleteClass(classe)}
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
    );
};
