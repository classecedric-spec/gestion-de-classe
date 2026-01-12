import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Card Component - Composant de carte réutilisable
 */
const Card = ({
    children,
    className,
    onClick,
    hover = !!onClick,
    variant = 'default'
}) => {
    const variants = {
        default: 'bg-surface border border-border/10',
        glass: 'bg-white/5 backdrop-blur-sm border border-white/10',
        dark: 'bg-input border border-white/5',
        gradient: 'bg-gradient-to-br from-surface to-input border border-primary/10'
    };

    const hoverStyles = hover
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

Card.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    onClick: PropTypes.func,
    hover: PropTypes.bool,
    variant: PropTypes.oneOf(['default', 'glass', 'dark', 'gradient'])
};

/**
 * CardHeader - En-tête de carte
 */
Card.Header = ({ children, className }) => (
    <div className={clsx('p-6 border-b border-border/10', className)}>
        {children}
    </div>
);

Card.Header.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

/**
 * CardBody - Corps de carte
 */
Card.Body = ({ children, className }) => (
    <div className={clsx('p-6', className)}>
        {children}
    </div>
);

Card.Body.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

/**
 * CardFooter - Pied de carte
 */
Card.Footer = ({ children, className }) => (
    <div className={clsx('p-6 border-t border-border/10', className)}>
        {children}
    </div>
);

Card.Footer.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

export default Card;
