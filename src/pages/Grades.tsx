import React, { useState } from 'react';
import { 
    ChevronLeft, 
    Plus, 
    ClipboardList, 
    BookOpen, 
    Settings2 
} from 'lucide-react';
import { Button, Tabs } from '../core';
import GradeContextSelector from '../features/grades/components/GradeContextSelector';
import GradeEntryGrid from '../features/grades/components/GradeEntryGrid';
import EvaluationList from '../features/grades/components/EvaluationList';
import AddEvaluationModal from '../features/grades/components/AddEvaluationModal';
import GradeSettings from '../features/grades/components/GradeSettings';
import { useGrades } from '../features/grades/hooks/useGrades';
import { useBranches } from '../features/branches/hooks/useBranches';
import { useGroupsData } from '../features/groups/hooks/useGroupsData';
import { TablesInsert } from '../types/supabase';

const Grades: React.FC = () => {
    // UI State
    const [activeTab, setActiveTab] = useState('evaluations');
    
    // Context State
    const [selectedBrancheId, setSelectedBrancheId] = useState<string>();
    const [selectedGroupId, setSelectedGroupId] = useState<string>();
    const [selectedPeriode, setSelectedPeriode] = useState<string>('Trimestre 1');
    const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Data Hooks
    const { branches } = useBranches();
    const { groups } = useGroupsData();
    const { 
        evaluations, 
        loading, 
        createEvaluation, 
        deleteEvaluation 
    } = useGrades(selectedBrancheId, selectedPeriode);

    // Derived State
    const currentEvaluation = evaluations.find(e => e.id === selectedEvaluationId);
    const hasContext = !!selectedBrancheId && !!selectedGroupId && !!selectedPeriode;

    // Handlers
    const handleCreateEvaluation = async (data: TablesInsert<'Evaluation'>, questions: any[]) => {
        try {
            const newEval = await createEvaluation({ evaluation: data, questions });
            setIsAddModalOpen(false);
            if (newEval) setSelectedEvaluationId(newEval.id);
        } catch (error) {
            console.error(error);
        }
    };

    const tabs = [
        { id: 'evaluations', label: 'Évaluations', icon: ClipboardList },
        { id: 'settings', label: 'Paramètres', icon: Settings2 }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                        <h1 className="text-3xl font-black text-grey-dark flex items-center gap-3 tracking-tight">
                            {selectedEvaluationId ? (
                                <>
                                    <ClipboardList className="text-primary" size={32} />
                                    {currentEvaluation?.titre}
                                </>
                            ) : activeTab === 'settings' ? (
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
                            {selectedEvaluationId 
                                ? `${selectedPeriode} • ${branches.find(b => b.id === selectedBrancheId)?.nom}`
                                : activeTab === 'settings'
                                ? 'Personnalisez vos barèmes et types de notes'
                                : 'Gérez et encodez les résultats de vos élèves'
                            }
                        </p>
                    </div>
                </div>

                {!selectedEvaluationId && activeTab === 'evaluations' && (
                    <div className="flex items-center gap-3">
                        <Tabs 
                            tabs={tabs} 
                            activeTab={activeTab} 
                            onChange={setActiveTab} 
                            variant="capsule"
                            level={3}
                        />
                        {hasContext && (
                            <Button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                            >
                                <Plus size={20} className="mr-2" />
                                Nouvelle Évaluation
                            </Button>
                        )}
                    </div>
                )}
                
                {!selectedEvaluationId && activeTab === 'settings' && (
                    <Tabs 
                        tabs={tabs} 
                        activeTab={activeTab} 
                        onChange={setActiveTab} 
                        variant="capsule"
                        level={3}
                    />
                )}
            </div>

            {/* Content Area */}
            {activeTab === 'settings' ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <GradeSettings />
                </div>
            ) : (
                <>
                    {/* Context Selector - Only visible when not in entry mode */}
                    {!selectedEvaluationId && (
                        <GradeContextSelector
                            branches={branches}
                            groups={groups}
                            selectedBrancheId={selectedBrancheId}
                            setSelectedBrancheId={setSelectedBrancheId}
                            selectedGroupId={selectedGroupId}
                            setSelectedGroupId={setSelectedGroupId}
                            selectedPeriode={selectedPeriode}
                            setSelectedPeriode={setSelectedPeriode}
                            disabled={loading}
                        />
                    )}

                    {/* Main Content Area */}
                    <div className="min-h-[400px]">
                        {!hasContext ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4 bg-surface rounded-3xl border border-dashed border-border/20">
                                <div className="p-6 rounded-full bg-grey-light/10 text-grey-light mb-4">
                                    <BookOpen size={64} strokeWidth={1} />
                                </div>
                                <h3 className="text-xl font-bold text-grey-dark">Prêt à commencer ?</h3>
                                <p className="max-w-xs text-grey-medium">
                                    Sélectionnez un groupe, une matière et une période pour voir les évaluations.
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <ClipboardList className="text-grey-light mb-4" size={48} />
                                <p className="text-grey-medium font-bold">Chargement des données...</p>
                            </div>
                        ) : selectedEvaluationId ? (
                            <GradeEntryGrid 
                                evaluationId={selectedEvaluationId} 
                                evaluation={currentEvaluation}
                            />
                        ) : (
                            <EvaluationList
                                evaluations={evaluations.filter(e => e.group_id === selectedGroupId)}
                                onSelect={setSelectedEvaluationId}
                                onDelete={deleteEvaluation}
                                brancheId={selectedBrancheId}
                                periode={selectedPeriode}
                            />
                        )}
                    </div>
                </>
            )}

            {/* Add Evaluation Modal */}
            {hasContext && (
                <AddEvaluationModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={handleCreateEvaluation}
                    brancheId={selectedBrancheId || ''}
                    groupId={selectedGroupId || ''}
                    periode={selectedPeriode}
                />
            )}
        </div>
    );
};

export default Grades;
