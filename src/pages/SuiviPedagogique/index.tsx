import React from 'react';
import TrackingDashboard from '../../features/tracking/components/TrackingDashboard';
import { Timer } from '../../features/tracking/hooks/useTimerIntegration';

interface SuiviPedagogiqueProps {
    timer: Timer;
    setTimer: (timer: Timer) => void;
    timerFinished: boolean;
    setTimerFinished: (finished: boolean) => void;
    kioskOpen?: boolean;
    toggleKiosk?: () => void;
    loadingKiosk?: boolean;
    kioskPlanningOpen?: boolean;
    toggleKioskPlanning?: () => void;
    loadingKioskPlanning?: boolean;
    closeAllKiosks?: () => void;
    forceOpenKioskPlanning?: () => void;
}

/**
 * Page component for Pedagogical Tracking (Suivi)
 * Logic and UI delegates to TrackingDashboard feature
 */
const SuiviPedagogique: React.FC<SuiviPedagogiqueProps> = (props) => {
    return <TrackingDashboard {...props} />;
};

export default SuiviPedagogique;
