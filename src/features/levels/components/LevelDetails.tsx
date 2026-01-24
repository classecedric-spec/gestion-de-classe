import React from 'react';
import { Layers, GraduationCap, User } from 'lucide-react';
import { LevelWithStudentCount } from '../../../types';
import { Tables } from '../../../types/supabase';
import { Badge, Avatar, EmptyState } from '../../../components/ui';

interface LevelDetailsProps {
    selectedLevel: LevelWithStudentCount | null;
    students: Tables<'Eleve'>[];
    loadingStudents: boolean;
}

const LevelDetails: React.FC<LevelDetailsProps> = ({ selectedLevel, students, loadingStudents }) => {
    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl flex flex-col overflow-hidden relative">
            {selectedLevel ? (
                <>
                    <div className="bg-surface/20 p-8 border-b border-white/5 flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-text-main flex items-center gap-3">
                                {selectedLevel.nom}
                            </h1>
                            <div className="flex items-center gap-3 mt-2 font-medium">
                                <Badge variant="secondary" size="md">
                                    <Layers size={16} className="text-primary mr-2" />
                                    Niveau scolaire
                                </Badge>
                                <Badge variant="primary" size="md">
                                    {students.length} Élève{students.length > 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Students List for this Level */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                        <h3 className="text-sm font-bold text-grey-dark uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/5 pb-2">
                            <GraduationCap size={16} className="text-primary" />
                            Élèves inscrits
                        </h3>

                        {loadingStudents ? (
                            <div className="flex justify-center p-8">
                                <Avatar loading size="md" initials="" />
                            </div>
                        ) : students.length === 0 ? (
                            <EmptyState
                                icon={User}
                                title="Aucun élève"
                                description="Aucun élève n'est encore inscrit dans ce niveau scolaire."
                                size="md"
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {students.map(student => (
                                    <div key={student.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all hover:bg-white/10 group cursor-default">
                                        <Avatar
                                            size="md"
                                            initials={`${student.prenom[0]}${student.nom[0]}`}
                                            className="bg-background text-primary font-bold text-lg"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-text-main truncate group-hover:text-primary transition-colors">{student.prenom} {student.nom}</div>
                                            <div className="text-xs text-grey-medium truncate">Né(e) le {student.date_naissance ? new Date(student.date_naissance).toLocaleDateString() : 'Inconnu'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <EmptyState
                    icon={Layers}
                    title="Sélectionnez un niveau"
                    description="Cliquez sur un niveau dans la liste pour voir les détails et les élèves inscrits."
                    size="lg"
                    className="flex-1"
                />
            )}
        </div>
    );
};

export default React.memo(LevelDetails);
