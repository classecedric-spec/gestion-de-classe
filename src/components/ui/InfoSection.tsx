import React from 'react';
import clsx from 'clsx';

export interface InfoSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Titre de la section (en majuscules, souligné) */
    title: string;
}

/**
 * InfoSection
 * Conteneur pour une section d'informations (Titre + Liste d'InfoRow).
 */
export const InfoSection: React.FC<InfoSectionProps> = ({
    title,
    children,
    className,
    ...props
}) => {
    return (
        <div className={clsx("space-y-6", className)} {...props}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">
                {title}
            </h3>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
};
