import React from 'react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';
import { Timer } from '../../hooks/useTimerIntegration';

interface TimerDisplayProps {
    timer: Timer;
    formatTime: (seconds: number) => string;
    onClick: () => void;
}

/**
 * TimerDisplay
 * Displays timer button with active countdown
 */
const TimerDisplay = React.memo<TimerDisplayProps>(({ timer, formatTime, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "p-2.5 rounded-xl border flex items-center justify-center transition-all shadow-2xl backdrop-blur-xl min-w-[46px]",
                timer.active
                    ? "bg-primary text-black border-primary"
                    : "bg-surface/60 text-grey-medium border-white/10 hover:border-primary/50 hover:text-white"
            )}
            title="Minuteur"
        >
            {timer.active ? (
                <span className="text-sm font-mono font-bold">{formatTime(timer.timeLeft)}</span>
            ) : (
                <Clock size={20} />
            )}
        </button>
    );
});

TimerDisplay.displayName = 'TimerDisplay';

export default TimerDisplay;
