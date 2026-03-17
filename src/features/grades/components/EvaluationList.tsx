import React, { useState } from 'react';
import { Tables } from '../../../types/supabase';
import { Card, Button, Badge, EmptyState, ConfirmModal } from '../../../core';
import { Calendar, Trash2, ChevronRight, BarChart3 } from 'lucide-react';

interface EvaluationListProps {
    evaluations: Tables<'Evaluation'>[];
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    brancheId?: string;
    periode?: string;
}

const EvaluationList: React.FC<EvaluationListProps> = ({
    evaluations,
    onSelect,
    onDelete,
    brancheId,
    periode
}) => {
    const [evalToDelete, setEvalToDelete] = useState<string | null>(null);

    if (!brancheId || !periode) {
        return (
            <EmptyState
                title="Saisie des notes"
                description="Veuillez sélectionner une branche et une période pour voir ou créer des évaluations."
                icon={BarChart3}
            />
        );
    }

    if (evaluations.length === 0) {
        return (
            <EmptyState
                title="Aucune évaluation"
                description="Il n'y a pas encore d'évaluation pour ce contexte. Cliquez sur 'Nouvelle Évaluation' pour commencer."
                icon={Calendar}
            />
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {evaluations.map((ev) => (
                    <Card key={ev.id} className="p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-grey-dark group-hover:text-primary transition-colors">
                                    {ev.titre}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-grey-medium">
                                    <Calendar size={12} />
                                    {new Date(ev.date).toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                                Coef. {ev.coefficient}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-6">
                            <div className="text-xs font-semibold text-primary">
                                Sur {ev.note_max}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEvalToDelete(ev.id);
                                    }}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 size={14} />
                                </Button>
                                <Button 
                                    size="sm" 
                                    onClick={() => onSelect(ev.id)}
                                    className="flex items-center gap-1"
                                >
                                    Saisir
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <ConfirmModal
                isOpen={!!evalToDelete}
                onClose={() => setEvalToDelete(null)}
                onConfirm={() => {
                    if (evalToDelete) {
                        onDelete(evalToDelete);
                        setEvalToDelete(null);
                    }
                }}
                title="Supprimer l'évaluation"
                message="Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action supprimera également toutes les notes associées."
                confirmText="Supprimer"
                variant="danger"
            />
        </>
    );
};

export default EvaluationList;
