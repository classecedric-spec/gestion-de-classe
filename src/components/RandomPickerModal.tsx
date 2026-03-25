import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Trophy } from 'lucide-react';
import { Student } from '../features/attendance/services/attendanceService';

interface RandomPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    pool: Student[];
    setPool: React.Dispatch<React.SetStateAction<Student[]>>;
}

const RandomPickerModal: React.FC<RandomPickerModalProps> = ({ isOpen, onClose, students, pool, setPool }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [displayStudent, setDisplayStudent] = useState<Student | null>(null);

    // Initial pick when modal opens if nothing selected yet
    useEffect(() => {
        if (isOpen && pool.length > 0 && !selectedStudent && !isSpinning) {
            pickRandom();
        }
    }, [isOpen]);

    const pickRandom = useCallback(() => {
        if (pool.length === 0) return;

        setIsSpinning(true);
        setSelectedStudent(null);

        // Spin effect
        let iterations = 0;
        const maxIterations = 15;
        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * pool.length);
            setDisplayStudent(pool[randomIndex]);
            iterations++;

            if (iterations >= maxIterations) {
                clearInterval(interval);
                const finalRandomIndex = Math.floor(Math.random() * pool.length);
                const winner = pool[finalRandomIndex];
                setDisplayStudent(winner);
                setSelectedStudent(winner);
                setIsSpinning(false);
            }
        }, 80);
    }, [pool]);

    if (!isOpen) return null;

    const removeAndRepick = () => {
        if (!selectedStudent) return;

        const currentSelectedId = selectedStudent.id;
        const newPool = pool.filter(s => s.id !== currentSelectedId);
        setPool(newPool);

        if (newPool.length > 0) {
            setIsSpinning(true);
            setSelectedStudent(null);

            let iterations = 0;
            const maxIterations = 15;
            const interval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * newPool.length);
                setDisplayStudent(newPool[randomIndex]);
                iterations++;

                if (iterations >= maxIterations) {
                    clearInterval(interval);
                    const finalRandomIndex = Math.floor(Math.random() * newPool.length);
                    const winner = newPool[finalRandomIndex];
                    setDisplayStudent(winner);
                    setSelectedStudent(winner);
                    setIsSpinning(false);
                }
            }, 80);
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
            <div className="bg-modal-bg border border-white/10 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-grey-dark">
                    <div className="flex flex-col text-left">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <span className="text-2xl">🎲</span> La Main Innocente
                        </h2>
                        <span className="text-[10px] text-grey-medium font-bold uppercase tracking-widest mt-1">
                            {pool.length} élève{pool.length > 1 ? 's' : ''} restant{pool.length > 1 ? 's' : ''} / {students.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
                        title="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col lg:flex-row min-h-[400px]">
                    
                    {/* Left Column: Picker */}
                    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-8 border-b lg:border-b-0 lg:border-r border-white/5">
                        
                        {/* Spinning / Result */}
                        {(isSpinning || selectedStudent) ? (
                            <div className={`transition-all duration-300 transform ${selectedStudent ? 'scale-110' : 'scale-100'}`}>
                                <div className={`w-40 h-40 rounded-full border-4 p-1 mb-6 mx-auto relative ${selectedStudent ? 'border-primary shadow-[0_0_50px_rgba(var(--primary),0.3)]' : 'border-white/10 opacity-70'}`}>
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
                                <div className="h-10">
                                    <h3 className={`text-3xl font-black uppercase tracking-tight ${selectedStudent ? 'text-primary' : 'text-white italic'}`}>
                                        {displayStudent ? `${displayStudent.prenom} ${displayStudent.nom}` : '...'}
                                    </h3>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center gap-4">
                                <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center opacity-20">
                                    <Trophy size={32} />
                                </div>
                                <span>
                                    {pool.length === 0 ? "Tout le monde est passé !" : "Prêt pour le tirage ?"}
                                </span>
                                {pool.length > 0 && (
                                    <button
                                        onClick={pickRandom}
                                        className="px-6 py-2 bg-primary text-text-dark rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                                    >
                                        Lancer
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="w-full space-y-3 pt-4">
                            {selectedStudent && !isSpinning && (
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={removeAndRepick}
                                        className="w-full py-3 bg-primary hover:bg-primary-dark text-text-dark rounded-xl font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mb-2"
                                    >
                                        <RefreshCw size={18} /> Retirer & Relancer
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={pickRandom}
                                            className="py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold uppercase tracking-wide transition-all text-xs"
                                        >
                                            Relancer (Garder)
                                        </button>
                                        <button
                                            onClick={removeFromPool}
                                            className="py-3 bg-white/5 hover:bg-rose-500/20 text-white hover:text-rose-500 border border-white/10 hover:border-rose-500/50 rounded-xl font-bold uppercase tracking-wide transition-all text-xs"
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
                            {pool.length < students.length && selectedStudent && !isSpinning && (
                                <button
                                    onClick={() => { setPool(students); }}
                                    className="text-xs text-gray-500 hover:text-white underline decoration-gray-700 underline-offset-4 transition-colors mt-2"
                                >
                                    Réinitialiser (garder ce tirage)
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Progress List */}
                    <div className="w-full lg:w-[500px] bg-black/20 p-8 flex flex-col space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">
                                Liste du groupe
                            </h4>
                            <div className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-bold text-rose-500 uppercase tracking-tighter">
                                {students.length - pool.length} Passé{students.length - pool.length > 1 ? 's' : ''}
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-4">
                                {students.sort((a,b) => a.prenom.localeCompare(b.prenom)).map((student) => {
                                    const isGone = !pool.find(s => s.id === student.id);
                                    return (
                                        <div 
                                            key={student.id} 
                                            className={`flex items-center gap-2 transition-all duration-300 p-2 rounded-lg border ${isGone ? 'bg-rose-500/5 border-rose-500/10' : 'bg-white/5 border-white/5'}`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isGone ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]'}`}></div>
                                            <span className={`text-[10px] font-bold truncate ${isGone ? 'text-rose-500 line-through italic opacity-60' : 'text-white/90'}`}>
                                                {student.prenom} {student.nom}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary Legend */}
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-grey-medium">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> En attente
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Déjà passé
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RandomPickerModal;
