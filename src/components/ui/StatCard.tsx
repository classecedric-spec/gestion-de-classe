import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

export type StatCardVariant = 'default' | 'success' | 'danger' | 'warning' | 'purple' | 'primary';

export interface StatCardProps {
    /** Icon from lucide-react */
    icon: LucideIcon;
    /** Variant for color theming */
    variant?: StatCardVariant;
    /** Title/label of the stat */
    title: string;
    /** The main stat value to display */
    value: string | number | React.ReactNode;
    /** Optional subtitle/description */
    subtitle?: string;
    /** Loading state */
    loading?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Optional Link href (uses react-router Link) */
    href?: string;
    /** Optional state to pass with Link */
    linkState?: any;
    /** Additional CSS classes */
    className?: string;
}

/**
 * StatCard component for displaying dashboard statistics
 * 
 * @example
 * ```tsx
 * <StatCard
 *     icon={AlertCircle}
 *     variant="warning"
 *     title="En attente"
 *     value={12}
 *     subtitle="demandes d'aide"
 *     onClick={() => navigate('/suivi')}
 * />
 * ```
 * 
 * @example With Link
 * ```tsx
 * <StatCard
 *     icon={Check}
 *     variant="success"
 *     title="Aujourd'hui"
 *     value={45}
 *     subtitle="validations"
 *     href="/encodage"
 * />
 * ```
 */
const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    variant = 'default',
    title,
    value,
    subtitle,
    loading = false,
    onClick,
    href,
    linkState,
    className
}) => {
    // Variant color mapping
    const variantClasses = {
        default: 'border-border group-hover:border-primary/30',
        success: 'border-border group-hover:border-success/30',
        danger: 'border-border group-hover:border-danger/30',
        warning: 'border-border group-hover:border-warning/30',
        purple: 'border-border group-hover:border-purple-500/30',
        primary: 'border-border group-hover:border-primary/30'
    };

    const iconColorClasses = {
        default: 'text-grey-medium group-hover:text-primary',
        success: 'text-success',
        danger: 'text-danger',
        warning: 'text-warning',
        purple: 'text-purple-500',
        primary: 'text-grey-medium group-hover:text-primary'
    };

    const subtitleColorClasses = {
        default: 'text-grey-medium group-hover:text-primary',
        success: 'text-grey-medium group-hover:text-success',
        danger: 'text-grey-medium group-hover:text-danger',
        warning: 'text-grey-medium group-hover:text-warning',
        purple: 'text-grey-medium group-hover:text-purple-500',
        primary: 'text-grey-medium group-hover:text-primary'
    };

    const cardClasses = clsx(
        'bg-surface/50 border rounded-xl p-4 hover:bg-surface transition-all group cursor-pointer',
        variantClasses[variant],
        className
    );

    const content = (
        <>
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={clsx('transition-colors', iconColorClasses[variant])} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">
                    {title}
                </span>
            </div>
            <div className="text-2xl font-black text-white">
                {loading ? <Loader2 size={20} className="animate-spin" /> : value}
            </div>
            {subtitle && (
                <p className={clsx('text-[10px] mt-1 transition-colors', subtitleColorClasses[variant])}>
                    {subtitle}
                </p>
            )}
        </>
    );

    // If href is provided, render as Link
    if (href) {
        return (
            <Link to={href} state={linkState} className={cardClasses}>
                {content}
            </Link>
        );
    }

    // Otherwise, render as clickable div
    return (
        <div onClick={onClick} className={cardClasses}>
            {content}
        </div>
    );
};

export default StatCard;
