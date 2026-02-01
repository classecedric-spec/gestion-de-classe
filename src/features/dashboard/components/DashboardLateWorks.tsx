import React from 'react';
import { AlertCircle, Calendar, FileText, Folder, BookOpen, Clock } from 'lucide-react';
import { getInitials } from '../../../lib/helpers';
import { Avatar } from '../../../core';

interface DashboardLateWorksProps {
    overdueStudents: any[];
    onStudentClick: (student: any) => void;
}

const DashboardLateWorks: React.FC<DashboardLateWorksProps> = ({ overdueStudents, onStudentClick }) => {

    // Helper to format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Helper to get relative time status
    const getDelayStatus = (dateStr: string) => {
        const diffTime = Math.abs(new Date().getTime() - new Date(dateStr).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 14) return { label: '> 2 semaines', color: 'text-danger' };
        if (diffDays > 7) return { label: '> 1 semaine', color: 'text-warning' };
        return { label: `${diffDays} jours`, color: 'text-grey-medium' };
    };

    // Flatten all overdue items into a single list
    const allOverdueItems = overdueStudents.flatMap(student =>
        (student.overdueItems || []).map((item: any) => ({
            ...item,
            student: student // Keep reference to student
        }))
    );

    // Sort by Date (ASC) -> Student Name
    const sortedItems = allOverdueItems.sort((a, b) => {
        const dateA = new Date(a.Activite?.Module?.date_fin || 0).getTime();
        const dateB = new Date(b.Activite?.Module?.date_fin || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.student.prenom || '').localeCompare(b.student.prenom || '');
    });

    if (sortedItems.length === 0) {
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
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-background/50 text-grey-medium text-xs uppercase tracking-wider border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-bold">Élève</th>
                            <th className="px-6 py-4 font-bold">Module</th>
                            <th className="px-6 py-4 font-bold">Activité</th>
                            <th className="px-6 py-4 font-bold">Date de fin</th>
                            <th className="px-6 py-4 font-bold text-center">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedItems.map((item) => {
                            const module = item.Activite?.Module;
                            const dateFin = module?.date_fin;
                            const delay = getDelayStatus(dateFin);

                            return (
                                <tr key={`${item.id}_${item.student.id}`} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer"
                                            onClick={() => onStudentClick(item.student)}
                                        >
                                            <Avatar
                                                size="sm"
                                                src={item.student.photo_url}
                                                initials={getInitials(item.student)}
                                                className="border border-white/10"
                                            />
                                            <span className="font-bold text-white group-hover:text-primary transition-colors">
                                                {item.student.prenom} {item.student.nom}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-white">
                                            <BookOpen size={14} className="text-grey-medium" />
                                            {module?.nom}
                                        </div>
                                        {module?.SousBranche?.Branche && (
                                            <div className="mt-1 flex">
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
                                                    style={{
                                                        backgroundColor: `${module.SousBranche.Branche.couleur}15`,
                                                        color: module.SousBranche.Branche.couleur,
                                                        borderColor: `${module.SousBranche.Branche.couleur}20`
                                                    }}
                                                >
                                                    {module.SousBranche.Branche.nom}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-grey-light">
                                            <FileText size={14} />
                                            {item.Activite?.titre}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-danger font-bold">
                                                <Calendar size={14} />
                                                {formatDate(dateFin)}
                                            </div>
                                            <span className={`text-xs ${delay.color} mt-0.5`}>
                                                Retard: {delay.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`
                                            inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border
                                            ${item.etat === 'en_cours'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : 'bg-grey-medium/10 text-grey-medium border-grey-medium/20'}
                                        `}>
                                            {item.etat === 'en_cours' ? 'En cours' : 'Non commencé'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardLateWorks;
