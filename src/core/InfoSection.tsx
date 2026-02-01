import React from 'react';
import clsx from 'clsx';

export interface InfoSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    /** Number of columns for the children (standard is 1) */
    columns?: 1 | 2 | 3;
}

/**
 * InfoSection
 * Container with title for a group of InfoRows.
 */
export const InfoSection: React.FC<InfoSectionProps> = ({
    title,
    children,
    className,
    columns = 1,
    ...props
}) => {
    return (
        <div className={clsx("space-y-6", className)} {...props}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">
                {title}
            </h3>
            <div className={clsx(
                "gap-4",
                columns === 1 && "space-y-4",
                columns === 2 && "grid grid-cols-1 sm:grid-cols-2",
                columns === 3 && "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}>
                {children}
            </div>
        </div>
    );
};
