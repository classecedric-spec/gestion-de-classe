import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const Button = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'default',
    disabled = false,
    loading = false,
    className,
    icon: Icon
}) => {

    const variants = {
        primary: "bg-primary hover:bg-primary/90 text-text-dark shadow-lg shadow-primary/20",
        secondary: "bg-white/5 hover:bg-white/10 text-grey-light border border-border/10",
        danger: "bg-danger hover:bg-red-600 text-white shadow-lg shadow-danger/20",
        ghost: "hover:bg-white/5 text-grey-medium hover:text-text-main",
        success: "bg-success hover:bg-emerald-600 text-white shadow-lg shadow-success/20"
    };

    const sizes = {
        sm: "py-1.5 px-3 text-xs",
        default: "py-3 px-6 text-sm font-bold",
        lg: "py-4 px-8 text-base font-bold"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={clsx(
                "rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                variants[variant],
                sizes[size],
                className
            )}
        >
            {loading ? (
                <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 20} />
            ) : (
                <>
                    {Icon && <Icon size={size === 'sm' ? 14 : 20} />}
                    {children}
                </>
            )}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node,
    onClick: PropTypes.func,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost', 'success']),
    size: PropTypes.oneOf(['sm', 'default', 'lg']),
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    className: PropTypes.string,
    icon: PropTypes.elementType
};

export default Button;
