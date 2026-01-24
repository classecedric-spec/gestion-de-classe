import React from 'react';
import clsx from 'clsx';
import Button from './Button';
import { LucideIcon } from 'lucide-react';

export interface CardListProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Texte du bouton d'action en bas de carte.
     * Si non fourni, le pied de page ne s'affiche pas.
     */
    actionLabel?: string;
    /**
     * Fonction appelée au clic sur le bouton d'action.
     */
    onAction?: () => void;
    /**
     * Icône optionnelle pour le bouton d'action.
     */
    actionIcon?: LucideIcon;
}

/**
 * CardList
 * Carte spécialisée pour afficher une liste scrollable avec une action optionnelle en bas.
 * Prend tout l'espace vertical disponible (flex-1).
 */
export const CardList: React.FC<CardListProps> = ({
    children,
    actionLabel,
    onAction,
    actionIcon,
    className,
    ...props
}) => {
    return (
        <div
            className={clsx("card-flat flex-1 flex flex-col overflow-hidden", className)}
            {...props}
        >
            {/* Zone de contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-2 pt-2 pb-4 space-y-1 custom-scrollbar">
                {children}
            </div>

            {/* Pied de page action (conditionnel) */}
            {(actionLabel && onAction) && (
                <div className="p-4 border-t border-white/5">
                    <Button
                        onClick={onAction}
                        variant="raised"
                        className="w-full"
                        icon={actionIcon}
                    >
                        {actionLabel}
                    </Button>
                </div>
            )}
        </div>
    );
};
