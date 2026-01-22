import React, { ReactNode } from 'react';
import clsx from 'clsx';

export type CardVariant = 'default' | 'glass' | 'dark' | 'gradient';

export interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    hover?: boolean;
    variant?: CardVariant;
}

interface CardSubComponentProps {
    children: ReactNode;
    className?: string;
}

/**
 * Card Component - Composant de carte réutilisable
 */
const Card: React.FC<CardProps> & {
    Header: React.FC<CardSubComponentProps>;
    Body: React.FC<CardSubComponentProps>;
    Footer: React.FC<CardSubComponentProps>;
} = ({
    children,
    className,
    onClick,
    hover,
    variant = 'default'
}) => {
        const variants: Record<CardVariant, string> = {
            default: 'bg-surface border border-border/10',
            glass: 'bg-white/5 backdrop-blur-sm border border-white/10',
            dark: 'bg-input border border-white/5',
            gradient: 'bg-gradient-to-br from-surface to-input border border-primary/10'
        };

        const isHoverable = hover ?? !!onClick;

        const hoverStyles = isHoverable
            ? 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer active:scale-[0.99]'
            : '';

        return (
            <div
                onClick={onClick}
                className={clsx(
                    'rounded-2xl shadow-md overflow-hidden',
                    variants[variant],
                    hoverStyles,
                    className
                )}
            >
                {children}
            </div>
        );
    };

/**
 * CardHeader - En-tête de carte
 */
Card.Header = ({ children, className }) => (
    <div className={clsx('p-6 border-b border-border/10', className)}>
        {children}
    </div>
);

/**
 * CardBody - Corps de carte
 */
Card.Body = ({ children, className }) => (
    <div className={clsx('p-6', className)}>
        {children}
    </div>
);

/**
 * CardFooter - Pied de carte
 */
Card.Footer = ({ children, className }) => (
    <div className={clsx('p-6 border-t border-border/10', className)}>
        {children}
    </div>
);

export default Card;
