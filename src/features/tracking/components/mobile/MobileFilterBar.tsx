import React, { useState } from 'react';
import { Users, ChevronDown, X, BookOpen, ArrowLeftRight } from 'lucide-react';

interface MobileFilterBarProps {
    students: {
        id: string;
        prenom: string | null;
        nom: string | null;
        Niveau?: { nom: string } | null;
    }[];
    modules: {
        id: string;
        nom: string;
    }[];
    selectedFilter: string | null;
    selectedModuleFilter: string | null;
    onFilterChange: (id: string | null) => void;
    onModuleFilterChange: (id: string | null) => void;
}

const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
    students,
    modules,
    selectedFilter,
    selectedModuleFilter,
    onFilterChange,
    onModuleFilterChange
}) => {
    const [mode, setMode] = useState<'student' | 'module'>(selectedModuleFilter ? 'module' : 'student');

    if ((!students || students.length === 0) && (!modules || modules.length === 0)) return null;

    // Group students by level
    const groupedStudents: Record<string, typeof students> = {};
    students.forEach(student => {
        const levelName = student.Niveau?.nom || 'Sans Niveau';
        if (!groupedStudents[levelName]) {
            groupedStudents[levelName] = [];
        }
        groupedStudents[levelName].push(student);
    });

    const handleModeToggle = () => {
        const newMode = mode === 'student' ? 'module' : 'student';
        setMode(newMode);
        // Optional: clear filters when switching mode?
        // onFilterChange(null);
        // onModuleFilterChange(null);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-white/5 z-30 pb-safe">
            <div className="flex items-center gap-2">
                {/* Mode Toggle */}
                <button
                    onClick={handleModeToggle}
                    className="w-11 h-11 bg-surface border border-white/10 rounded-xl flex items-center justify-center shrink-0 text-primary hover:bg-white/5 transition-colors"
                    title={mode === 'student' ? "Passer aux modules" : "Passer aux élèves"}
                >
                    <ArrowLeftRight size={18} />
                </button>

                <div className="relative flex-1">
                    {mode === 'student' ? (
                        <>
                            <select
                                value={selectedFilter || ''}
                                onChange={(e) => onFilterChange(e.target.value || null)}
                                title="Filtrer par élève"
                                className="w-full bg-background border border-white/10 text-white rounded-xl py-3 pl-10 pr-8 appearance-none text-sm font-bold shadow-lg"
                            >
                                <option value="">Tous les élèves ({students.length})</option>
                                {Object.entries(groupedStudents).map(([level, levelStudents]) => (
                                    <optgroup key={level} label={level} className="bg-surface text-primary font-black uppercase text-[10px]">
                                        {levelStudents.map(student => (
                                            <option key={student.id} value={student.id} className="bg-background text-white text-sm py-1">
                                                {student.prenom} {student.nom}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={16} />
                        </>
                    ) : (
                        <>
                            <select
                                value={selectedModuleFilter || ''}
                                onChange={(e) => onModuleFilterChange(e.target.value || null)}
                                title="Filtrer par module"
                                className="w-full bg-background border border-white/10 text-white rounded-xl py-3 pl-10 pr-8 appearance-none text-sm font-bold shadow-lg"
                            >
                                <option value="">Tous les modules ({modules.length})</option>
                                {modules.map(module => (
                                    <option key={module.id} value={module.id} className="bg-background text-white text-sm py-1">
                                        {module.nom}
                                    </option>
                                ))}
                            </select>
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={16} />
                        </>
                    )}
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={14} />
                </div>

                {(selectedFilter || selectedModuleFilter) && (
                    <button
                        onClick={() => {
                            onFilterChange(null);
                            onModuleFilterChange(null);
                        }}
                        title="Réinitialiser le filtre"
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
