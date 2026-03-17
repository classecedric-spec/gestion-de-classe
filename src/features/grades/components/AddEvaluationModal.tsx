import React, { useState } from 'react';
import { Modal, Input, Button } from '../../../core';
import { Plus, Trash2, ListChecks, Settings2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useGrades } from '../hooks/useGrades';
import Select from '../../../core/Select';

interface AddEvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, questions: any[]) => void;
    brancheId?: string;
    groupId?: string;
    periode?: string;
}

const AddEvaluationModal: React.FC<AddEvaluationModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    brancheId,
    groupId,
    periode
}) => {
    const { session } = useAuth();
    const { noteTypes } = useGrades();
    const [titre, setTitre] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [coefficient, setCoefficient] = useState(1);
    const [noteMax, setNoteMax] = useState(10);
    const [typeNoteId, setTypeNoteId] = useState<string>('');
    const [withQuestions, setWithQuestions] = useState(false);
    const [questions, setQuestions] = useState([{ titre: '', note_max: 5, ordre: 0 }]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { titre: '', note_max: 5, ordre: questions.length }]);
    };

    const handleRemoveQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (index: number, field: string, value: any) => {
        const newQuestions = [...questions];
        (newQuestions[index] as any)[field] = value;
        
        // Auto-update total noteMax if using questions
        if (field === 'note_max') {
            const total = newQuestions.reduce((acc, q) => acc + (Number(q.note_max) || 0), 0);
            setNoteMax(total);
        }
        
        setQuestions(newQuestions);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userId = session?.user?.id;
        if (!userId || !brancheId || !groupId || !periode) return;

        const evaluationData = {
            titre,
            date,
            coefficient,
            note_max: noteMax,
            branche_id: brancheId,
            group_id: groupId,
            periode,
            user_id: userId,
            type_note_id: typeNoteId || null
        };

        onSubmit(evaluationData, withQuestions ? questions : []);
        
        // Reset and close
        setTitre('');
        setWithQuestions(false);
        setQuestions([{ titre: '', note_max: 5, ordre: 0 }]);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nouvelle Évaluation"
        >
            <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Titre de l'évaluation"
                            placeholder="ex: Dictée, Contrôle de mathématiques..."
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            required
                        />
                    </div>
                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Coefficient"
                            type="number"
                            min="0.25"
                            step="0.25"
                            value={coefficient}
                            onChange={(e) => setCoefficient(parseFloat(e.target.value))}
                            required
                        />
                        <Input
                            label="Note Max"
                            type="number"
                            min="1"
                            value={noteMax}
                            onChange={(e) => setNoteMax(parseFloat(e.target.value))}
                            disabled={withQuestions}
                            required
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Select 
                            label="Système de notation (Optionnel)"
                            value={typeNoteId}
                            onChange={(e) => setTypeNoteId(e.target.value)}
                            icon={Settings2}
                            options={[
                                { value: '', label: 'Points (Numérique)' },
                                ...noteTypes.map(nt => ({ value: nt.id, label: nt.nom }))
                            ]}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-border/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ListChecks size={20} className="text-primary" />
                            <span className="font-bold text-grey-dark">Détails par question</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-xs font-bold text-grey-medium uppercase tracking-wider group-hover:text-primary transition-colors">
                                Activer
                            </span>
                            <input 
                                type="checkbox" 
                                checked={withQuestions}
                                onChange={(e) => setWithQuestions(e.target.checked)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            />
                        </label>
                    </div>

                    {withQuestions && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            {questions.map((q, index) => (
                                <div key={index} className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <Input
                                            placeholder={`Question ${index + 1}`}
                                            value={q.titre}
                                            onChange={(e) => handleQuestionChange(index, 'titre', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="w-20">
                                        <Input
                                            type="number"
                                            placeholder="Max"
                                            value={q.note_max}
                                            onChange={(e) => handleQuestionChange(index, 'note_max', parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveQuestion(index)}
                                        className="mb-1 text-red-400 hover:text-red-600 h-10 w-10 p-0"
                                        disabled={questions.length === 1}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleAddQuestion}
                                className="w-full mt-2 border-dashed flex items-center justify-center gap-2"
                            >
                                <Plus size={14} />
                                Ajouter une question
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/5">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button variant="primary" type="submit">
                        Créer l'évaluation
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AddEvaluationModal;
