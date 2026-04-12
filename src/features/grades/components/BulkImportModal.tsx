import React, { useState, useMemo } from 'react';
import { 
    Table, 
    Upload, 
    CheckCircle2, 
    AlertCircle, 
    X, 
    Grid,
    ChevronRight,
    Search
} from 'lucide-react';
import { Modal, Button, Textarea, Badge } from '../../../core';
import clsx from 'clsx';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: any[];
    questions: any[];
    evaluation: any;
    onImport: (mappedResults: any[]) => Promise<void>;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
    isOpen,
    onClose,
    students,
    questions,
    evaluation,
    onImport
}) => {
    const [rawText, setRawText] = useState('');
    const [step, setStep] = useState<'paste' | 'preview'>('paste');
    const [isImporting, setIsImporting] = useState(false);
    const [skipFirstColumn, setSkipFirstColumn] = useState(false);
    const [autoMatch, setAutoMatch] = useState(false);

    const hasQuestions = questions.length > 0;
    const noteMax = Number(evaluation?.note_max) || 20;

    // Utilité pour normaliser les noms (enlève les accents, met en minuscule)
    // Utilité pour normaliser les noms (enlève les accents, met en minuscule, gère les espaces multiples)
    const normalize = (str: string) => {
        return (str || '')
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
            .replace(/[^a-z0-s\s]/g, "") // Garde uniquement lettres et espaces
            .replace(/\s+/g, " ") // Normalise les espaces multiples
            .trim();
    };

    // Parsing logic
    const parsedData = useMemo(() => {
        if (!rawText.trim()) return [];
        return rawText.trim().split('\n').map(line => 
            line.split('\t').map(cell => cell.trim())
        );
    }, [rawText]);

    // Mapping logic
    const mappedResults = useMemo(() => {
        if (parsedData.length === 0) return [];
        
        return students.map((student, index) => {
            let rowData: string[] = [];
            let pastedName = '';

            if (autoMatch) {
                // Recherche par nom dans toutes les lignes
                const normSearch = normalize(`${student.prenom} ${student.nom}`);
                const normSearchAlt = normalize(`${student.nom} ${student.prenom}`);
                
                const foundRow = parsedData.find(row => {
                    const firstCell = normalize(row[0] || '');
                    return firstCell && (firstCell.includes(normSearch) || normSearch.includes(firstCell) || firstCell.includes(normSearchAlt));
                });

                if (foundRow) {
                    pastedName = foundRow[0];
                    rowData = skipFirstColumn ? foundRow.slice(1) : foundRow;
                }
            } else {
                // Correspondance par index (ordre affichage)
                const row = parsedData[index] || [];
                pastedName = skipFirstColumn ? row[0] : '';
                rowData = skipFirstColumn ? row.slice(1) : row;
            }
            
            if (hasQuestions) {
                // Map each column to a question result
                const qResults = questions.map((q, qIndex) => {
                    const val = rowData[qIndex];
                    const numVal = (val === undefined || val === '') ? null : parseFloat(val.replace(',', '.'));
                    
                    return {
                        eleve_id: student.id,
                        question_id: q.id,
                        note: isNaN(numVal as any) ? null : numVal,
                        titre: q.titre,
                        max: q.note_max,
                        isValid: numVal === null || (numVal >= 0 && numVal <= q.note_max)
                    };
                });
                
                return {
                    student,
                    pastedName,
                    questionResults: qResults,
                    hasError: qResults.some(r => !r.isValid),
                    isMatched: !!rowData.length
                };
            } else {
                // Map first column to global note
                const val = rowData[0];
                const numVal = (val === undefined || val === '') ? null : parseFloat(val.replace(',', '.'));
                const isValid = numVal === null || (numVal >= 0 && numVal <= noteMax);
                
                return {
                    student,
                    pastedName,
                    note: isNaN(numVal as any) ? null : numVal,
                    isValid,
                    hasError: !isValid,
                    isMatched: !!rowData.length
                };
            }
        });
    }, [parsedData, students, questions, hasQuestions, noteMax, skipFirstColumn, autoMatch]);

    const handleImport = async () => {
        setIsImporting(true);
        try {
            // Filter only matched students if autoMatch is on? 
            // Better to send all, empty ones will just not be updated or reset
            await onImport(mappedResults);
            setRawText('');
            setStep('paste');
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsImporting(false);
        }
    };

    const reset = () => {
        setRawText('');
        setStep('paste');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Importation depuis Excel"
            icon={Upload}
            className="!max-w-4xl"
            footer={
                <div className="flex justify-between w-full">
                    <Button variant="ghost" onClick={onClose} disabled={isImporting}>
                        Annuler
                    </Button>
                    <div className="flex gap-3">
                        {step === 'preview' && (
                            <Button variant="secondary" onClick={() => setStep('paste')} disabled={isImporting}>
                                Retour
                            </Button>
                        )}
                        {step === 'paste' ? (
                            <Button 
                                onClick={() => setStep('preview')} 
                                disabled={!rawText.trim()}
                                className="bg-primary text-grey-dark"
                            >
                                Suivant
                                <ChevronRight size={16} className="ml-2" />
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleImport}
                                loading={isImporting}
                                className="bg-primary text-grey-dark"
                            >
                                <CheckCircle2 size={18} className="mr-2" />
                                Confirmer l'importation
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            <div className="space-y-6 py-2">
                {step === 'paste' ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary flex items-start gap-3">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold">Instructions :</p>
                                <ul className="list-disc list-inside space-y-1 opacity-80">
                                    <li>Copiez vos notes dans Excel (sans les en-têtes).</li>
                                    <li>Collez-les ci-dessous.</li>
                                    <li>L'ordre doit correspondre à celui du tableau actuel : 
                                        <span className="font-black ml-1">Section → Prénom → Nom.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={skipFirstColumn} 
                                    onChange={(e) => setSkipFirstColumn(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-surface text-primary focus:ring-primary/20"
                                />
                                <span className="text-sm text-grey-medium group-hover:text-text-main transition-colors">
                                    La première colonne contient les noms
                                </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={autoMatch} 
                                    onChange={(e) => setAutoMatch(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-surface text-primary focus:ring-primary/20"
                                />
                                <span className="text-sm text-grey-medium group-hover:text-text-main transition-colors">
                                    Recherche automatique par nom
                                </span>
                            </label>
                        </div>

                        <div className="relative group">
                            <Textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Collez ici vos données Excel..."
                                className="min-h-[300px] font-mono text-sm bg-surface/50 border-white/10 group-focus-within:border-primary/30 transition-all rounded-xl p-4 pr-12"
                            />
                            {rawText && (
                                <button 
                                    onClick={() => setRawText('')}
                                    className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-grey-medium hover:text-white transition-all border border-white/10"
                                    title="Vider"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            {!rawText && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                    <Grid size={48} />
                                </div>
                            )}
                        </div>

                        {!autoMatch && parsedData.length > 0 && parsedData.length !== students.length && (
                            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-3">
                                <AlertCircle size={18} />
                                <span>
                                    Attention : Vous avez collé <b>{parsedData.length}</b> lignes, mais il y a <b>{students.length}</b> élèves. 
                                    Utilisez la "Recherche automatique" si l'ordre n'est pas le même.
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 overflow-hidden flex flex-col h-[50vh]">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-text-main flex items-center gap-2">
                                <Search size={18} className="text-primary" />
                                Aperçu de l'importation
                            </h3>
                            <div className="flex gap-2">
                                <Badge variant="secondary">{mappedResults.length} élèves</Badge>
                                {hasQuestions && <Badge variant="primary">{questions.length} critères</Badge>}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto border border-white/10 rounded-xl bg-surface/30">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 bg-table-header z-10 border-b border-white/10">
                                    <tr>
                                        <th className="p-3 font-bold text-grey-medium uppercase tracking-wider sticky left-0 bg-table-header">Élève (Système)</th>
                                        {skipFirstColumn && (
                                            <th className="p-3 font-bold text-grey-medium uppercase tracking-wider border-l border-white/5">Nom détecté (Excel)</th>
                                        )}
                                        {hasQuestions ? questions.map(q => (
                                            <th key={q.id} className="p-3 font-bold text-grey-medium uppercase tracking-wider text-center border-l border-white/5">
                                                {q.titre} <span className="opacity-50 font-normal">(/ {q.note_max})</span>
                                            </th>
                                        )) : (
                                            <th className="p-3 font-bold text-grey-medium uppercase tracking-wider text-center border-l border-white/5">
                                                Note / {noteMax}
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {mappedResults.map((result, idx) => (
                                        <tr key={idx} className={clsx(
                                            "hover:bg-white/5 transition-colors",
                                            !result.isMatched && "opacity-40 grayscale"
                                        )}>
                                            <td className="p-3 font-medium text-text-main sticky left-0 bg-surface">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center border border-white/10 text-[10px] font-black opacity-50">
                                                        {idx + 1}
                                                    </div>
                                                    <span>{result.student.prenom} {result.student.nom}</span>
                                                </div>
                                            </td>
                                            {skipFirstColumn && (
                                                <td className="p-3 border-l border-white/5 text-grey-medium italic">
                                                    {result.pastedName || <span className="text-red-400/50">Non trouvé</span>}
                                                </td>
                                            )}
                                            {hasQuestions ? result.questionResults.map((qr: any, qIdx: number) => (
                                                <td key={qIdx} className={clsx(
                                                    "p-3 text-center border-l border-white/5",
                                                    !qr.isValid && "bg-red-500/10 text-red-400 font-bold"
                                                )}>
                                                    {qr.note !== null ? qr.note : <span className="opacity-20">-</span>}
                                                </td>
                                            )) : (
                                                <td className={clsx(
                                                    "p-3 text-center border-l border-white/5 font-bold",
                                                    !result.isValid && "bg-red-500/10 text-red-400"
                                                )}>
                                                    {result.note !== null ? result.note : <span className="opacity-20">-</span>}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                            {mappedResults.some(r => r.hasError) && (
                                <div className="p-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    Erreurs détectées (en rouge)
                                </div>
                            )}
                            {autoMatch && mappedResults.some(r => !r.isMatched) && (
                                <div className="p-2 px-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] flex items-center gap-2">
                                    <Search size={14} />
                                    Certains élèves n'ont pas été trouvés par nom.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default BulkImportModal;
