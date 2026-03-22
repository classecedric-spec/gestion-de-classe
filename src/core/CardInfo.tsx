import React, { forwardRef } from 'react';
import clsx from 'clsx';

export interface CardInfoProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Hauteur forcée (pour la synchronisation)
     */
    height?: number;
    /**
     * Classes pour le conteneur interne (padding, gap, etc.)
     * Par défaut: "p-6"
     */
    contentClassName?: string;
}

/**
 * CardInfo
 * Carte d'en-tête standardisée avec support pour la synchronisation de hauteur.
 * La ref passée est attachée au CONTENU INTERNE (pour la mesure).
 */
export const CardInfo = forwardRef<HTMLDivElement, CardInfoProps>(({
    height,
    className,
    contentClassName,
    children,
    style,
    ...props
}, ref) => {
    return (
        <div
            className={clsx(
                "card-flat transition-all duration-300 ease-in-out overflow-hidden container-card", // Removed shrink-0
                className,
                // Ensure we are a flex container if flex-1 or flex-col is passed
                (className?.includes('flex-1') || className?.includes('flex-col')) && "flex flex-col"
            )}
            style={{
                height: height ? `${height}px` : 'auto',
                ...style
            }}
            {...props}
        >
            <div
                ref={ref}
                className={clsx(
                    "p-6", // Padding standard
                    contentClassName,
                    // If content is flex-1, ensure this container also fills the parent
                    contentClassName?.includes('flex-1') && "flex-1 min-h-0"
                )}
            >
                {children}
            </div>
        </div>
    );
});

CardInfo.displayName = "CardInfo";
