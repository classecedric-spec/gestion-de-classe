import React from 'react';
import { Users, ChevronDown, X } from 'lucide-react';

interface MobileFilterBarProps {
    students: { id: string; prenom: string | null; nom: string | null }[];
    selectedFilter: string | null;
    onFilterChange: (id: string | null) => void;
}

const MobileFilterBar: React.FC<MobileFilterBarProps> = ({ students, selectedFilter, onFilterChange }) => {
    if (!students || students.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-md border-t border-white/5 z-30">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <select
                        value={selectedFilter || ''}
                        onChange={(e) => onFilterChange(e.target.value || null)}
                        className="w-full bg-background border border-white/10 text-white rounded-xl py-3 pl-10 pr-8 appearance-none text-sm font-bold shadow-lg"
                    >
                        <option value="">Tous les élèves ({students.length})</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.prenom} {student.nom}
                            </option>
                        ))}
                    </select>
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={16} />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={14} />
                </div>

                {selectedFilter && (
                    <button
                        onClick={() => onFilterChange(null)}
                        className="w-11 h-11 bg-danger text-white rounded-xl flex items-center justify-center shadow-lg border border-white/10 shrink-0"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default MobileFilterBar;
