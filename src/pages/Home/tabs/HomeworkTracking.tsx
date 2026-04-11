import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Home as HomeIcon, Dices, RefreshCw } from 'lucide-react';
import { useHomeworkTracking } from '../../../features/tracking/hooks/useHomeworkTracking';
import { DashboardContextType } from '../DashboardContext';

export default function HomeworkTracking() {
    const { groups, selectedGroup, setSelectedGroup } = useOutletContext<DashboardContextType>();
    
    // Convert current date to matching format for input
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const { students, loading } = useHomeworkTracking(selectedGroup?.id || null, selectedDate);
    const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
    const [randomStudents, setRandomStudents] = useState<string[]>([]);

    const handlePickRandom = () => {
        if (students.length === 0) return;
        
        const shuffled = [...students].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(3, students.length)).map(s => s.id);
        setRandomStudents(selected);
        
        // Auto-expand these students
        setExpandedStudents(prev => {
            const next = new Set(prev);
            selected.forEach(id => next.add(id));
            return next;
        });
    };

    const toggleStudent = (studentId: string) => {
        setExpandedStudents(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setSelectedDate(new Date(e.target.value));
        }
    };

    const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const groupId = e.target.value;
        const group = groups.find(g => g.id === groupId) || null;
        setSelectedGroup(group);
        setRandomStudents([]); // Clear random when group changes
    };

    const renderStudentItem = (student: any, isRandom: boolean = false) => {
        const isExpanded = expandedStudents.has(student.id);
        const totalActivities = student.modules.reduce((acc: number, mod: any) => acc + mod.activities.length, 0);

        return (
            <div key={student.id} className={`bg-background/50 border ${isExpanded ? 'border-primary' : 'border-white/5'} ${isRandom ? 'shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_12%,transparent)]' : ''} rounded-xl overflow-hidden transition-all mb-2`}>
                <div
                    onClick={() => toggleStudent(student.id)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
                >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border-2 ${isRandom ? 'border-primary' : 'border-white/10'}`}>
                                <span className="text-xs font-black text-grey-medium">
                                    {student.prenom.charAt(0)}{student.nom.charAt(0)}
                                </span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                                <span className="text-[10px] font-bold text-background">
                                    {totalActivities}
                                </span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-white truncate">
                                    {student.prenom} {student.nom}
                                </span>
                                {isRandom && (
                                    <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-black">
                                        À évaluer
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-primary/80 font-medium">
                                {totalActivities} activité{totalActivities > 1 ? 's' : ''} prévue{totalActivities > 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    <div className="text-grey-medium ml-2">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-3">
                        <div className="h-px bg-white/5 mb-3" />
                        {student.modules.map((module: any) => (
                            <div key={module.id} className="bg-surface/50 rounded-lg p-3 border border-white/5">
                                <div className="mb-2">
                                    <h4 className="text-sm font-bold text-white">
                                        {module.nom}
                                    </h4>
                                </div>
                                <div className="space-y-2 pl-2 border-l-2 border-white/10 mt-2">
                                    {module.activities.map((act: any) => (
                                        <div key={act.id} className="text-xs text-grey-light flex items-center justify-between gap-2 bg-background/30 p-2 rounded">
                                            <span className="truncate">{act.titre}</span>
                                            <span className={`text-[10px] shrink-0 uppercase font-bold px-2 py-1 rounded-full ${
                                                act.statut === 'valide' ? 'bg-green-500/20 text-green-400' :
                                                act.statut === 'fini' ? 'bg-blue-500/20 text-blue-400' :
                                                act.statut === 'corrige' ? 'bg-orange-500/20 text-orange-400' :
                                                act.statut === 'demarre' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-white/10 text-grey-medium'
                                            }`}>
                                                {act.statut.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                {/* Header section */}
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <HomeIcon className="w-7 h-7 text-primary" />
                            Travaux à domicile
                        </h2>
                        <p className="text-sm text-grey-medium mt-1">
                            Consultez les devoirs planifiés par les élèves
                        </p>
                    </div>

                    {students.length > 0 && (
                        <button
                            onClick={handlePickRandom}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all font-bold text-sm"
                        >
                            <Dices size={18} />
                            <span>3 au hasard</span>
                        </button>
                    )}
                </div>

                {/* Filters Row - Under Title */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <select
                        title="Sélectionner un groupe"
                        value={selectedGroup?.id || ''}
                        onChange={handleGroupChange}
                        className="px-4 py-2.5 bg-background border border-white/10 rounded-xl text-white shadow-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                        <option value="" disabled>Choisir un groupe...</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.nom}</option>
                        ))}
                    </select>
                    <input
                        title="Sélectionner une date"
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={handleDateChange}
                        className="px-4 py-2.5 bg-background border border-white/10 rounded-xl text-white shadow-sm focus:outline-none focus:border-primary transition-colors [color-scheme:dark] cursor-pointer"
                    />
                </div>

                {/* Content List */}
                <div className="space-y-2">
                    {!selectedGroup ? (
                        <div className="py-12 bg-background/30 rounded-2xl border border-white/5 text-center">
                            <HomeIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-grey-medium">
                                Sélectionnez un groupe pour voir les travaux à domicile.
                            </p>
                        </div>
                    ) : loading ? (
                        <div className="py-12 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-t-transparent"></div>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="py-12 bg-background/30 rounded-2xl border border-white/5 text-center px-4">
                            <p className="text-grey-medium">
                                Aucun travail à domicile n'est planifié pour ce groupe à la date du <span className="text-white font-medium">{format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Random Selection Section */}
                            {randomStudents.length > 0 && (
                                <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                                            <RefreshCw size={14} className="animate-spin-slow" />
                                            Évaluations du jour
                                        </h3>
                                        <button 
                                            onClick={() => setRandomStudents([])}
                                            className="text-xs text-grey-medium hover:text-white underline"
                                        >
                                            Effacer la sélection
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {students
                                            .filter(s => randomStudents.includes(s.id))
                                            .map(student => renderStudentItem(student, true))
                                        }
                                    </div>
                                    <div className="mt-4 h-px bg-primary/10" />
                                    <p className="mt-4 text-[10px] text-grey-medium uppercase font-bold text-center">
                                        Liste complète ci-dessous
                                    </p>
                                </div>
                            )}

                            {/* Full List */}
                            <div className="space-y-2">
                                {students
                                    .filter(s => !randomStudents.includes(s.id))
                                    .map(student => renderStudentItem(student))
                                }
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
