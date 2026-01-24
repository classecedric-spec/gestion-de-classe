import React from 'react';
import { Package, Search, Plus } from 'lucide-react';
import MaterialItem from './MaterialItem';
import { TypeMateriel } from '../services/materialService';
import { Badge, Button, Avatar, EmptyState } from '../../../components/ui';

interface MaterialListProps {
    materiels: TypeMateriel[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedMateriel: TypeMateriel | null;
    onSelect: (materiel: TypeMateriel) => void;
    onOpenAdd: () => void;
    onOpenEdit: (materiel: TypeMateriel) => void;
    onDelete: (materiel: TypeMateriel) => void;
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
                    <Badge variant="primary" size="sm">
                        {materiels.length} Total
                    </Badge>
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
                    <div className="flex justify-center p-8">
                        <Avatar loading size="md" initials="" />
                    </div>
                ) : materiels.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="Aucun matériel"
                        description="Aucun matériel trouvé."
                        size="sm"
                    />
                ) : (
                    materiels.map((materiel) => (
                        <MaterialItem
                            key={materiel.id}
                            materiel={materiel}
                            isSelected={selectedMateriel?.id === materiel.id}
                            onSelect={onSelect}
                            onEdit={onOpenEdit}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>

            {/* Add Button */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <Button
                    onClick={onOpenAdd}
                    variant="secondary"
                    className="w-full border-dashed"
                    icon={Plus}
                >
                    Nouveau Matériel
                </Button>
            </div>
        </div>
    );
};

export default MaterialList;
