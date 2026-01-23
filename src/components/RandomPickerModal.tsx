import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Trophy } from 'lucide-react';
import { Student } from '../features/attendance/services/attendanceService';

interface RandomPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
}

const RandomPickerModal: React.FC<RandomPickerModalProps> = ({ isOpen, onClose, students }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [displayStudent, setDisplayStudent] = useState<Student | null>(null);
    const [pool, setPool] = useState<Student[]>([]);

    // Initialize pool when modal opens
    useEffect(() => {
        if (isOpen && students) {
            setPool(students);
            setSelectedStudent(null);
            setDisplayStudent(null);
        }
    }, [isOpen, students]);

    const pickRandom = useCallback(() => {
        if (pool.length === 0) return;

        // Instant pick without delay
        const randomIndex = Math.floor(Math.random() * pool.length);
        const winner = pool[randomIndex];

        setDisplayStudent(winner);
        setSelectedStudent(winner);
        setIsSpinning(false);
    }, [pool]);

    // Auto-start effect
    useEffect(() => {
        if (isOpen && pool.length > 0 && !selectedStudent && !isSpinning) {
            pickRandom();
        }
    }, [isOpen, pool, selectedStudent, isSpinning, pickRandom]);

    if (!isOpen) return null;

    const removeAndRepick = () => {
        if (!selectedStudent) return;

        const newPool = pool.filter(s => s.id !== selectedStudent.id);
        setPool(newPool);

        if (newPool.length > 0) {
            // Instant repick
            const randomIndex = Math.floor(Math.random() * newPool.length);
            const winner = newPool[randomIndex];
            setDisplayStudent(winner);
            setSelectedStudent(winner);
        } else {
            setSelectedStudent(null);
            setDisplayStudent(null);
        }
    };

    const removeFromPool = () => {
        if (selectedStudent) {
            setPool(prev => prev.filter(s => s.id !== selectedStudent.id));
            setSelectedStudent(null);
            setDisplayStudent(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-modal-bg border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-grey-dark">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="text-2xl">🎲</span> La Main Innocente
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-8">

                    {/* Spinning / Result */}
                    {(isSpinning || selectedStudent) ? (
                        <div className={`transition-all duration-300 transform ${selectedStudent ? 'scale-110' : 'scale-100'}`}>
                            <div className={`w-40 h-40 rounded-full border-4 p-1 mb-6 mx-auto relative ${selectedStudent ? 'border-primary shadow-[0_0_50px_rgba(var(--primary),0.3)]' : 'border-white/10'}`}>
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                                    {(displayStudent as any)?.photo_url ? (
                                        <img src={(displayStudent as any).photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-700 text-3xl font-black text-gray-500">
                                            {displayStudent?.prenom?.[0] || '?'}
                                        </div>
                                    )}
                                </div>
                                {selectedStudent && !isSpinning && (
                                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black p-2 rounded-full shadow-lg animate-in zoom-in duration-300">
                                        <Trophy size={24} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <h3 className={`text-3xl font-black uppercase tracking-tight ${selectedStudent ? 'text-primary animate-pulse' : 'text-white'}`}>
                                {isSpinning ? '...' : `${displayStudent?.prenom} ${displayStudent?.nom}`}
                            </h3>
                        </div>
                    ) : (
                        <div className="text-gray-500">
                            {pool.length === 0 ? "Aucun élève disponible" : "Tirage en cours..."}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full space-y-3 pt-4">
                        {selectedStudent && !isSpinning && (
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={removeAndRepick}
                                    className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mb-2"
                                >
                                    <RefreshCw size={18} /> Retirer & Relancer
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={pickRandom}
                                        className="py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold uppercase tracking-wide transition-all"
                                    >
                                        Relancer (Garder)
                                    </button>
                                    <button
                                        onClick={removeFromPool}
                                        className="py-3 bg-white/5 hover:bg-rose-500/20 text-white hover:text-rose-500 border border-white/10 hover:border-rose-500/50 rounded-xl font-bold uppercase tracking-wide transition-all"
                                    >
                                        Retirer du jeu
                                    </button>
                                </div>
                            </div>
                        )}

                        {pool.length < students.length && !isSpinning && !selectedStudent && (
                            <button
                                onClick={() => { setPool(students); setSelectedStudent(null); }}
                                className="text-xs text-gray-500 hover:text-white underline decoration-gray-700 underline-offset-4 transition-colors"
                            >
                                Réinitialiser la liste complète ({pool.length} / {students.length})
                            </button>
                        )}
                        {pool.length < students.length && selectedStudent && (
                            <button
                                onClick={() => { setPool(students); pickRandom(); }}
                                className="text-xs text-gray-500 hover:text-white underline decoration-gray-700 underline-offset-4 transition-colors mt-2"
                            >
                                Réinitialiser et Relancer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RandomPickerModal;
