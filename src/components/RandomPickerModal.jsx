
import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Trophy } from 'lucide-react';

const RandomPickerModal = ({ isOpen, onClose, students }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [displayStudent, setDisplayStudent] = useState(null);
    const [pool, setPool] = useState([]);

    useEffect(() => {
        if (isOpen && students) {
            setPool(students);
            setSelectedStudent(null);
            setDisplayStudent(null);
        }
    }, [isOpen, students]);

    if (!isOpen) return null;

    const pickRandom = () => {
        if (pool.length === 0) return;

        // Instant pick
        const randomIndex = Math.floor(Math.random() * pool.length);
        const winner = pool[randomIndex];

        setDisplayStudent(winner);
        setSelectedStudent(winner);
        setIsSpinning(false);
    };

    const removeAndRepick = () => {
        if (!selectedStudent) return;

        const newPool = pool.filter(s => s.id !== selectedStudent.id);
        setPool(newPool);

        if (newPool.length > 0) {
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

                    {!selectedStudent && !isSpinning && (
                        <div className="text-center space-y-2">
                            <div className="text-6xl mb-4 animate-bounce">👇</div>
                            <p className="text-gray-400 font-medium">Prêt à désigner l'élu(e) ?</p>
                            <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">
                                {pool.length} élèves en lice
                            </p>
                        </div>
                    )}

                    {(isSpinning || selectedStudent) && displayStudent && (
                        <div className={`transition-all duration-300 transform ${selectedStudent ? 'scale-110' : 'scale-100'}`}>
                            <div className={`w-40 h-40 rounded-full border-4 p-1 mb-6 mx-auto relative ${selectedStudent ? 'border-primary shadow-[0_0_50px_rgba(var(--primary),0.3)]' : 'border-white/10'}`}>
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                                    {displayStudent.photo_base64 ? (
                                        <img src={displayStudent.photo_base64} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-700 text-3xl font-black text-gray-500">
                                            {displayStudent.prenom[0]}
                                        </div>
                                    )}
                                </div>
                                {selectedStudent && (
                                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black p-2 rounded-full shadow-lg animate-in zoom-in duration-300">
                                        <Trophy size={24} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <h3 className={`text-3xl font-black uppercase tracking-tight ${selectedStudent ? 'text-primary animate-pulse' : 'text-white'}`}>
                                {displayStudent.prenom} {displayStudent.nom}
                            </h3>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full space-y-3 pt-4">
                        {!isSpinning && !selectedStudent && (
                            <button
                                onClick={pickRandom}
                                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                            >
                                Tirer au sort
                            </button>
                        )}

                        {selectedStudent && (
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

                        {pool.length < students.length && !isSpinning && (
                            <button
                                onClick={() => { setPool(students); setSelectedStudent(null); }}
                                className="text-xs text-gray-500 hover:text-white underline decoration-gray-700 underline-offset-4 transition-colors"
                            >
                                Réinitialiser la liste complète ({pool.length} / {students.length})
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RandomPickerModal;
