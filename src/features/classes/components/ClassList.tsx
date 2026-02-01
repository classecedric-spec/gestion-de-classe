import React, { ChangeEvent } from 'react';
import { Search, BookOpen, Plus } from 'lucide-react';
import { ClassWithAdults } from '../services/classService';
import { Badge, Button, EmptyState, Avatar, Input, ListItem } from '../../../core';

export interface ClassListProps {
    classes: ClassWithAdults[];
    loading: boolean;
    selectedClass: ClassWithAdults | null;
    onSelect: (classe: ClassWithAdults) => void;
    onEdit: (classe: ClassWithAdults) => void;
    onDelete: (classe: ClassWithAdults) => void;
    onSearch: (query: string) => void;
    searchQuery: string;
    onCreate: () => void;
}

const ClassList: React.FC<ClassListProps> = ({
    classes,
    loading,
    selectedClass,
    onSelect,
    onEdit,
    onDelete,
    onSearch,
    searchQuery,
    onCreate
}) => {
    return (
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <BookOpen className="text-primary" size={24} />
                        Liste des Classes
                    </h2>
                    <Badge variant="primary" size="sm">
                        {classes.length} Total
                    </Badge>
                </div>
                <Input
                    placeholder="Rechercher une classe..."
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
                    icon={Search}
                    className="bg-background/50"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Avatar size="md" loading={true} initials="" />
                    </div>
                ) : classes.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title="Aucune classe"
                        description="Commencez par créer une nouvelle classe."
                        size="sm"
                    />
                ) : (
                    classes.map((classe) => {
                        const principalAdult = classe.ClasseAdulte?.find(ca => ca.role === 'principal')?.Adulte?.nom;

                        return (
                            <ListItem
                                key={classe.id}
                                id={classe.id}
                                title={classe.nom}
                                subtitle={principalAdult ? `Pr. ${principalAdult}` : (classe.acronyme || 'Sans acronyme')}
                                isSelected={selectedClass?.id === classe.id}
                                onClick={() => onSelect(classe)}
                                onEdit={() => onEdit(classe)}
                                onDelete={() => onDelete(classe)}
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
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <Button
                    onClick={onCreate}
                    variant="secondary"
                    className="w-full border-dashed"
                    icon={Plus}
                >
                    Nouvelle Classe
                </Button>
            </div>
        </div>
    );
};

export default ClassList;
