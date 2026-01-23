import React from 'react';
import clsx from 'clsx';

export interface EmptyStateProps {
    icon?: React.ElementType;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ElementType;
    };
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * EmptyState component for displaying empty or zero states
 * 
 * @example
 * // Basic usage
 * <EmptyState
 *   icon={Users}
 *   title="No students found"
 *   description="Try adjusting your search or filters"
 * />
 * 
 * @example
 * // With action button
 * <EmptyState
 *   icon={Plus}
 *   title="No classes yet"
 *   description="Create your first class to get started"
 *   action={{
 *     label: 'Create Class',
 *     onClick: () => setShowModal(true),
 *     icon: Plus
 *   }}
 * />
 * 
 * @example
 * // Different sizes
 * <EmptyState size="sm" icon={Search} title="No results" />
 * <EmptyState size="lg" icon={BookOpen} title="Welcome!" />
 */
const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    className,
    size = 'md'
}) => {

    const sizes = {
        sm: {
            container: 'py-8 px-4',
            icon: 'w-12 h-12',
            iconSize: 24,
            title: 'text-base',
            description: 'text-xs',
            button: 'py-2 px-4 text-xs'
        },
        md: {
            container: 'py-12 px-6',
            icon: 'w-16 h-16',
            iconSize: 32,
            title: 'text-xl',
            description: 'text-sm',
            button: 'py-3 px-6 text-sm'
        },
        lg: {
            container: 'py-20 px-8',
            icon: 'w-24 h-24',
            iconSize: 48,
            title: 'text-3xl',
            description: 'text-base',
            button: 'py-4 px-8 text-base'
        }
    };

    const ActionIcon = action?.icon;

    return (
        <div className={clsx(
            'flex flex-col items-center justify-center text-center',
            sizes[size].container,
            className
        )}>
            {Icon && (
                <div className={clsx(
                    'rounded-full bg-white/5 flex items-center justify-center mb-6 text-grey-dark',
                    sizes[size].icon
                )}>
                    <Icon size={sizes[size].iconSize} />
                </div>
            )}

            <h3 className={clsx(
                'font-bold text-grey-medium mb-2',
                sizes[size].title
            )}>
                {title}
            </h3>

            {description && (
                <p className={clsx(
                    'text-grey-dark max-w-md',
                    sizes[size].description
                )}>
                    {description}
                </p>
            )}

            {action && (
                <button
                    onClick={action.onClick}
                    className={clsx(
                        'mt-6 bg-primary hover:bg-primary/90 text-text-dark font-bold rounded-xl',
                        'transition-all active:scale-95 flex items-center gap-2',
                        sizes[size].button
                    )}
                >
                    {ActionIcon && <ActionIcon size={16} />}
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
