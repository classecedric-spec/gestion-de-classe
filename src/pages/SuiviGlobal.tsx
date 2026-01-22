import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Table, Clock, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { ROUTES } from '../routes';
import SuiviPedagogique from './SuiviPedagogique';
import AvancementAteliers from './AvancementAteliers';
import TimerModal from '../components/TimerModal';

import { cleanupOrphanProgressions } from '../lib/cleanupUtils';
import { Timer } from '../features/tracking/hooks/useTimerIntegration';

const SuiviGlobal: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const params = new URLSearchParams(location.search);
    const activeView = params.get('tab') === 'groups' ? 'avancement' : 'suivi';
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerInterval = setInterval(() => setCurrentTime(new Date()), 30000);

        // Run cleanup on mount
        cleanupOrphanProgressions();

        return () => clearInterval(timerInterval);
    }, []);

    // --- SHARED TIMER STATE ---
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [timerFinished, setTimerFinished] = useState(false);
    const [timer, setTimer] = useState<Timer>({
        active: false,
        duration: 0,
        timeLeft: 0,
        message: ''
    });

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (!timer.active) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev.timeLeft <= 1) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setTimerFinished(true);
                        if ('vibrate' in navigator) {
                            navigator.vibrate([200, 100, 200]);
                        }
                    }, 0);
                    return { ...prev, timeLeft: 0, active: false };
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timer.active]);

    const startTimer = (duration: number, message: string) => {
        setTimer({
            active: true,
            duration,
            timeLeft: duration,
            message
        });
        setShowTimerModal(false);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-background">
            {/* View Toggle Header */}
            <div className="bg-surface/50 border-b border-white/5 px-6 py-4 flex items-center sticky top-0 z-40 backdrop-blur-md shrink-0">
                {/* Left spacer to balance right side content for perfect centering */}
                <div className="flex-1 hidden lg:block" />

                <div className="neu-selector-container p-1.5 rounded-2xl mx-auto shadow-2xl overflow-hidden">
                    <button
                        onClick={() => navigate(ROUTES.DASHBOARD_SUIVI)}
                        data-active={activeView === 'suivi'}
                        className={clsx(
                            "rounded-xl font-black uppercase tracking-[0.15em] transition-all duration-300 px-4 py-2 flex items-center gap-2",
                            activeView === 'suivi'
                                ? "bg-primary text-text-dark shadow-lg scale-[1.02]"
                                : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Users size={20} />
                        <span className="hidden md:inline">Encodage</span>
                    </button>
                    <button
                        onClick={() => navigate(`${ROUTES.DASHBOARD_SUIVI}?tab=groups`)}
                        data-active={activeView === 'avancement'}
                        className={clsx(
                            "rounded-xl font-black uppercase tracking-[0.15em] transition-all duration-300 px-4 py-2 flex items-center gap-2",
                            activeView === 'avancement'
                                ? "bg-primary text-text-dark shadow-lg scale-[1.02]"
                                : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Table size={20} />
                        <span className="hidden md:inline">Suivi des groupes</span>
                    </button>
                    <button
                        onClick={() => window.open('/suivi-tbi', '_blank')}
                        className="rounded-xl font-black uppercase tracking-[0.15em] transition-all duration-300 px-4 py-2 flex items-center gap-2 text-grey-medium hover:text-white hover:bg-white/5"
                    >
                        <Monitor size={20} />
                        <span className="hidden md:inline">TBI</span>
                    </button>
                </div>

                {/* Right side content */}
                <div className="flex-1 flex justify-end items-center gap-6">
                    <div className="opacity-90 pointer-events-none hidden lg:block">
                        <span className="text-xl font-black text-white uppercase tracking-widest leading-none">
                            {currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Live Timer Countdown (if active) */}
                        {timer.active && (
                            <div
                                onClick={() => setShowTimerModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-xl cursor-pointer hover:bg-primary/30 transition-all animate-pulse"
                            >
                                <span className="text-xl font-black text-primary font-mono leading-none">
                                    {formatTime(timer.timeLeft)}
                                </span>
                            </div>
                        )}

                        <div
                            onClick={() => setShowTimerModal(true)}
                            className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner cursor-pointer hover:bg-white/10 transition-all group"
                            title="Configurer le minuteur"
                        >
                            <Clock size={16} className="text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-2xl font-black text-white font-mono tracking-[0.1em] leading-none">
                                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active View Content */}
            <div className="flex-1 overflow-hidden">
                {activeView === 'suivi' ? (
                    <SuiviPedagogique
                        timer={timer}
                        setTimer={setTimer}
                        timerFinished={timerFinished}
                        setTimerFinished={setTimerFinished}
                    />
                ) : (
                    <AvancementAteliers />
                )}
            </div>

            {/* SHARED MODALS & OVERLAYS */}
            <TimerModal
                isOpen={showTimerModal}
                onClose={() => setShowTimerModal(false)}
                onStart={startTimer}
            />

            {
                timerFinished && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-surface p-8 rounded-2xl border border-primary/30 shadow-2xl text-center max-w-sm w-full space-y-6 animate-in zoom-in-95 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-white to-primary animate-pulse opacity-50" />
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2 border border-primary/20 shadow-[0_0_30px_rgba(217,185,129,0.2)]">
                                <Clock size={40} className="animate-bounce" style={{ animationDuration: '3s' }} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">Terminé !</h2>
                                <p className="text-grey-medium">Le temps est écoulé.</p>
                            </div>
                            {timer.message && (
                                <div className="bg-primary/10 px-6 py-4 rounded-xl border border-primary/20">
                                    <p className="text-xl text-primary font-bold uppercase tracking-wider break-words">
                                        {timer.message}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setTimerFinished(false);
                                    setTimer(prev => ({ ...prev, message: '' }));
                                }}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-black text-lg font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20"
                            >
                                Je comprends
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default SuiviGlobal;
