import React, { useState, useEffect, useCallback } from 'react';
import { X, Trophy } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-modal-bg lg:border border-white/10 lg:rounded-3xl w-full h-full lg:h-auto lg:max-w-5xl overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative flex flex-col">

                {/* Header */}
                <div className="px-6 py-2 border-b border-white/5 flex justify-between items-center bg-transparent shrink-0">
                    <div className="flex flex-col text-left">
                        <h2 className="text-[10px] lg:text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <span className="text-base lg:text-lg">🎲</span> La Main Innocente
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Fermer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col lg:flex-row flex-1 lg:h-[650px] max-h-[900px]">
                    
                    {/* Left Column (Top on mobile): Picker (27% height on mobile) */}
                    <div className={`h-[27%] lg:h-full lg:w-[320px] xl:w-[400px] p-4 lg:p-10 flex ${
                        selectedStudent && !isSpinning ? 'flex-row items-center justify-between gap-6' : 'flex-col items-center justify-center space-y-2 lg:space-y-10'
                    } border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-hidden shrink-0`}>
                        
                        {/* Background subtle decoration */}
                        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Result Part */}
                        {(isSpinning || selectedStudent) ? (
                            <>
                                {/* Photo / Winner (MAXXED OUT) */}
                                <div className={`flex flex-col items-center flex-1 transition-all duration-300 transform ${selectedStudent ? 'scale-100 lg:scale-125' : 'scale-90 lg:scale-100'}`}>
                                    <div className={`w-28 h-28 lg:w-56 lg:h-56 rounded-full border-4 p-1 mx-auto relative ${selectedStudent ? 'border-primary shadow-[0_0_60px_rgba(var(--primary),0.3)]' : 'border-white/10 opacity-70'}`}>
                                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 border-2 border-white/5">
                                            {(displayStudent as any)?.photo_url ? (
                                                <img src={(displayStudent as any).photo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-700 text-3xl lg:text-5xl font-black text-gray-500 uppercase">
                                                    {displayStudent?.prenom?.[0] || '?'}
                                                </div>
                                            )}
                                        </div>
                                        {selectedStudent && !isSpinning && (
                                            <div className="absolute -bottom-1 -right-1 lg:bottom-6 lg:right-6 bg-yellow-400 text-black p-1.5 lg:p-4 rounded-full shadow-lg animate-in zoom-in duration-300 ring-4 ring-grey-dark">
                                                <Trophy size={18} className="lg:hidden" />
                                                <Trophy size={32} className="hidden lg:block" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className={`mt-1.5 lg:mt-8 text-center text-xl lg:text-5xl font-black uppercase tracking-tight truncate w-full ${selectedStudent ? 'text-primary' : 'text-white italic opacity-50 animate-pulse'}`}>
                                        {displayStudent ? `${displayStudent.prenom}` : '...'}
                                    </h3>
                                </div>

                                {/* Actions / Buttons (Compact Right) */}
                                {selectedStudent && !isSpinning && (
                                    <div className="flex flex-col gap-1.5 lg:gap-6 w-[130px] lg:w-full animate-in fade-in slide-in-from-right-4 duration-500 shrink-0">
                                        <button
                                            onClick={removeAndRepick}
                                            className="w-full py-4 lg:py-6 bg-primary hover:bg-primary-dark text-text-dark rounded-md lg:rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-[10px] lg:text-sm shadow-xl shadow-primary/20"
                                        >
                                            Suivant
                                        </button>
                                        <button
                                            onClick={pickRandom}
                                            className="w-full py-2.5 lg:py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-md lg:rounded-2xl font-bold uppercase tracking-wide text-[9px] lg:text-xs"
                                        >
                                            Relancer
                                        </button>
                                        <button
                                            onClick={removeFromPool}
                                            className="w-full py-2.5 lg:py-4 bg-white/5 hover:bg-rose-500/10 text-white hover:text-rose-500 border border-white/10 hover:border-rose-500/20 rounded-md lg:rounded-2xl font-bold uppercase tracking-wide text-[9px] lg:text-xs"
                                        >
                                            Passer
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center gap-4">
                                <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest opacity-30">
                                    {pool.length === 0 ? "Fini !" : "Prêt ?"}
                                </span>
                                {pool.length > 0 && (
                                    <button
                                        onClick={pickRandom}
                                        className="px-10 py-3 bg-primary text-text-dark rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        Lancer
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {pool.length < students.length && !isSpinning && !selectedStudent && (
                            <button
                                onClick={() => { setPool(students); setSelectedStudent(null); }}
                                className="text-[8px] text-grey-medium hover:text-white underline decoration-primary/20 underline-offset-2"
                            >
                                Récupérer tous les élèves
                            </button>
                        )}
                    </div>

                    {/* Right Column (Bottom on mobile): Progress List (73% height on mobile) */}
                    <div className="h-[73%] lg:h-full w-full lg:flex-1 bg-black/30 lg:bg-black/10 p-4 lg:p-10 flex flex-col space-y-2 overflow-hidden border-t lg:border-t-0 lg:border-l border-white/5">
                        <div className="flex items-center justify-between shrink-0 mb-1">
                            {/* Left: Total Effectif */}
                            <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[7px] lg:text-[9px] font-black text-grey-medium uppercase tracking-wider">
                                {students.length} Élèves
                            </div>

                            {/* Right: Restants and Passés (Red Pill) */}
                            <div className="flex items-center gap-1.5">
                                <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[7px] lg:text-[9px] font-black text-primary uppercase">
                                    {pool.length} Restant{pool.length > 1 ? 's' : ''}
                                </div>
                                <div className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[7px] lg:text-[9px] font-black text-rose-500 uppercase">
                                    {students.length - pool.length} Passé{students.length - pool.length > 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center overflow-hidden py-1">
                            {/* DYNAMIC GRID - Photos les plus grandes possibles sans scroll ni débordement */}
                            <div className={`grid gap-1.5 lg:gap-6 justify-center items-center h-full ${
                                students.length <= 12 ? 'grid-cols-3' : 
                                students.length <= 18 ? 'grid-cols-4' : 
                                students.length <= 24 ? 'grid-cols-5' : 
                                students.length <= 36 ? 'grid-cols-6' : 
                                students.length <= 49 ? 'grid-cols-7' : 'grid-cols-8'
                            }`}>
                                {students.sort((a,b) => a.prenom.localeCompare(b.prenom)).map((student) => {
                                    const isGone = !pool.find(s => s.id === student.id);
                                    return (
                                        <div 
                                            key={student.id} 
                                            className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500"
                                        >
                                            <div className={`relative w-full aspect-square rounded-full border transition-all duration-300 overflow-hidden ${
                                                isGone ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'border-white/10'
                                            } ${
                                                students.length > 49 ? 'max-w-[32px]' :
                                                students.length > 36 ? 'max-w-[40px]' :
                                                students.length > 24 ? 'max-w-[48px]' :
                                                students.length > 18 ? 'max-w-[58px]' : 
                                                'max-w-[85px]'
                                            }`}>
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-grey-dark text-[8px] font-bold text-grey-light">
                                                        {student.prenom[0]}
                                                    </div>
                                                )}
                                                {isGone && (
                                                    <div className="absolute inset-0 bg-rose-500/10 z-10 backdrop-blur-[0.5px]"></div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RandomPickerModal;
