import React from 'react';
import { Package, Search, Plus, Loader2 } from 'lucide-react';
import MaterialItem from './MaterialItem';
import { TypeMateriel } from '../services/materialService';

interface MaterialListProps {
    materiels: TypeMateriel[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedMateriel: TypeMateriel | null;
    onSelect: (material: TypeMateriel) => void;
    onOpenAdd: () => void;
    onOpenEdit: (material: TypeMateriel) => void;
    onDelete: (material: TypeMateriel) => void;
}

const MaterialList: React.FC<MaterialListProps> = ({
    materiels,
    loading,
    searchTerm,
    onSearchChange,
    selectedMateriel,
    onSelect,
    onOpenAdd,
    onOpenEdit,
    onDelete
}) => {
    return (
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">

            {/* Header */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Package className="text-primary" size={24} />
                        Matériel
                    </h2>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {materiels.length} Total
                    </span>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un matériel..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : materiels.length === 0 ? (
                    <div className="text-center p-8 text-grey-medium italic">Aucun matériel trouvé.</div>
                ) : (
                    materiels.map((materiel) => (
                        <MaterialItem
                            key={materiel.id}
                            materiel={materiel}
                            isSelected={selectedMateriel?.id === materiel.id}
                            onSelect={() => onSelect(materiel)}
                            onEdit={() => onOpenEdit(materiel)}
                            onDelete={() => onDelete(materiel)}
                        />
                    ))
                )}
            </div>

            {/* Add Button */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <button
                    onClick={onOpenAdd}
                    className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Nouveau Matériel</span>
                </button>
            </div>
        </div>
    );
};

export default React.memo(MaterialList);
