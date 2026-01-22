import React, { ChangeEvent } from 'react';
import { Search, Loader2, Edit, X, ChevronRight, BookOpen, Plus } from 'lucide-react';
import clsx from 'clsx';
import { ClassWithAdults } from '../services/classService';

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
        <div className="w-1/3 flex flex-col bg-surface/80 backdrop-blur-md rounded-2xl border border-border/5 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-border/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <BookOpen className="text-primary" size={24} />
                        Liste des Classes
                    </h2>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {classes.length} Total
                    </span>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Rechercher une classe..."
                        value={searchQuery}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
                        className="w-full bg-surface/50 border border-border/10 rounded-xl py-2 pl-9 pr-4 text-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                ) : classes.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <p className="text-sm text-grey-medium italic">Aucune classe trouvée</p>
                    </div>
                ) : (
                    classes.map((classe) => (
                        <div
                            key={classe.id}
                            onClick={() => onSelect(classe)}
                            className={clsx(
                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group relative hover:z-50 cursor-pointer",
                                selectedClass?.id === classe.id
                                    ? "bg-primary/10 border border-primary/20 shadow-sm"
                                    : "hover:bg-input border border-transparent"
                            )}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(classe); }}
                        >
                            {/* Avatar */}
                            <div className={clsx(
                                "w-10 h-10 rounded-lg flex items-center justify-center font-bold overflow-hidden shadow-inner shrink-0",
                                selectedClass?.id === classe.id ? "bg-primary/20 text-text-dark" : "bg-background text-primary",
                                (classe.photo_base64 || classe.logo_url) && "bg-[#D9B981]"
                            )}>
                                {classe.photo_base64 ? (
                                    <img src={classe.photo_base64} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                                ) : classe.logo_url ? (
                                    <img src={classe.logo_url} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                                ) : (
                                    classe.acronyme || (classe.nom ? classe.nom[0] : '?')
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className={clsx("font-bold truncate text-sm", selectedClass?.id === classe.id ? "text-primary" : "text-text-main")}>
                                    {classe.nom}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {classe.acronyme && (
                                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded flex items-center bg-black/5 text-grey-medium">
                                            {classe.acronyme}
                                        </span>
                                    )}
                                    {classe.ClasseAdulte && classe.ClasseAdulte.length > 0 && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 text-grey-medium truncate max-w-[120px]">
                                            {classe.ClasseAdulte.filter(ca => ca.role === 'principal').map(ca => ca.Adulte?.nom).join(', ')}
                                        </span>
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
                                    className="p-1.5 rounded-lg text-grey-medium hover:text-primary hover:bg-surface transition-colors"
                                    title="Modifier"
                                >
                                    <Edit size={14} />
                                </button>
                            </div>

                            {/* Delete Button (Corner) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(classe); }}
                                className="absolute -top-2 -right-2 z-10 p-2 bg-surface hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                title="Supprimer"
                            >
                                <X size={14} strokeWidth={3} />
                            </button>

                            <ChevronRight size={14} className={clsx(
                                "opacity-0 transition-transform text-primary",
                                selectedClass?.id === classe.id ? "opacity-100 translate-x-1" : "group-hover:opacity-100 group-hover:translate-x-1"
                            )} />
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/5 bg-surface/50">
                <button
                    onClick={onCreate}
                    className="w-full py-3 bg-white hover:bg-white/90 text-black rounded-xl shadow-lg shadow-black/5 transition-all font-bold flex items-center justify-center gap-2 group transform active:scale-[0.98]"
                >
                    <Plus size={18} className="text-primary group-hover:scale-110 transition-transform" />
                    Nouvelle Classe
                </button>
            </div>
        </div>
    );
};

export default ClassList;
