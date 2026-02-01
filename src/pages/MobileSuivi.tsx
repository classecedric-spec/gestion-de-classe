import React from 'react';
import { Smartphone, Loader2, Check, LayoutList, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { useMobileTracking } from '../features/tracking/hooks/useMobileTracking';
import MobileHeader from '../features/tracking/components/mobile/MobileHeader';
import MobileRequestCard from '../features/tracking/components/mobile/MobileRequestCard';
import MobileFilterBar from '../features/tracking/components/mobile/MobileFilterBar';
import MobileModuleGroup from '../features/tracking/components/mobile/MobileModuleGroup';

const MobileSuivi: React.FC = () => {
    const { states, actions } = useMobileTracking();

    if (!states.groupId) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Smartphone size={48} className="text-primary mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Accès Mobile</h1>
                <p className="text-grey-medium">Veuillez ouvrir cette page depuis le Suivi Pédagogique.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-white flex flex-col font-sans select-none">

            <MobileHeader
                groups={states.groups}
                currentGroupId={states.groupId}
                onGroupChange={actions.handleGroupChange}
                isOnline={states.isOnline}
                helpRequestCount={states.helpRequests.length}
                isAutoGenerating={states.isAutoGenerating}
                onAutoSuivi={actions.handleAutoSuivi}
            />

            {/* Status Filters */}
            <div className="flex justify-between items-stretch gap-2 px-4 py-2 bg-background/95 sticky top-[72px] z-10 backdrop-blur-sm border-b border-white/5">
                {/* Left: All */}
                <button
                    onClick={() => actions.setSelectedStatusFilter('all')}
                    className={`min-w-[70px] flex flex-col items-center justify-center gap-1 px-3 rounded-xl text-xs font-bold transition-all ${states.selectedStatusFilter === 'all'
                        ? 'bg-white text-black'
                        : 'bg-surface border border-white/10 text-grey-medium'
                        }`}
                >
                    <LayoutList size={20} />
                    <span>Tous</span>
                </button>

                {/* Right: Grid 2x2 */}
                <div className="grid grid-cols-2 gap-2 flex-1">
                    <button
                        onClick={() => actions.setSelectedStatusFilter('besoin_d_aide')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${states.selectedStatusFilter === 'besoin_d_aide'
                            ? 'bg-[#A0A8AD] text-white border-[#A0A8AD]'
                            : 'bg-surface border border-white/10 text-grey-medium'
                            }`}
                    >
                        <AlertCircle size={12} /> Aide
                    </button>
                    <button
                        onClick={() => actions.setSelectedStatusFilter('a_verifier')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${states.selectedStatusFilter === 'a_verifier'
                            ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                            : 'bg-surface border border-white/10 text-grey-medium'
                            }`}
                    >
                        <Eye size={12} /> Vérif.
                    </button>
                    <button
                        onClick={() => actions.setSelectedStatusFilter('ajustement')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${states.selectedStatusFilter === 'ajustement'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-surface border border-white/10 text-grey-medium'
                            }`}
                    >
                        <RefreshCw size={12} /> Ajust.
                    </button>
                    <button
                        onClick={() => actions.setSelectedStatusFilter('valide')}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${states.selectedStatusFilter === 'valide'
                            ? 'bg-success text-white border-success'
                            : 'bg-surface border border-white/10 text-grey-medium'
                            }`}
                    >
                        <Check size={12} /> Validé
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4 pb-24">
                {states.loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">Synchronisation...</p>
                    </div>
                ) : states.helpRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                            <Check size={32} className="text-primary" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest">Rien à signaler</p>
                    </div>
                ) : (
                    states.selectedModuleFilter ? (
                        // MODULE VIEW: Grouped by Student
                        (() => {
                            const groupedByStudent: Record<string, typeof states.helpRequests> = {};
                            states.helpRequests.forEach((req: any) => {
                                if (req.eleve_id) {
                                    if (!groupedByStudent[req.eleve_id]) groupedByStudent[req.eleve_id] = [];
                                    groupedByStudent[req.eleve_id].push(req);
                                }
                            });

                            const sortedStudentIds = Object.keys(groupedByStudent).sort((a, b) => {
                                const studentA = states.uniqueStudents.find((s: any) => s.id === a);
                                const studentB = states.uniqueStudents.find((s: any) => s.id === b);
                                return (studentA?.prenom || '').localeCompare(studentB?.prenom || '');
                            });

                            if (sortedStudentIds.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                                            <Check size={32} className="text-primary" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest">Aucune activité pour ce module</p>
                                    </div>
                                );
                            }

                            return sortedStudentIds.map(studentId => {
                                const studentRequests = groupedByStudent[studentId].sort((a: any, b: any) => {
                                    return (a.activite?.ordre ?? 0) - (b.activite?.ordre ?? 0);
                                });
                                const student = states.uniqueStudents.find((s: any) => s.id === studentId);
                                const studentName = student ? `${student.prenom} ${student.nom}` : 'Élève inconnu';

                                return (
                                    <MobileModuleGroup
                                        key={studentId}
                                        studentId={studentId}
                                        studentName={studentName}
                                        requests={studentRequests}
                                        expandedRequestId={states.expandedRequestId}
                                        helpersCache={states.helpersCache}
                                        onExpandHelp={actions.handleExpandHelp}
                                        onStatusUpdate={actions.handleStatusUpdate}
                                        onClear={actions.handleClear}
                                    />
                                );
                            });
                        })()
                    ) : (
                        // STANDARD VIEW: Flat List
                        states.helpRequests.map((req: any) => (
                            <MobileRequestCard
                                key={req.id}
                                req={req}
                                isExpanded={states.expandedRequestId === req.id}
                                helpers={states.helpersCache[req.id]}
                                onExpand={actions.handleExpandHelp}
                                onStatusUpdate={actions.handleStatusUpdate}
                                onClear={actions.handleClear}
                            />
                        ))
                    )
                )}
            </div>

            <div className="p-6 bg-background/80 backdrop-blur-sm border-t border-white/5 text-center">
                <p className="text-[9px] font-bold text-grey-dark uppercase tracking-[0.2em]">Live Monitoring System</p>
            </div>

            <MobileFilterBar
                students={states.uniqueStudents}
                modules={states.uniqueModules}
                selectedFilter={states.selectedStudentFilter}
                selectedModuleFilter={states.selectedModuleFilter}
                onFilterChange={actions.setSelectedStudentFilter}
                onModuleFilterChange={actions.setSelectedModuleFilter}
            />
        </div>
    );
};

export default MobileSuivi;
