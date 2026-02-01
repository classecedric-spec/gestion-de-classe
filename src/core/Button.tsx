import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'raised';
    size?: 'sm' | 'default' | 'lg';
    loading?: boolean;
    icon?: React.ElementType;
    iconRight?: React.ElementType;
    as?: any;
    to?: string;
}

/**
 * @component Button
 * @description Bouton personnalisable avec support pour les variantes (primary, secondary, etc.), les tailles, les icônes et les états de chargement.
 * @param {ButtonProps} props - Propriétés du bouton incluant variant, size, loading, icon, et as (pour polymorphisme).
 * @example
 * <Button variant="primary" loading={isLoading}>Valider</Button>
 */
const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'default',
    disabled = false,
    loading = false,
    className,
    icon: Icon,
    iconRight: IconRight,
    as: Component = 'button',
    to,
    ...props
}) => {

    const variants = {
        primary: "bg-primary hover:bg-primary/90 text-text-dark shadow-lg shadow-primary/20",
        secondary: "bg-white/5 hover:bg-white/10 text-grey-light border border-border/10",
        danger: "bg-danger hover:bg-red-600 text-white shadow-lg shadow-danger/20",
        ghost: "hover:bg-white/5 text-grey-medium hover:text-text-main",
        success: "bg-success hover:bg-emerald-600 text-white shadow-lg shadow-success/20",
        raised: "btn-raised font-bold"
    };

    const sizes = {
        sm: "py-1.5 px-3 text-xs",
        default: "py-3 px-6 text-sm font-bold",
        lg: "py-4 px-8 text-base font-bold"
    };

    const buttonClasses = clsx(
        "rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size as keyof typeof sizes],
        className
    );

    const content = loading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 20} />
    ) : (
        <>
            {Icon && <Icon size={size === 'sm' ? 14 : 20} />}
            {children}
            {IconRight && <IconRight size={size === 'sm' ? 14 : 20} />}
        </>
    );

    if (to) {
        return (
            <Component
                to={to}
                className={buttonClasses}
                {...(disabled || loading ? { onClick: (e: any) => e.preventDefault() } : {})}
                {...props}
            >
                {content}
            </Component>
        );
    }

    return (
        <Component
            type={Component === 'button' ? type : undefined}
            onClick={onClick}
            disabled={disabled || loading}
            className={buttonClasses}
            {...props}
        >
            {content}
        </Component>
    );
};

export default Button;
