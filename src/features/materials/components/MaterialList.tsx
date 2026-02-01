import React from 'react';
import { Package, Plus } from 'lucide-react';
import MaterialItem from './MaterialItem';
import { TypeMateriel } from '../services/materialService';
import { CardList, Avatar, EmptyState } from '../../../core';

interface MaterialListProps {
    materiels: TypeMateriel[];
    loading: boolean;
    selectedMateriel: TypeMateriel | null;
    onSelect: (materiel: TypeMateriel) => void;
    onOpenAdd: () => void;
    onOpenEdit: (materiel: TypeMateriel) => void;
    onDelete: (materiel: TypeMateriel) => void;
}

const MaterialList: React.FC<MaterialListProps> = ({
    materiels,
    loading,
    selectedMateriel,
    onSelect,
    onOpenAdd,
    onOpenEdit,
    onDelete
}) => {
    return (
        <CardList
            actionLabel="Nouveau Matériel"
            onAction={onOpenAdd}
            actionIcon={Plus}
        >
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
                <div className="space-y-1">
                    {materiels.map((materiel) => (
                        <MaterialItem
                            key={materiel.id}
                            materiel={materiel}
                            isSelected={selectedMateriel?.id === materiel.id}
                            onSelect={onSelect}
                            onEdit={onOpenEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </CardList>
    );
};

export default MaterialList;
