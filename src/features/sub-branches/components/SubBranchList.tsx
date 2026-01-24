import React from 'react';
import { Layers, Plus } from 'lucide-react';
import SubBranchItem from './SubBranchItem';
import { SubBranchWithParent } from '../services/subBranchService';
import { CardList, Avatar, EmptyState } from '../../../components/ui';

interface SubBranchListProps {
    subBranches: SubBranchWithParent[];
    loading: boolean;
    selectedSubBranch: SubBranchWithParent | null;
    onSelect: (sb: SubBranchWithParent) => void;
    onOpenAdd: () => void;
    onEdit: (sb: SubBranchWithParent) => void;
    onDelete: (sb: SubBranchWithParent) => void;
}

const SubBranchList: React.FC<SubBranchListProps> = ({
    subBranches,
    loading,
    selectedSubBranch,
    onSelect,
    onOpenAdd,
    onEdit,
    onDelete
}) => {
    return (
        <CardList
            actionLabel="Nouvelle Sous-branche"
            onAction={onOpenAdd}
            actionIcon={Plus}
        >
            {loading ? (
                <div className="flex justify-center p-8">
                    <Avatar loading size="md" initials="" />
                </div>
            ) : subBranches.length === 0 ? (
                <EmptyState
                    icon={Layers}
                    title="Aucune sous-branche"
                    description="Aucune sous-branche trouvée."
                    size="sm"
                />
            ) : (
                <div className="space-y-1">
                    {subBranches.map((subBranch) => (
                        <SubBranchItem
                            key={subBranch.id}
                            subBranch={subBranch}
                            isSelected={selectedSubBranch?.id === subBranch.id}
                            onSelect={() => onSelect(subBranch)}
                            onEdit={() => onEdit(subBranch)}
                            onDelete={() => onDelete(subBranch)}
                        />
                    ))}
                </div>
            )}
        </CardList>
    );
};

export default React.memo(SubBranchList);
