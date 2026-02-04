import React, { useState } from 'react';
import { AlertCircle, Calendar, FileText, ChevronDown, BookOpen, Clock, Layers } from 'lucide-react';
import { getInitials } from '../../../lib/helpers';
import { Avatar } from '../../../core';

interface Activity {
    id: string;
    titre: string;
    etat: string;
}

interface OverdueModule {
    id: string;
    nom: string;
    date_fin: string;
    SousBranche?: {
        nom: string;
        Branche?: {
            nom: string;
            couleur: string;
        };
    };
    activities: Activity[];
}

interface Student {
    id: string;
    prenom: string;
    nom: string;
    photo_url: string;
    overdueModules: OverdueModule[];
    overdueCount: number;
}

interface LevelGroup {
    name: string;
    students: Student[];
}

interface DashboardLateWorksProps {
    overdueStudents: LevelGroup[];
    onStudentClick: (student: any) => void;
}

const DashboardLateWorks: React.FC<DashboardLateWorksProps> = ({ overdueStudents, onStudentClick }) => {
    const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

    const toggleStudent = (studentId: string) => {
        setExpandedStudents(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (overdueStudents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-surface/30 rounded-3xl border border-white/5 border-dashed text-grey-medium space-y-4">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500">
                    <Clock size={48} />
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Tout est à jour !</h3>
                    <p className="max-w-md mx-auto">
                        Aucun travail en retard détecté pour le moment.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {overdueStudents.map((level) => (
                <div key={level.name} className="space-y-4">
                    {/* Level Separator */}
                    <div className="flex items-center gap-3 py-2 px-1 border-b border-white/5">
                        <Layers size={18} className="text-primary" />
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                            {level.name}
                        </h2>
                        <span className="text-xs text-grey-medium font-medium px-2 py-0.5 bg-white/5 rounded-full">
                            {level.students.length} élève{level.students.length > 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {level.students.map((student) => {
                            const isExpanded = expandedStudents[student.id];

                            return (
                                <div
                                    key={student.id}
                                    className={`bg-surface border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-primary/20 shadow-lg' : 'hover:border-white/10'}`}
                                >
                                    {/* Student Card Header */}
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer group"
                                        onClick={() => toggleStudent(student.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar
                                                size="md"
                                                src={student.photo_url}
                                                initials={getInitials(student)}
                                                className={`border-2 transition-colors ${isExpanded ? 'border-primary' : 'border-white/10'}`}
                                            />
                                            <div>
                                                <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                                                    {student.prenom} {student.nom}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="flex items-center gap-1 text-danger text-sm font-bold">
                                                        <AlertCircle size={14} />
                                                        {student.overdueCount} atelier{student.overdueCount > 1 ? 's' : ''} en retard
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStudentClick(student);
                                                }}
                                                className="p-2 text-grey-medium hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                title="Voir le suivi complet"
                                            >
                                                <Clock size={18} />
                                            </button>
                                            <div className={`p-2 rounded-xl bg-white/5 text-grey-light transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details (Accordion) */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-white/5 bg-white/[0.01]">
                                            <div className="mt-4 space-y-6">
                                                {student.overdueModules.map((module) => (
                                                    <div key={module.id} className="space-y-3 pl-2 border-l-2 border-white/10">
                                                        {/* Module Header */}
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <BookOpen size={16} className="text-grey-medium" />
                                                                    <span className="font-bold text-white">{module.nom}</span>
                                                                </div>
                                                                {/* Breadcrumb: Branche > Sous-branche */}
                                                                <div className="text-[10px] text-grey-medium flex items-center gap-1 uppercase tracking-wider">
                                                                    <span className="font-bold" style={{ color: module.SousBranche?.Branche?.couleur }}>
                                                                        {module.SousBranche?.Branche?.nom}
                                                                    </span>
                                                                    <span>&gt;</span>
                                                                    <span>{module.SousBranche?.nom}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-danger/10 text-danger rounded-lg border border-danger/20 self-start md:self-center">
                                                                <Calendar size={14} />
                                                                <span className="text-xs font-bold">{formatDate(module.date_fin)}</span>
                                                            </div>
                                                        </div>

                                                        {/* Activity List */}
                                                        <ul className="space-y-2 ml-6">
                                                            {module.activities.map((act) => (
                                                                <li key={act.id} className="flex items-center gap-2 text-sm text-grey-light">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-grey-medium/30" />
                                                                    <FileText size={12} className="text-grey-medium" />
                                                                    <span>{act.titre}</span>
                                                                    {act.etat === 'en_cours' && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-bold uppercase">
                                                                            En cours
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardLateWorks;
