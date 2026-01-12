import React from 'react';
import PropTypes from 'prop-types';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

/**
 * TimerDisplay
 * Displays timer button with active countdown
 */
const TimerDisplay = ({ timer, formatTime, onClick }) => {
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
};

TimerDisplay.propTypes = {
    timer: PropTypes.shape({
        active: PropTypes.bool,
        timeLeft: PropTypes.number,
        duration: PropTypes.number,
        message: PropTypes.string
    }).isRequired,
    formatTime: PropTypes.func.isRequired,
    onClick: PropTypes.func.isRequired
};

export default TimerDisplay;
