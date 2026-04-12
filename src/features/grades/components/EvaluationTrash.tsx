import React, { useState } from 'react';
import { useGrades } from '../hooks/useGrades';
import Card from '../../../core/Card';
import Button from '../../../core/Button';
import ConfirmModal from '../../../core/ConfirmModal';
import { Trash2, RotateCcw, AlertTriangle, Calendar, Tag, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const EvaluationTrash: React.FC = () => {
    const { deletedEvaluations, restoreEvaluation, permanentDeleteEvaluation, loading } = useGrades();
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const evaluationToDelete = deletedEvaluations.find(e => e.id === confirmDeleteId);

    if (loading && deletedEvaluations.length === 0) {
        return <div className="text-center py-12 text-grey-medium">Chargement de la corbeille...</div>;
    }

    if (deletedEvaluations.length === 0) {
        return (
            <Card className="p-16 flex flex-col items-center justify-center text-center bg-input/10 border-dashed border-2 text-grey-medium">
                <Trash2 size={40} className="mb-4 opacity-10" />
                <h3 className="text-lg font-bold text-text-main mb-2">Corbeille vide</h3>
                <p className="text-sm max-w-sm">
                    Les évaluations supprimées apparaîtront ici. Vous pourrez les restaurer ou les supprimer définitivement.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <div className="text-sm text-amber-200/80">
                    <p className="font-bold text-amber-500 uppercase text-xs tracking-widest mb-1">Attention</p>
                    La suppression définitive est irréversible et supprimera également toutes les notes associées à l'évaluation.
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {deletedEvaluations.map((evaluation) => (
                    <Card key={evaluation.id} variant="gradient" className="group">
                        <Card.Body className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-grey-medium group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-inner">
                                    <Trash2 size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-text-main uppercase tracking-tight leading-none">
                                        {evaluation.titre}
                                    </h4>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <div className="flex items-center gap-1 text-[10px] text-grey-medium uppercase font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            <Calendar size={10} />
                                            {format(new Date(evaluation.date), 'dd MMMM yyyy', { locale: fr })}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-primary uppercase font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                                            <Users size={10} />
                                            {evaluation.Groupe?.nom || 'Sans groupe'}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-amber-500 uppercase font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                            <Tag size={10} />
                                            {evaluation.Branche?.nom || 'Sans branche'}
                                        </div>
                                    </div>
                                    {evaluation.deleted_at && (
                                        <p className="text-[10px] text-danger/60 italic">
                                            Supprimé le {format(new Date(evaluation.deleted_at), 'dd/MM à HH:mm')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button 
                                    variant="ghost" 
                                    icon={RotateCcw} 
                                    onClick={() => restoreEvaluation({ id: evaluation.id })}
                                    className="flex-1 md:flex-none hover:bg-success/10 hover:text-success text-success/60 text-xs font-bold uppercase tracking-widest"
                                    size="sm"
                                >
                                    Restaurer
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    icon={Trash2} 
                                    onClick={() => setConfirmDeleteId(evaluation.id)}
                                    className="flex-1 md:flex-none hover:bg-danger/10 text-danger/40 hover:text-danger text-xs font-bold uppercase tracking-widest"
                                    size="sm"
                                >
                                    Définitive
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                ))}
            </div>

            {/* Modal de confirmation de suppression définitive */}
            <ConfirmModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => {
                    if (confirmDeleteId) permanentDeleteEvaluation({ id: confirmDeleteId });
                }}
                variant="danger"
                title="Suppression Définitive"
                message={`Cette action supprimera définitivement l'évaluation "${evaluationToDelete?.titre}" et toutes les notes associées. C'est irréversible.`}
                confirmText="Supprimer définitivement"
                securityText={evaluationToDelete?.titre}
                securityPlaceholder="Nom de l'évaluation"
            />
        </div>
    );
};

export default EvaluationTrash;
