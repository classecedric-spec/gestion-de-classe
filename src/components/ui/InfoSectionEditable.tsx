import React from 'react';
import { InfoSection, InfoSectionProps } from './InfoSection';
import clsx from 'clsx';

/**
 * InfoSectionEditable
 * Propose une mise en page en grille dense (jusqu'à 4 colonnes).
 * Optimisé pour remplir l'espace horizontal et limiter le scroll vertical.
 */
export const InfoSectionEditable: React.FC<InfoSectionProps> = ({ children, className, ...props }) => {
    return (
        <InfoSection className={className} {...props}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
                {children}
            </div>
        </InfoSection>
    );
};
