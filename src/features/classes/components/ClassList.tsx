import React, { ChangeEvent } from 'react';
import { Search, Edit, X, ChevronRight, BookOpen, Plus } from 'lucide-react';
import clsx from 'clsx';
import { ClassWithAdults } from '../services/classService';
import { Badge, Button, EmptyState, Avatar, Input } from '../../../components/ui';

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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
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
                    classes.map((classe) => (
                        <div
                            key={classe.id}
                            onClick={() => onSelect(classe)}
                            className={clsx(
                                "group relative w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left cursor-pointer",
                                selectedClass?.id === classe.id
                                    ? "bg-white/10 border-primary/30 shadow-sm"
                                    : "bg-white/5 border-white/5 hover:border-primary/30 hover:bg-white/10"
                            )}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(classe); }}
                        >
                            <Avatar
                                size="md"
                                src={(classe as any).photo_base64 || classe.logo_url}
                                initials={classe.acronyme || (classe.nom ? classe.nom[0] : '?')}
                                className={clsx(
                                    selectedClass?.id === classe.id ? "bg-background" : "bg-background",
                                    ((classe as any).photo_base64 || classe.logo_url) && "bg-[#D9B981]"
                                )}
                            />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className={clsx("font-semibold truncate text-base", selectedClass?.id === classe.id ? "text-primary" : "text-text-main group-hover:text-primary transition-colors")}>
                                    {classe.nom}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {classe.acronyme && (
                                        <Badge variant="default" size="xs">
                                            {classe.acronyme}
                                        </Badge>
                                    )}
                                    {classe.ClasseAdulte && classe.ClasseAdulte.length > 0 && (
                                        <Badge variant="default" size="xs" className="max-w-[120px] truncate">
                                            {classe.ClasseAdulte.filter(ca => ca.role === 'principal').map(ca => ca.Adulte?.nom).join(', ')}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Actions (Hover) */}
                            <div className={clsx(
                                "flex gap-1 transition-opacity",
                                selectedClass?.id === classe.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(classe); }}
                                    className="p-2 rounded-full text-grey-medium hover:text-white hover:bg-white/10 transition-colors"
                                    title="Modifier"
                                >
                                    <Edit size={14} />
                                </button>
                            </div>

                            {/* Delete Button (Corner) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(classe); }}
                                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                title="Supprimer"
                            >
                                <X size={14} strokeWidth={3} />
                            </button>

                            <ChevronRight size={16} className={clsx(
                                "transition-all text-grey-dark group-hover:text-primary",
                                selectedClass?.id === classe.id ? "opacity-100 translate-x-1" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
                            )} />
                        </div>
                    ))
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
