import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { useGroupsAndStudents } from '../../../features/tracking/hooks/useGroupsAndStudents';
import { getInitials } from '../../../lib/helpers';

const StudentSelection: React.FC = () => {
    const navigate = useNavigate();
    const {
        states: {
            groups,
            selectedGroupId,
            students,
            loadingStudents
        },
        actions: {
            handleGroupSelect
        }
    } = useGroupsAndStudents();

    // If only one group and not selected, select it automatically (optional, but good UX)
    React.useEffect(() => {
        if (groups.length === 1 && !selectedGroupId) {
            handleGroupSelect(groups[0].id);
        }
    }, [groups, selectedGroupId, handleGroupSelect]);

    const handleStudentClick = (studentId: string) => {
        navigate(`/kiosk/${studentId}`);
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col h-screen">
            <div className="mb-8 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Bonjour ! 👋</h1>
                    <p className="text-grey-medium">Qui est-ce qui travaille ?</p>
                </div>

                {groups.length > 1 && (
                    <div className="relative">
                        <select
                            value={selectedGroupId || ''}
                            onChange={(e) => handleGroupSelect(e.target.value)}
                            className="bg-surface border border-white/10 text-white text-lg rounded-xl py-2 pl-4 pr-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        >
                            <option value="" disabled>Choisir un groupe</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.nom}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium">
                            <ChevronRight size={20} className="rotate-90" />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {!selectedGroupId ? (
                    <div className="h-full flex flex-col items-center justify-center text-grey-medium opacity-50">
                        <Users size={64} className="mb-4" />
                        <p className="text-xl font-bold">Veuillez sélectionner un groupe</p>
                    </div>
                ) : loadingStudents ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 pb-20">
                        {students.map(student => (
                            <button
                                key={student.id}
                                onClick={() => handleStudentClick(student.id)}
                                className="aspect-[4/5] bg-surface border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-4 hover:bg-white/5 hover:scale-[1.02] hover:border-primary/50 transition-all group"
                            >
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-primary transition-colors">
                                    {student.photo_url || (student as any).photo_base64 ? (
                                        <img
                                            src={student.photo_url || (student as any).photo_base64}
                                            alt={`${student.prenom} ${student.nom}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary/50 group-hover:text-primary">
                                            {getInitials(student)}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-white leading-tight group-hover:text-primary transition-colors">
                                        {student.prenom}
                                    </h3>
                                    <span className="text-sm text-grey-medium font-medium">
                                        {student.nom}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSelection;
