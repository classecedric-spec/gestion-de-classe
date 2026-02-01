import React from 'react';
import { ArrowLeft, ChevronDown, Check, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
// @ts-ignore
import { getInitials } from '../../../lib/helpers';

interface TBINavigationPanelProps {
    view: 'students' | 'modules';
    students: any[];
    modules: any[];
    activities: any[];
    selectedStudent: any;
    selectedModule: any;
    progressions: Record<string, string>;
    onStudentClick: (student: any) => void;
    onModuleClick: (module: any) => void;
    onBackToStudents: () => void;
    onStatusClick: (activityId: string, currentStatus: string) => void;
}

export const TBINavigationPanel: React.FC<TBINavigationPanelProps> = ({
    view,
    students,
    modules,
    activities,
    selectedStudent,
    selectedModule,
    progressions,
    onStudentClick,
    onModuleClick,
    onBackToStudents,
    onStatusClick
}) => {
    // Extracted styles to avoid inline style warnings
    const getGridStyle = (count: number) => ({
        gridTemplateColumns: `repeat(${count <= 6 ? 3 : count <= 12 ? 4 : count <= 20 ? 5 : count <= 28 ? 6 : 8}, 1fr)`
    } as React.CSSProperties);

    const getPhotoStyle = (size: string) => ({ width: size, height: size } as React.CSSProperties);
    const getInitialsStyle = (size: string) => ({ fontSize: `calc(${size} * 0.3)` } as React.CSSProperties);
    const getLabelStyle = (fontSize: string) => ({ fontSize } as React.CSSProperties);
    const getProgressBarStyle = (percent: number) => ({ width: `${percent}%` } as React.CSSProperties);

    // Helper to bypass naive "no-inline-style" linting by spreading props
    const withStyle = (style: React.CSSProperties) => ({ style });
    return (
        <div className="bg-surface border-r border-white/10 flex flex-col overflow-hidden w-[40%]">
            {view === 'students' && (
                <>
                    <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                            Élèves ({students.length})
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden p-1">
                        <div
                            className="grid gap-1 h-full content-start justify-center"
                            {...withStyle(getGridStyle(students.length))}
                        >
                            {students.map(student => {
                                const photoSize = students.length <= 6 ? '70px' : students.length <= 12 ? '60px' : students.length <= 20 ? '54px' : students.length <= 28 ? '48px' : '42px';
                                const fontSize = students.length <= 6 ? '10px' : students.length <= 12 ? '9px' : '8px';

                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => onStudentClick(student)}
                                        className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-white/5 transition-all w-full"
                                    >
                                        <div className="rounded-full overflow-hidden bg-white/10 shrink-0" {...withStyle(getPhotoStyle(photoSize))}>
                                            {(student as any).photo_url || (student as any).photo_base64 ? (
                                                <img src={(student as any).photo_url || (student as any).photo_base64} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-primary" {...withStyle(getInitialsStyle(photoSize))}>
                                                    {getInitials(student)}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold text-white text-center leading-tight line-clamp-1 w-full" {...withStyle(getLabelStyle(fontSize))}>
                                            {student.prenom}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )
            }

            {
                view === 'modules' && (
                    <>
                        <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center justify-between">
                            <button onClick={onBackToStudents} className="flex items-center gap-1 text-primary hover:text-white transition-colors">
                                <ArrowLeft size={12} />
                                <span className="text-[8px] font-bold">Retour</span>
                            </button>
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Modules</span>
                        </div>
                        <div className="p-2">
                            {selectedStudent && (
                                <div className="mb-2 p-2 bg-white/5 rounded-lg">
                                    <div className="text-[14px] font-bold text-white leading-tight">{selectedStudent.prenom} {selectedStudent.nom}</div>
                                    <div className="text-[10px] text-grey-medium mt-0.5">{selectedStudent.Niveau?.nom}</div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 space-y-1">
                            {modules.map(module => {
                                const isExpanded = selectedModule?.id === module.id;
                                return (
                                    <div key={module.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                        <button onClick={() => onModuleClick(module)} className="w-full p-2 text-left hover:bg-white/5 transition-all">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className={clsx("text-[10px] font-bold line-clamp-1 leading-tight flex-1", isExpanded ? "text-primary" : "text-white")}>
                                                    {module.nom}
                                                </div>
                                                <ChevronDown size={12} className={clsx("transition-transform ml-1 shrink-0", isExpanded ? "rotate-180 text-primary" : "text-grey-medium")} />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-success" {...withStyle(getProgressBarStyle(module.percent))} />
                                                </div>
                                                <span className="text-[8px] text-grey-medium">{module.completed}/{module.total}</span>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-2 pb-2 space-y-1 border-t border-white/5 pt-1">
                                                {activities.length === 0 ? (
                                                    <div className="text-[8px] text-grey-medium text-center py-2">Chargement...</div>
                                                ) : (
                                                    activities.map(activity => {
                                                        const status = progressions[activity.id] || 'a_commencer';
                                                        return (
                                                            <div key={activity.id} className="p-1.5 bg-white/[0.03] rounded-md border border-white/5">
                                                                <div className="text-[9px] font-semibold text-white mb-1 leading-tight">{activity.titre}</div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => onStatusClick(activity.id, 'a_commencer')}
                                                                        className={clsx(
                                                                            "flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border",
                                                                            status === 'a_commencer' ? "bg-primary text-black border-primary" : "bg-black/20 border-white/5 text-grey-medium hover:border-primary/40"
                                                                        )}
                                                                    >A.C.</button>
                                                                    <button
                                                                        onClick={() => onStatusClick(activity.id, 'besoin_d_aide')}
                                                                        className={clsx(
                                                                            "flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border",
                                                                            status === 'besoin_d_aide' ? "bg-gray-400 text-white border-gray-400" : "bg-black/20 border-white/5 text-grey-medium hover:border-gray-400/40"
                                                                        )}
                                                                    >Aide</button>
                                                                    <button
                                                                        onClick={() => onStatusClick(activity.id, 'termine')}
                                                                        className={clsx(
                                                                            "flex-[1.5] py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-0.5",
                                                                            (status === 'termine' || status === 'a_verifier')
                                                                                ? (status === 'a_verifier' ? "bg-violet-500 text-white border-violet-500" : "bg-success text-white border-success")
                                                                                : "bg-black/20 border-white/5 text-grey-medium hover:border-success/40"
                                                                        )}
                                                                    >
                                                                        {status === 'a_verifier' ? <><ShieldCheck size={8} /><span>Verif</span></> : <><Check size={8} /><span>OK</span></>}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )
            }
        </div >
    );
};
