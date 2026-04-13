import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    Plus,
    ClipboardList,
    Settings2,
    Users
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button, Tabs } from '../core';
import { useGradeMutations, useAllEvaluations } from '../features/grades/hooks';
import EvaluationsTableExcel from '../features/grades/components/EvaluationsTableExcel';
import EvaluationDetailTable from '../features/grades/components/EvaluationDetailTable';
import AddEvaluationModal from '../features/grades/components/AddEvaluationModal';
import GradesByStudentTable from '../features/grades/components/GradesByStudentTable';
import GradeSettings from '../features/grades/components/GradeSettings';
import { gradeService } from '../features/grades/services';
import { TablesInsert } from '../types/supabase';
import { getCurrentUser } from '../lib/database';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useRef } from 'react';
import { usePeriods } from '../features/grades/hooks/usePeriods';

const Grades: React.FC = () => {
    // UI State
    const [activeTab, setActiveTab] = useState('evaluations');
    const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEvaluationData, setEditingEvaluationData] = useState<any>(null);
    const [editingQuestions, setEditingQuestions] = useState<any[]>([]);
    const [editingRegroupements, setEditingRegroupements] = useState<any[]>([]);
    const location = useLocation();
    
    // Multi-Select Filters State (Sync across all tabs)
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedPeriodes, setSelectedPeriodes] = useState<string[]>([]);

    const handleResetFilters = useCallback(() => {
        setSelectedBranches([]);
        setSelectedGroups([]);
        setSelectedPeriodes([]);
    }, []);

    // Period synchronization logic: update filters if a period is renamed in settings
    const { periods } = usePeriods();
    const prevPeriodsRef = useRef(periods);

    useEffect(() => {
        if (prevPeriodsRef.current !== periods && periods.length > 0 && prevPeriodsRef.current.length > 0) {
            // Check for renames (same ID, different label)
            const renames: Record<string, string> = {};
            prevPeriodsRef.current.forEach(oldP => {
                const newP = periods.find(p => p.id === oldP.id);
                if (newP && newP.label !== oldP.label) {
                    renames[oldP.label] = newP.label;
                }
            });

            if (Object.keys(renames).length > 0) {
                setSelectedPeriodes(prev => prev.map(label => renames[label] || label));
            }
        }
        prevPeriodsRef.current = periods;
    }, [periods]);

    // User State
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // Data Fetching
    const { evaluations } = useAllEvaluations();
    const selectedEvaluation = evaluations.find(ev => ev.id === selectedEvaluationId);

    // Reset view to encodage table when navigating to this page (e.g. sidebar click)
    useEffect(() => {
        if (location.pathname === '/dashboard/notes' && !location.search) {
            setSelectedEvaluationId(null);
            // Only switch to encodage if we are in settings (prevents losing tab state on simple nav)
            if (activeTab === 'settings') setActiveTab('encodage');
        }
    }, [location.key, location.pathname]);

    // Data for Add Modal (use mutations only to avoid over-fetching)
    const {
        createEvaluation,
        updateEvaluation,
        isCreating,
        isUpdating
    } = useGradeMutations();

    // Handlers
    const handleCreateEvaluation = (data: TablesInsert<'Evaluation'>, questions: any[], regroupements?: any[], results?: any[], options: { shouldClose?: boolean } = { shouldClose: true }) => {
        const isUpdate = !!editingEvaluationData;
        const finalId = isUpdate ? editingEvaluationData.id : (data.id || crypto.randomUUID());
        const effectiveData = { ...data, id: finalId };

        if (isUpdate) {
            updateEvaluation({ id: finalId, evaluation: data, questions, regroupements, results });
        } else {
            createEvaluation({ evaluation: effectiveData, questions, regroupements, results });
            setSelectedEvaluationId(finalId);
        }
        
        if (options.shouldClose !== false) {
            setIsAddModalOpen(false);
            setEditingEvaluationData(null);
            setEditingQuestions([]);
            setEditingRegroupements([]);
        }
    };

    const handleEditClick = async (evaluation: any) => {
        if (!user) return;
        setEditingEvaluationData(evaluation);
        const fetchedQuestions = await gradeService.getQuestions(evaluation.id, user.id);
        const fetchedRegroupements = await gradeService.getRegroupements(evaluation.id, user.id);
        setEditingQuestions(fetchedQuestions);
        setEditingRegroupements(fetchedRegroupements);
        setIsAddModalOpen(true);
    };

    const tabs = [
        { id: 'encodage', label: 'Encodage', icon: ClipboardList },
        { id: 'par_enfant', label: 'Par enfant', icon: Users },
        { id: 'settings', label: 'Paramètres', icon: Settings2 }
    ];

    return (
        <div className="p-6 w-full space-y-6 min-h-screen animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4">
                    {(selectedEvaluationId || activeTab === 'settings') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (selectedEvaluationId) setSelectedEvaluationId(null);
                                else setActiveTab('encodage');
                            }}
                            className="rounded-xl w-10 h-10 p-0 flex items-center justify-center hover:bg-white/5 border border-white/5 shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </Button>
                    )}
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            {activeTab === 'settings' ? (
                                <Settings2 className="text-primary" size={28} />
                            ) : (
                                <ClipboardList className="text-primary" size={28} />
                            )}
                            <h1 className="text-2xl font-black text-text-main uppercase tracking-tight">
                                {selectedEvaluationId ? (
                                    <div className="flex items-center gap-2">
                                        <span className="opacity-40">Notes</span>
                                        <span className="opacity-20 text-xs">/</span>
                                        <span className="text-primary">{selectedEvaluation?.titre || 'Évaluation'}</span>
                                    </div>
                                ) : (activeTab === 'settings' ? 'Configuration' : 'Notes & Évaluations')}
                            </h1>
                        </div>
                    </div>
                </div>

                {!selectedEvaluationId && (
                    <div className="flex items-center gap-4 bg-surface/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                        <Tabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onChange={setActiveTab}
                            variant="capsule"
                            level={3}
                        />
                        {activeTab === 'encodage' && (
                            <div className="h-8 w-px bg-white/10 mx-1" />
                        )}
                        {activeTab === 'encodage' && (
                            <Button
                                onClick={() => {
                                    setEditingEvaluationData(null);
                                    setEditingQuestions([]);
                                    setIsAddModalOpen(true);
                                }}
                                className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-text-dark"
                                size="sm"
                            >
                                <Plus size={18} className="mr-1.5" />
                                Nouveau
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            {activeTab === 'settings' ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <GradeSettings />
                </div>
            ) : activeTab === 'par_enfant' ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <GradesByStudentTable 
                        selectedBranches={selectedBranches}
                        setSelectedBranches={setSelectedBranches}
                        selectedGroups={selectedGroups}
                        setSelectedGroups={setSelectedGroups}
                        selectedPeriodes={selectedPeriodes}
                        setSelectedPeriodes={setSelectedPeriodes}
                        onResetFilters={handleResetFilters}
                    />
                </div>
            ) : selectedEvaluationId ? (
                <EvaluationDetailTable
                    evaluationId={selectedEvaluationId}
                    onBack={() => setSelectedEvaluationId(null)}
                    onEdit={handleEditClick}
                />
            ) : (
                <EvaluationsTableExcel
                    onSelectEvaluation={setSelectedEvaluationId}
                    onEditEvaluation={handleEditClick}
                    selectedBranches={selectedBranches}
                    setSelectedBranches={setSelectedBranches}
                    selectedGroups={selectedGroups}
                    setSelectedGroups={setSelectedGroups}
                    selectedPeriodes={selectedPeriodes}
                    setSelectedPeriodes={setSelectedPeriodes}
                    onResetFilters={handleResetFilters}
                />
            )}

            {/* Add Evaluation Modal */}
            <AddEvaluationModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingEvaluationData(null);
                    setEditingQuestions([]);
                    setEditingRegroupements([]);
                }}
                onSubmit={handleCreateEvaluation}
                brancheId={selectedBranches.length === 1 ? selectedBranches[0] : ''}
                groupId={selectedGroups.length === 1 ? selectedGroups[0] : ''}
                periode={selectedPeriodes.length === 1 ? selectedPeriodes[0] : ''}
                initialData={editingEvaluationData}
                initialQuestions={editingQuestions}
                initialRegroupements={editingRegroupements}
                isLoading={isCreating || isUpdating}
            />
        </div>
    );
};

export default Grades;
