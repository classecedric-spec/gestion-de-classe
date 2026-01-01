import React from 'react';
import clsx from 'clsx';

const Card = ({ children, className, noPadding = false, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "bg-surface border border-border/10 rounded-2xl overflow-hidden shadow-lg transition-all",
                !noPadding && "p-6",
                onClick && "cursor-pointer hover:border-primary/50 hover:bg-surface/80 active:scale-98",
                className
            )}
        >
            {children}
        </div>
    );
};

export default Card;
