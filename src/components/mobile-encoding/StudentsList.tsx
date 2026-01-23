import React from 'react';
import { User, ChevronDown, Loader2 } from 'lucide-react';
import { getInitials } from '../../lib/helpers';

interface StudentsListProps {
    students: any[];
    loading: boolean;
    onSelectStudent: (student: any) => void;
}

/**
 * Component for displaying the list of students
 */
export const StudentsList: React.FC<StudentsListProps> = ({ students, loading, onSelectStudent }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="text-center py-20 text-grey-medium">
                <User size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Aucun élève dans ce groupe</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-2">
            {students.map(student => (
                <button
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className="w-full flex items-center gap-4 bg-surface/50 border border-border p-4 rounded-xl hover:bg-surface hover:border-primary/30 transition-all text-left"
                >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/5 bg-surface-light shrink-0">
                        {student.photo_url ? (
                            <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-black text-primary">
                                {getInitials(student)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-white block truncate">
                            {student.prenom} {student.nom}
                        </span>
                        <span className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">
                            {student.Niveau?.nom || 'Niveau non défini'}
                        </span>
                    </div>
                    <ChevronDown size={16} className="text-grey-medium -rotate-90" />
                </button>
            ))}
        </div>
    );
};
