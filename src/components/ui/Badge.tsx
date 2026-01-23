import React from 'react';
import clsx from 'clsx';

export type BadgeVariant =
    | 'default'
    | 'primary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'purple';

export type BadgeSize = 'xs' | 'sm' | 'md';

export type BadgeStyle = 'solid' | 'outline' | 'ghost';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    style?: BadgeStyle;
    className?: string;
    icon?: React.ReactNode;
    dot?: boolean;
    removable?: boolean;
    onRemove?: () => void;
}

/**
 * Badge component for displaying labels, tags, and status indicators
 * 
 * @example
 * // Basic usage
 * <Badge variant="success">Active</Badge>
 * 
 * @example
 * // With icon
 * <Badge variant="primary" icon={<Star size={12} />}>Featured</Badge>
 * 
 * @example
 * // Removable badge
 * <Badge variant="default" removable onRemove={() => console.log('removed')}>Tag</Badge>
 * 
 * @example
 * // Different styles
 * <Badge variant="danger" style="outline">Error</Badge>
 * <Badge variant="success" style="ghost">Success</Badge>
 */
const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'sm',
    style = 'solid',
    className,
    icon,
    dot = false,
    removable = false,
    onRemove
}) => {

    // Variant colors
    const variantStyles: Record<BadgeVariant, { solid: string; outline: string; ghost: string }> = {
        default: {
            solid: 'bg-white/10 text-grey-light border-white/10',
            outline: 'bg-transparent text-grey-light border-white/20',
            ghost: 'bg-transparent text-grey-light'
        },
        primary: {
            solid: 'bg-primary/20 text-primary border-primary/20',
            outline: 'bg-transparent text-primary border-primary/50',
            ghost: 'bg-transparent text-primary'
        },
        success: {
            solid: 'bg-success/20 text-success border-success/20',
            outline: 'bg-transparent text-success border-success/50',
            ghost: 'bg-transparent text-success'
        },
        danger: {
            solid: 'bg-danger/20 text-danger border-danger/20',
            outline: 'bg-transparent text-danger border-danger/50',
            ghost: 'bg-transparent text-danger'
        },
        warning: {
            solid: 'bg-amber-accent/20 text-amber-accent border-amber-accent/20',
            outline: 'bg-transparent text-amber-accent border-amber-accent/50',
            ghost: 'bg-transparent text-amber-accent'
        },
        info: {
            solid: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
            outline: 'bg-transparent text-blue-400 border-blue-500/50',
            ghost: 'bg-transparent text-blue-400'
        },
        purple: {
            solid: 'bg-purple-accent/20 text-purple-accent border-purple-accent/20',
            outline: 'bg-transparent text-purple-accent border-purple-accent/50',
            ghost: 'bg-transparent text-purple-accent'
        }
    };

    // Size styles
    const sizeStyles: Record<BadgeSize, string> = {
        xs: 'text-[8px] px-1.5 py-0.5 gap-1',
        sm: 'text-[10px] px-2 py-1 gap-1.5',
        md: 'text-xs px-3 py-1.5 gap-2'
    };

    return (
        <span
            className={clsx(
                'inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-md border transition-colors',
                variantStyles[variant][style],
                sizeStyles[size],
                className
            )}
        >
            {dot && (
                <span
                    className={clsx(
                        'w-1.5 h-1.5 rounded-full',
                        variant === 'primary' && 'bg-primary',
                        variant === 'success' && 'bg-success',
                        variant === 'danger' && 'bg-danger',
                        variant === 'warning' && 'bg-amber-accent',
                        variant === 'info' && 'bg-blue-400',
                        variant === 'purple' && 'bg-purple-accent',
                        variant === 'default' && 'bg-grey-light'
                    )}
                />
            )}
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{children}</span>
            {removable && onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="shrink-0 hover:opacity-70 transition-opacity ml-1 -mr-1"
                    aria-label="Remove"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
            )}
        </span>
    );
};

export default Badge;
