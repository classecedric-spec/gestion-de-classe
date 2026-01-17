import React from 'react';
import { Layers, GraduationCap, User, ChevronRight, Loader2 } from 'lucide-react';

const LevelDetails = ({ selectedLevel, students, loadingStudents }) => {
    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl flex flex-col overflow-hidden relative">
            {selectedLevel ? (
                <>
                    <div className="bg-surface/20 p-8 border-b border-white/5 flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-text-main flex items-center gap-3">
                                {selectedLevel.nom}
                            </h1>
                            <p className="text-grey-medium flex items-center gap-2 mt-2 font-medium">
                                <Layers size={16} className="text-primary" />
                                Niveau scolaire
                                <span className="w-1 h-1 rounded-full bg-grey-dark"></span>
                                {students.length} Élève{students.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Students List for this Level */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                        <h3 className="text-sm font-bold text-grey-dark uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/5 pb-2">
                            <GraduationCap size={16} className="text-primary" />
                            Élèves inscrits
                        </h3>

                        {loadingStudents ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                        ) : students.length === 0 ? (
                            <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center">
                                <User size={48} className="text-grey-dark mb-4 opacity-50" />
                                <p className="text-grey-medium italic">Aucun élève dans ce niveau.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {students.map(student => (
                                    <div key={student.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all hover:bg-white/10 group">
                                        <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-lg shadow-inner">
                                            {student.prenom[0]}{student.nom[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-text-main truncate">{student.prenom} {student.nom}</div>
                                            <div className="text-xs text-grey-medium truncate">Né(e) le {new Date(student.date_naissance).toLocaleDateString()}</div>
                                        </div>
                                        <ChevronRight size={16} className="text-grey-dark group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 p-12">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Layers size={40} className="text-grey-medium" />
                    </div>
                    <h3 className="text-xl font-bold text-text-main mb-2">Sélectionnez un niveau</h3>
                    <p className="text-grey-medium max-w-sm">Cliquez sur un niveau dans la liste pour voir les détails et les élèves inscrits.</p>
                </div>
            )}
        </div>
    );
};

export default React.memo(LevelDetails);
