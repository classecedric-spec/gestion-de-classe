import React from 'react';
import { Filter, ChevronDown, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getInitials } from '../../../../../lib/helpers';
import StudentProgressionGrid from '../../desktop/StudentProgressionGrid';
import ProgressionCell, { ProgressionStatus } from '../../desktop/ProgressionCell';
import { normalizeStatus } from '../../../utils/progressionHelpers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const withStyle = (style: React.CSSProperties) => ({ style });

interface StudentColumnWrapperProps {
    currentView: 'students' | 'modules';
    selectedStudent: any;
    showPendingOnly: boolean;
    setShowPendingOnly: (show: boolean) => void;
    // Data Props
    students: any[];
    loadingStudents: boolean;
    modules: any[];
    loadingModules: boolean;
    selectedModule: any;
    activities: any[];
    loadingActivities: boolean;
    progressions: any;
    // Actions
    onStudentSelect: (student: any) => void;
    onStatusClick: (activityId: string, status: string, currentStatus?: string) => void;
    onSelectModule: (module: any) => void;
}

export const StudentColumnWrapper: React.FC<StudentColumnWrapperProps> = ({
    currentView,
    selectedStudent,
    showPendingOnly,
    setShowPendingOnly,
    students,
    loadingStudents,
    modules,
    loadingModules,
    selectedModule,
    activities,
    loadingActivities,
    progressions,
    onStudentSelect,
    onStatusClick,
    onSelectModule
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* TOP HEADER */}
            <div className="flex flex-col border-b border-white/5 shrink-0">
                {currentView === 'students' ? (
                    <div className="p-4 flex items-center justify-between h-[60px]">
                        <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Élèves</span>
                    </div>
                ) : (
                    <div className="flex flex-col w-full animate-in slide-in-from-left-2 duration-300">
                        <div className="p-4 flex flex-col gap-4">
                            {selectedStudent && (
                                <div className="flex flex-col gap-3 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg shrink-0 bg-surface">
                                            {selectedStudent.photo_base64 ? (
                                                <img src={selectedStudent.photo_base64} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                                                    {getInitials(selectedStudent)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-xl font-bold text-white leading-tight truncate flex items-center gap-2">
                                                    <span>{selectedStudent.prenom}</span>
                                                    {selectedStudent.importance_suivi !== undefined && selectedStudent.importance_suivi !== null && (
                                                        <span className="text-[0.6em] font-medium text-grey-medium tabular-nums opacity-60">
                                                            ({selectedStudent.importance_suivi}%)
                                                        </span>
                                                    )}
                                                </h3>

                                                <button
                                                    onClick={() => setShowPendingOnly(!showPendingOnly)}
                                                    className={clsx(
                                                        "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all shrink-0",
                                                        showPendingOnly
                                                            ? "bg-primary/10 border-primary text-primary"
                                                            : "bg-surface/30 border-white/5 text-grey-medium hover:text-white"
                                                    )}
                                                >
                                                    <Filter size={10} />
                                                    {showPendingOnly ? "À faire" : "Tous"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar relative">
                {currentView === 'students' && (
                    <StudentProgressionGrid
                        students={students}
                        onStudentSelect={onStudentSelect}
                        loading={loadingStudents}
                    />
                )}

                {currentView === 'modules' && (
                    loadingModules ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
                            {modules.map((module: any) => {
                                const isExpired = module.date_fin && new Date(module.date_fin) < new Date();
                                const isExpanded = selectedModule?.id === module.id;

                                return (
                                    <div
                                        key={module.id}
                                        className={clsx(
                                            "rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col",
                                            isExpanded
                                                ? "bg-surface/40 border-primary/40 shadow-xl shadow-primary/5"
                                                : isExpired
                                                    ? "bg-surface/30 border-danger/40 hover:border-danger/60"
                                                    : "bg-surface/30 border-white/10 hover:bg-surface/50 hover:border-primary/30"
                                        )}
                                    >
                                        <button
                                            onClick={() => onSelectModule(isExpanded ? null : module)}
                                            className={clsx(
                                                "w-full text-left px-4 py-3.5 transition-all flex flex-col gap-2 group",
                                                isExpanded ? "bg-primary/5" : "hover:bg-white/[0.02]"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <ChevronDown
                                                        size={16}
                                                        className={clsx(
                                                            "transition-transform duration-300 text-grey-medium shrink-0",
                                                            isExpanded && "rotate-180 text-primary"
                                                        )}
                                                    />
                                                    <div className={clsx(
                                                        "text-sm font-bold transition-colors truncate",
                                                        isExpanded ? "text-primary" : "text-gray-200 group-hover:text-white"
                                                    )}>
                                                        {module.nom}
                                                    </div>
                                                </div>
                                                {module.date_fin && (
                                                    <div className="text-[11px] font-medium text-primary/70 shrink-0">
                                                        {format(new Date(module.date_fin), 'dd/MM', { locale: fr })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 w-full">
                                                <div className="flex-grow h-2 rounded-full bg-white/10 overflow-hidden min-w-[60px]">
                                                    <div
                                                        className={clsx(
                                                            "h-full transition-all duration-700 ease-out",
                                                            module.percent >= 70 ? "bg-success" :
                                                                module.percent >= 40 ? "bg-primary" :
                                                                    "bg-danger"
                                                        )}
                                                        {...withStyle({ width: `${module.percent || 0}%` })}
                                                    />
                                                </div>
                                                <span className="text-[9px] text-grey-medium font-medium whitespace-nowrap">
                                                    {module.completedActivities || 0}
                                                    {module.toVerifyActivities > 0 ? ` (+ ${module.toVerifyActivities})` : ''}
                                                    /{module.totalActivities || 0}
                                                </span>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-3 pb-4 space-y-2.5 animate-in slide-in-from-top-2 duration-300 border-t border-white/5 pt-3">
                                                {loadingActivities ? (
                                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary/50" size={16} /></div>
                                                ) : (
                                                    activities.map((activity: any) => (
                                                        <ProgressionCell
                                                            key={activity.id}
                                                            activity={activity}
                                                            currentStatus={normalizeStatus(progressions[activity.id]) as ProgressionStatus}
                                                            onStatusClick={onStatusClick}
                                                            studentLevelId={selectedStudent?.niveau_id}
                                                        />
                                                    ))
                                                )}
                                                {activities.length === 0 && !loadingActivities && (
                                                    <p className="text-center text-grey-medium text-[10px] py-2 italic">Aucune activité.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {modules.length === 0 && !loadingModules && (
                                <p className="text-center text-grey-medium text-sm py-4">Aucun module en cours.</p>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
