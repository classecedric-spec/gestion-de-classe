import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Table, Clock, Monitor } from 'lucide-react';
import { ROUTES } from '../routes';
import SuiviPedagogique from './SuiviPedagogique';
import AvancementAteliers from './AvancementAteliers';
import TimerModal from '../components/TimerModal';
import { Tabs, Button } from '../core';
import PageLayout from '../components/layout/PageLayout';

import { supabase } from '../lib/database';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { cleanupOrphanProgressions } from '../lib/database';
import { useTimer } from '../features/tracking/hooks/useTimer';
import ConfirmModal from '../core/ConfirmModal';
import { trackingService } from '../features/tracking/services/trackingService';
import { getMonday } from '../utils/dateUtils';

const SuiviGlobal: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { session } = useAuth();
    const userId = session?.user?.id;

    const params = new URLSearchParams(location.search);
    const activeView = params.get('tab') === 'groups' ? 'avancement' : 'suivi';
    const [currentTime, setCurrentTime] = useState(new Date());

    // Kiosk State
    const [kioskOpen, setKioskOpen] = useState(false);
    const [loadingKiosk, setLoadingKiosk] = useState(false);
    const [kioskPlanningOpen, setKioskPlanningOpen] = useState(false);
    const [loadingKioskPlanning, setLoadingKioskPlanning] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);


    const {
        timer,
        timerFinished,
        showTimerModal,
        setShowTimerModal,
        startTimer,
        closeTimerFinished,
        formatTime,
        setTimer,
        setTimerFinished
    } = useTimer();

    useEffect(() => {
        const timerInterval = setInterval(() => setCurrentTime(new Date()), 30000);

        // Run cleanup on mount
        cleanupOrphanProgressions();

        return () => clearInterval(timerInterval);
    }, []);

    // Fetch initial kiosk status from profile
    useEffect(() => {
        if (userId) {
            checkKioskStatus();
        }
    }, [userId]);

    const checkKioskStatus = async () => {
        if (!userId) return;
        try {
            const { data } = await supabase
                .from('CompteUtilisateur')
                .select('kiosk_is_open, kiosk_planning_open')
                .eq('id', userId)
                .single();

            if (data) {
                setKioskOpen(data.kiosk_is_open || false);
                setKioskPlanningOpen(data.kiosk_planning_open || false);
            }
        } catch (e) {
            console.error('Error fetching kiosk status', e);
        }
    };

    const toggleKiosk = async () => {
        if (!userId) return;
        setLoadingKiosk(true);
        const newState = !kioskOpen;

        try {
            const { error } = await supabase
                .from('CompteUtilisateur')
                .update({ kiosk_is_open: newState })
                .eq('id', userId);

            if (error) throw error;

            setKioskOpen(newState);
            toast.success(newState ? "Kiosque d'encodage OUVERT aux élèves" : "Kiosque d'encodage FERMÉ aux élèves");
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la modification du statut");
        } finally {
            setLoadingKiosk(false);
        }
    };

    const toggleKioskPlanning = async (forceNextState?: boolean | any) => {
        if (!userId) return;

        const isExplicit = typeof forceNextState === 'boolean';
        const nextState = isExplicit ? forceNextState : !kioskPlanningOpen;

        // Si on veut OUVRIR (nextState = true) et qu'on n'est pas déjà ouvert et que ce n'est pas une commande explicite
        if (nextState && !kioskPlanningOpen && !isExplicit) {
            setShowResetConfirm(true);
            return;
        }

        setLoadingKioskPlanning(true);
        try {
            const { error } = await supabase
                .from('CompteUtilisateur')
                .update({ kiosk_planning_open: nextState })
                .eq('id', userId);

            if (error) throw error;

            setKioskPlanningOpen(nextState);
            toast.success(nextState ? 'Kiosque Planification OUVERT' : 'Kiosque Planification FERMÉ');
        } catch (e) {
            console.error(e);
            toast.error('Erreur lors du changement de statut');
        } finally {
            setLoadingKioskPlanning(false);
        }
    };

    const handleConfirmReset = async () => {
        setShowResetConfirm(false);
        if (!userId) return;

        try {
            setLoadingKioskPlanning(true);
            const weekStart = getMonday();
            await trackingService.deleteWeeklyPlanning(userId, weekStart);
            toast.success("Données de la semaine effacées");
            await toggleKioskPlanning(true);
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de l'effacement des données");
        } finally {
            setLoadingKioskPlanning(false);
        }
    };

    const handleCancelReset = async () => {
        setShowResetConfirm(false);
        await toggleKioskPlanning(true);
    };

    const closeAllKiosks = async () => {
        if (!userId) return;
        setLoadingKiosk(true);
        setLoadingKioskPlanning(true);
        try {
            const { error } = await supabase
                .from('CompteUtilisateur')
                .update({ 
                    kiosk_is_open: false, 
                    kiosk_planning_open: false 
                })
                .eq('id', userId);

            if (error) throw error;

            setKioskOpen(false);
            setKioskPlanningOpen(false);
            toast.success("Tous les accès kiosque sont FERMÉS");
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la fermeture globale");
        } finally {
            setLoadingKiosk(false);
            setLoadingKioskPlanning(false);
        }
    };

    const forceOpenKioskPlanning = async () => {
        if (!userId) return;
        setLoadingKioskPlanning(true);
        try {
            const { error } = await supabase
                .from('CompteUtilisateur')
                .update({ kiosk_planning_open: true })
                .eq('id', userId);

            if (error) throw error;

            setKioskPlanningOpen(true);
            toast.success("Kiosque Planification OUVERT (Direct)");
        } catch (e) {
            console.error(e);
            toast.error("Échec de l'ouverture directe");
        } finally {
            setLoadingKioskPlanning(false);
        }
    };


    // --- Header Content Components ---
    const leftContent = (
        <div className="flex items-center gap-3 pl-20">
            <Button
                variant="ghost"
                onClick={() => window.open('/suivi-tbi', '_blank')}
                icon={Monitor}
                className="rounded-xl font-black uppercase tracking-[0.15em]"
                size="sm"
            >
                TBI
            </Button>

        </div>
    );

    const centerContent = (
        <Tabs
            tabs={[
                { id: 'suivi', label: 'Encodage', icon: Users },
                { id: 'avancement', label: 'Suivi des groupes', icon: Table }
            ]}
            activeTab={activeView}
            onChange={(id) => {
                if (id === 'suivi') navigate(ROUTES.DASHBOARD_SUIVI);
                else navigate(`${ROUTES.DASHBOARD_SUIVI}?tab=groups`);
            }}
            level={1}
            disableCompact={true}
            smart
        />
    );

    const rightContent = (
        <>
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
        </>
    );

    return (
        <PageLayout
            leftContent={leftContent}
            centerContent={centerContent}
            rightContent={rightContent}
        >
            <div className="flex-1 overflow-hidden h-full">
                {activeView === 'suivi' ? (
                    <SuiviPedagogique
                        timer={timer}
                        setTimer={setTimer as any}
                        timerFinished={timerFinished}
                        setTimerFinished={setTimerFinished}
                        kioskOpen={kioskOpen}
                        toggleKiosk={toggleKiosk}
                        loadingKiosk={loadingKiosk}
                        kioskPlanningOpen={kioskPlanningOpen}
                        toggleKioskPlanning={toggleKioskPlanning}
                        loadingKioskPlanning={loadingKioskPlanning}
                        closeAllKiosks={closeAllKiosks}
                        forceOpenKioskPlanning={forceOpenKioskPlanning}
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

            {timerFinished && (
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
                        <Button
                            onClick={closeTimerFinished}
                            className="w-full py-4 text-lg font-bold shadow-xl shadow-primary/20"
                            size="lg"
                        >
                            Je comprends
                        </Button>
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={handleConfirmReset}
                onCancel={handleCancelReset}
                title="Réinitialiser la planification ?"
                message="Souhaitez-vous effacer TOUTES les données de planification de cette semaine pour que les élèves recommencent avec une fiche vide ?"
                confirmText="Oui, effacer"
                cancelText="Non, garder les données"
                variant="danger"
            />
        </PageLayout>

    );
};

export default SuiviGlobal;
