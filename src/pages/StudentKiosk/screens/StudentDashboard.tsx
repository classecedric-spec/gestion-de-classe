import React, { useState, useEffect } from 'react';
import { useStudentKioskData } from '../hooks/useStudentKioskData';
import { ChevronDown, Loader2, LogOut, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useParams, useNavigate } from 'react-router-dom';
import ProgressionCell, { ProgressionStatus } from '../../../features/tracking/components/desktop/ProgressionCell';
import { normalizeStatus } from '../../../features/tracking/utils/progressionHelpers';

const StudentDashboard: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();

    const onReset = () => {
        try {
            window.close();
        } catch (e) {
            console.error("Could not close window", e);
        }
        // Fallback: navigate to kiosk home if window doesn't close (typical browser security)
        navigate('/kiosk');
    };

    const [timeLeft, setTimeLeft] = useState(45); // 45s in seconds

    // Auto-logout timer logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onReset();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const resetActivity = () => {
            setTimeLeft(45);
        };

        // Events to listen for
        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, resetActivity);
        });

        return () => {
            clearInterval(timer);
            events.forEach(event => {
                window.removeEventListener(event, resetActivity);
            });
        };
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const { student, modules, progressions, loading, updateStatus, refresh, kioskOpen } = useStudentKioskData(studentId);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    // Sort modules logic (filtering done in render)

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="text-white font-medium animate-pulse">Chargement de ton espace...</p>
            </div>
        );
    }

    if (!student) return null;

    // --- KIOSK CLOSED OVERLAY ---
    if (!kioskOpen) {
        return (
            <div className="flex flex-col h-full overflow-hidden relative items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-500">
                <div className="w-32 h-32 bg-danger/10 rounded-full flex items-center justify-center border-4 border-danger/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-pulse">
                    <LogOut size={64} className="text-danger" />
                </div>

                <div className="space-y-4 max-w-md">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                        Kiosque Fermé
                    </h1>
                    <p className="text-xl text-grey-medium">
                        L'accès aux exercices est désactivé pour le moment.
                    </p>
                </div>

                <div className="p-6 bg-surface/50 border border-white/5 rounded-2xl backdrop-blur-sm max-w-sm w-full mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                            {student.photo_url ? (
                                <img src={student.photo_url} alt="" className="w-full h-full object-cover grayscale opacity-70" />
                            ) : (
                                <div className="w-full h-full bg-surface flex items-center justify-center text-xl font-bold text-grey-medium">
                                    {(student.prenom || ' ')[0]}{(student.nom || ' ')[0]}
                                </div>
                            )}
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-white">{student.prenom} {student.nom}</h3>
                            <p className="text-sm text-grey-medium">Attends que le prof ouvre le kiosque !</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={refresh}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-bold border border-primary/30 transition-all active:scale-95"
                >
                    <RotateCcw size={20} />
                    <span>Réessayer</span>
                </button>
            </div>
        );
    }

    const handleModuleClick = (moduleId: string) => {
        setSelectedModuleId(prev => prev === moduleId ? null : moduleId);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Header (Sticky Topish - technically flex child) */}
            <div className="shrink-0 p-4 md:p-6 z-10 transition-all">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface/40 p-4 md:p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-xl transition-all">
                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                        <div className="relative shrink-0">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg bg-surface transition-all">
                                {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg md:text-2xl font-black text-primary">
                                        {(student.prenom || ' ')[0]}{(student.nom || ' ')[0]}
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-success rounded-full flex items-center justify-center border-2 md:border-4 border-background shadow-lg transition-all">
                                <CheckCircle2 size={12} className="md:w-4 md:h-4 text-black fill-current" />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-3xl font-black text-white leading-tight truncate transition-all">
                                Bonjour, {student.prenom} !
                            </h1>
                        </div>
                    </div>

                    <div className="flex gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
                        <button
                            onClick={refresh}
                            className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-surface hover:bg-white/5 border border-white/10 transition-all text-grey-medium hover:text-white active:scale-95 shrink-0"
                            title="Actualiser"
                        >
                            <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <button
                            onClick={onReset}
                            className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-danger/10 hover:bg-danger/20 border border-danger/20 transition-all text-danger flex items-center gap-2 md:gap-3 font-bold uppercase tracking-wider active:scale-95 shrink-0"
                        >
                            <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                            <span className="text-sm md:text-base">Sortir</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                <div className="max-w-5xl mx-auto w-full space-y-4">
                    {modules.filter((module: any) => {
                        const moduleActivities: any[] = module.Activite || [];
                        if (moduleActivities.length === 0) return false;

                        // Filter activities:
                        // 1. Must exist in progressions (assigned)
                        // 2. Must NOT be 'termine' or 'a_verifier' (incomplete)
                        const hasVisibleActivities = moduleActivities.some((a: any) => {
                            const status = progressions[a.id];
                            return status && status !== 'termine' && status !== 'a_verifier';
                        });

                        return hasVisibleActivities;
                    }).map((module: any) => {
                        const moduleActivities: any[] = module.Activite || [];

                        // Strict filtering for display inside the module
                        const visibleActivities = moduleActivities.filter((a: any) => {
                            const status = progressions[a.id];
                            return status && status !== 'termine' && status !== 'a_verifier';
                        });

                        // Stats calculation based on TOTAL activities (to show progress correctly)
                        // Or should we show progress relative to visually connected ones?
                        // User request: "only receive activities linked..."
                        // If I only receive 2 activities out of 10, showing "20% done" might be confusing if I can't see the other 8.
                        // But usually progress bar shows global progress.
                        // Let's keep the module stats as they are (global for the module), but only render the actionable items.
                        // Actually, if we filter the render loop, the 'percent' bar above might be misleading if it implies "100% of visible items".
                        // Standard behavior: Progress bar = Global Module Progress. List = Actionable Items.

                        const total = moduleActivities.length;
                        const completed = moduleActivities.filter((a: any) => {
                            const s = progressions[a.id];
                            return s === 'termine' || s === 'a_verifier';
                        }).length;
                        const percent = total > 0 ? (completed / total) * 100 : 0;

                        const isExpanded = selectedModuleId === module.id;
                        const isExpired = module.date_fin && new Date(module.date_fin) < new Date();

                        return (
                            <div
                                key={module.id}
                                className={clsx(
                                    "rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col",
                                    isExpanded
                                        ? "bg-surface/40 border-primary/40 shadow-xl shadow-primary/5"
                                        : isExpired
                                            ? "bg-surface/30 border-danger/40 hover:border-danger/60"
                                            : "bg-surface/30 border-white/10 hover:bg-surface/50 hover:border-primary/30"
                                )}
                            >
                                <button
                                    onClick={() => handleModuleClick(module.id)}
                                    className={clsx(
                                        "w-full text-left px-6 py-5 transition-all flex flex-col gap-3 group",
                                        isExpanded ? "bg-primary/5" : "hover:bg-white/[0.02]"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <ChevronDown
                                                size={24}
                                                className={clsx(
                                                    "transition-transform duration-300 text-grey-medium shrink-0",
                                                    isExpanded && "rotate-180 text-primary"
                                                )}
                                            />
                                            <div className={clsx(
                                                "text-lg font-bold transition-colors truncate",
                                                isExpanded ? "text-primary" : "text-gray-200 group-hover:text-white"
                                            )}>
                                                {module.nom}
                                            </div>
                                        </div>
                                        {module.date_fin && (
                                            <div className="text-sm font-medium text-primary/70 shrink-0 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                                {format(new Date(module.date_fin), 'dd MMM', { locale: fr })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 w-full pl-10">
                                        <div className="flex-grow h-3 rounded-full bg-black/40 overflow-hidden border border-white/5">
                                            {/* eslint-disable-next-line react-dom/no-unsafe-inline-style */}
                                            <div
                                                className={clsx(
                                                    "h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.3)] dynamic-width",
                                                    percent >= 70 ? "bg-success" :
                                                        percent >= 40 ? "bg-primary" :
                                                            "bg-danger"
                                                )}
                                                style={{ '--dynamic-width': `${percent}%` } as React.CSSProperties}
                                            />
                                        </div>
                                        <span className="text-xs text-grey-medium font-bold whitespace-nowrap min-w-[3rem] text-right">
                                            {Math.round(percent)}%
                                        </span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-6 pb-6 pt-2 space-y-3 animate-in slide-in-from-top-2 duration-300 border-t border-white/5">
                                        {visibleActivities.length > 0 ? (
                                            visibleActivities.map((activity: any) => (
                                                <ProgressionCell
                                                    key={activity.id}
                                                    activity={activity}
                                                    currentStatus={normalizeStatus(progressions[activity.id]) as ProgressionStatus}
                                                    onStatusClick={(actId, newStatus) => {
                                                        updateStatus(actId, newStatus);
                                                    }}
                                                    studentLevelId={student.niveau_id}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-grey-medium italic">
                                                Aucune activité à faire dans ce module
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {modules.length === 0 && (
                        <div className="text-center py-20 flex flex-col items-center gap-4">
                            <AlertCircle size={48} className="text-grey-dark" />
                            <p className="text-grey-medium text-lg">Aucun module actif pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Footer Timer */}
            <div className="shrink-0 bg-surface/90 border-t border-white/10 backdrop-blur-xl p-4 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-20">
                <div className="w-full max-w-5xl mx-auto flex items-center gap-4">
                    <div className="h-2 flex-grow bg-white/10 rounded-full overflow-hidden">
                        {/* eslint-disable-next-line react-dom/no-unsafe-inline-style */}
                        <div
                            className={clsx(
                                "h-full transition-all duration-1000 dynamic-width",
                                timeLeft < 30 ? "bg-danger animate-pulse" : "bg-primary"
                            )}
                            style={{ '--dynamic-width': `${(timeLeft / 45) * 100}%` } as React.CSSProperties}
                        />
                    </div>
                    <div className={clsx(
                        "font-mono font-black text-xl tabular-nums min-w-[80px] text-right",
                        timeLeft < 30 ? "text-danger animate-pulse" : "text-white"
                    )}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
