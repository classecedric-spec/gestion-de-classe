import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    Plus,
    ClipboardList,
    Settings2
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button, Tabs } from '../core';
import EvaluationsTableExcel from '../features/grades/components/EvaluationsTableExcel';
import EvaluationDetailTable from '../features/grades/components/EvaluationDetailTable';
import AddEvaluationModal from '../features/grades/components/AddEvaluationModal';
import GradeSettings from '../features/grades/components/GradeSettings';
import { useGradeMutations } from '../features/grades/hooks/useGrades';
import { gradeService } from '../features/grades/services';
import { TablesInsert } from '../types/supabase';

const Grades: React.FC = () => {
    // UI State
    const [activeTab, setActiveTab] = useState('evaluations');
    const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEvaluationData, setEditingEvaluationData] = useState<any>(null);
    const [editingQuestions, setEditingQuestions] = useState<any[]>([]);
    const [editingRegroupements, setEditingRegroupements] = useState<any[]>([]);
    const location = useLocation();

    // Reset view to evaluations table when navigating to this page (e.g. sidebar click)
    useEffect(() => {
        if (location.pathname === '/dashboard/notes') {
            setSelectedEvaluationId(null);
            setActiveTab('evaluations');
        }
    }, [location.key, location.pathname]);

    // Data for Add Modal (use mutations only to avoid over-fetching)
    const {
        createEvaluation,
        updateEvaluation
    } = useGradeMutations();

    // Handlers
    const handleCreateEvaluation = async (data: TablesInsert<'Evaluation'>, questions: any[], regroupements?: any[]) => {
        try {
            if (editingEvaluationData) {
                await updateEvaluation({ id: editingEvaluationData.id, evaluation: data, questions, regroupements });
            } else {
                const newEval = await createEvaluation({ evaluation: data, questions, regroupements });
                if (newEval) setSelectedEvaluationId(newEval.id);
            }
            setIsAddModalOpen(false);
            setEditingEvaluationData(null);
            setEditingQuestions([]);
            setEditingRegroupements([]);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditClick = async (evaluation: any) => {
        setEditingEvaluationData(evaluation);
        const fetchedQuestions = await gradeService.getQuestions(evaluation.id);
        const fetchedRegroupements = await gradeService.getRegroupements(evaluation.id);
        setEditingQuestions(fetchedQuestions);
        setEditingRegroupements(fetchedRegroupements);
        setIsAddModalOpen(true);
    };

    const tabs = [
        { id: 'evaluations', label: 'Évaluations', icon: ClipboardList },
        { id: 'settings', label: 'Paramètres', icon: Settings2 }
    ];

    return (
        <div className="p-6 w-full space-y-6 min-h-screen animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {(selectedEvaluationId || activeTab === 'settings') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (selectedEvaluationId) setSelectedEvaluationId(null);
                                else setActiveTab('evaluations');
                            }}
                            className="rounded-full w-10 h-10 p-0 flex items-center justify-center hover:bg-grey-light/20"
                        >
                            <ChevronLeft size={24} />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-3xl font-black text-text-main flex items-center gap-3 tracking-tight">
                            {activeTab === 'settings' ? (
                                <>
                                    <Settings2 className="text-primary" size={32} />
                                    Configuration
                                </>
                            ) : (
                                <>
                                    <ClipboardList className="text-primary" size={32} />
                                    Notes & Évaluations
                                </>
                            )}
                        </h1>
                        <p className="text-grey-medium font-medium mt-1">
                            {activeTab === 'settings'
                                ? 'Personnalisez vos barèmes et types de notes'
                                : 'Gérez et encodez les résultats de vos élèves'
                            }
                        </p>
                    </div>
                </div>

                {!selectedEvaluationId && (
                    <div className="flex items-center gap-3">
                        <Tabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onChange={setActiveTab}
                            variant="capsule"
                            level={3}
                        />
                        {activeTab === 'evaluations' && (
                            <Button
                                onClick={() => {
                                    setEditingEvaluationData(null);
                                    setEditingQuestions([]);
                                    setIsAddModalOpen(true);
                                }}
                                className="border border-primary/30"
                            >
                                <Plus size={20} className="mr-2" />
                                Nouvelle Évaluation
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
            ) : selectedEvaluationId ? (
                <EvaluationDetailTable
                    evaluationId={selectedEvaluationId}
                    onBack={() => setSelectedEvaluationId(null)}
                />
            ) : (
                <EvaluationsTableExcel
                    onSelectEvaluation={setSelectedEvaluationId}
                    onEditEvaluation={handleEditClick}
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
                brancheId={''}
                groupId={''}
                periode={''}
                initialData={editingEvaluationData}
                initialQuestions={editingQuestions}
                initialRegroupements={editingRegroupements}
            />
        </div>
    );
};

export default Grades;
