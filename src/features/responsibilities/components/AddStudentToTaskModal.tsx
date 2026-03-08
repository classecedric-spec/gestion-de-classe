import React, { useState, useMemo } from 'react';
import { Modal, Input, Avatar, Button } from '../../../core';
import { Search, Check } from 'lucide-react';
import { useStudentsData } from '../../students/hooks/useStudentsData';
import { getInitials } from '../../../lib/helpers';
import clsx from 'clsx';

interface AddStudentToTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (eleveIds: string[]) => void;
    alreadyAssignedIds: string[];
    taskTitle: string;
}

const AddStudentToTaskModal: React.FC<AddStudentToTaskModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    alreadyAssignedIds,
    taskTitle
}) => {
    const { students, loading } = useStudentsData();
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const fullName = `${s.prenom} ${s.nom}`.toLowerCase();
            return fullName.includes(search.toLowerCase());
        });
    }, [students, search]);

    const handleToggleSelect = (eleveId: string) => {
        setSelectedIds(prev =>
            prev.includes(eleveId)
                ? prev.filter(id => id !== eleveId)
                : [...prev, eleveId]
        );
    };

    const handleValidate = () => {
        if (selectedIds.length > 0) {
            onSelect(selectedIds);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Assigner à : ${taskTitle}`}
            className="!max-w-[800px]"
        >
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-2/3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-medium" />
                        <Input
                            placeholder="Rechercher un élève..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11 bg-white/5 border-white/10"
                            autoFocus
                        />
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleValidate}
                        disabled={selectedIds.length === 0}
                        className="w-full sm:w-auto"
                    >
                        Valider ({selectedIds.length})
                    </Button>
                </div>

                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center text-grey-medium animate-pulse">
                            Chargement des élèves...
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-20 text-center text-grey-medium italic">
                            Aucun élève trouvé
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {filteredStudents.map(student => {
                                const isAlreadyAssigned = alreadyAssignedIds.includes(student.id);
                                const isSelected = selectedIds.includes(student.id);

                                return (
                                    <button
                                        key={student.id}
                                        disabled={isAlreadyAssigned}
                                        onClick={() => handleToggleSelect(student.id)}
                                        className={clsx(
                                            "flex items-center gap-3 p-2 rounded-2xl transition-all group relative border",
                                            isAlreadyAssigned
                                                ? "bg-grey-light/5 opacity-40 cursor-not-allowed border-transparent"
                                                : isSelected
                                                    ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.2)]"
                                                    : "bg-white/5 border-white/5 hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar
                                                size="sm"
                                                initials={getInitials(student as any)}
                                                src={student.photo_url}
                                                className={clsx(
                                                    "ring-1 ring-transparent transition-all",
                                                    !isAlreadyAssigned && !isSelected && "group-hover:ring-primary/50",
                                                    isSelected && "ring-primary shadow-lg shadow-primary/20"
                                                )}
                                            />
                                            {isSelected && (
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-text-dark p-0.5 rounded-full z-10">
                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className={clsx(
                                                "font-black text-xs transition-colors truncate",
                                                isAlreadyAssigned ? "text-grey-medium" : isSelected ? "text-primary" : "text-white group-hover:text-primary"
                                            )}>
                                                {student.prenom}
                                            </p>
                                            <p className="text-[9px] font-bold text-grey-dark uppercase tracking-wider truncate mb-0.5">
                                                {student.nom}
                                            </p>
                                        </div>

                                        {isAlreadyAssigned && (
                                            <div className="absolute top-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-lg">
                                                <Check className="w-2.5 h-2.5 stroke-[4]" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AddStudentToTaskModal;
