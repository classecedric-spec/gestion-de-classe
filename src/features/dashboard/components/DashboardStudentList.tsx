import React, { useMemo } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { getInitials } from '../../../lib/helpers';
import { Student } from '../../attendance/services/attendanceService';

interface DashboardStudentListProps {
    students: Student[];
    searchQuery: string;
    onStudentClick: (student: Student) => void;
}

const DashboardStudentList: React.FC<DashboardStudentListProps> = ({ students, searchQuery, onStudentClick }) => {

    // Filter and Sort Logic extracted from original Home
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        return students.filter(s =>
            s.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.nom?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [students, searchQuery]);

    const sortedLevels = useMemo(() => {
        const studentsByLevel = filteredStudents.reduce((acc, student) => {
            const levelName = student.Niveau?.nom || 'Sans niveau';
            const levelOrder = student.Niveau?.ordre || 999;
            if (!acc[levelName]) {
                acc[levelName] = {
                    order: levelOrder,
                    students: []
                };
            }
            acc[levelName].students.push(student);
            return acc;
        }, {} as Record<string, { order: number; students: Student[] }>);

        const sorted = Object.entries(studentsByLevel).sort((a, b) => a[1].order - b[1].order);

        // Sort students inside each level
        sorted.forEach(([, data]) => {
            data.students.sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''));
        });

        return sorted;
    }, [filteredStudents]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                    <Users className="text-primary" /> Vos Élèves
                </h2>
                <div className="text-[10px] font-black text-grey-medium uppercase tracking-[0.2em]">
                    {filteredStudents.length} / {students.length}
                </div>
            </div>

            <div className="space-y-12">
                {sortedLevels.map(([levelName, { students: levelStudents }]) => (
                    <div key={levelName} className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black text-grey-medium border border-white/5 uppercase tracking-widest">
                                {levelName}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {levelStudents.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => onStudentClick(student)}
                                    className="group relative bg-surface hover:bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-row items-center gap-4 transition-all hover:translate-x-1 hover:shadow-lg cursor-pointer"
                                >
                                    <div className="relative shrink-0 w-12 h-12">
                                        <div className="w-full h-full rounded-full bg-background border-2 border-white/5 p-0.5 overflow-hidden group-hover:border-primary/50 transition-colors">
                                            {student.photo_url ? (
                                                <img src={student.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5 text-primary">
                                                    <span className="text-xs font-black">{getInitials(student as any)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-text-main truncate">{student.prenom}</h3>
                                        <p className="text-[9px] font-black text-grey-medium uppercase tracking-tighter truncate">
                                            {student.Classe?.nom}
                                        </p>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-grey-dark group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {sortedLevels.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-3xl text-grey-medium bg-surface/30">
                        <Users className="w-12 h-12 opacity-10" />
                        <p className="font-black text-xs uppercase tracking-widest">Aucun élève trouvé.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardStudentList;
