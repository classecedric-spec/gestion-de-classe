import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Input Component - Champ de saisie réutilisable avec styles cohérents
 * @param {Object} props
 * @param {string} props.type - Type d'input (text, email, password, etc.)
 * @param {string} props.value - Valeur de l'input
 * @param {function} props.onChange - Fonction de changement
 * @param {string} props.placeholder - Placeholder
 * @param {string} props.label - Label optionnel
 * @param {string} props.error - Message d'erreur
 * @param {boolean} props.required - Champ requis
 * @param {string} props.className - Classes additionnelles
 * @param {React.ReactNode} props.icon - Icône (composant Lucide)
 */
const Input = forwardRef(({
    type = 'text',
    value,
    onChange,
    placeholder,
    label,
    error,
    required = false,
    className,
    icon: Icon,
    ...rest
}, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-grey-light mb-2">
                    {label}
                    {required && <span className="text-danger ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium">
                        <Icon size={18} />
                    </div>
                )}

                <input
                    ref={ref}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    className={clsx(
                        'w-full px-4 py-3 rounded-xl',
                        'bg-input text-text-main placeholder:text-grey-medium',
                        'border border-border/10',
                        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        error && 'border-danger focus:ring-danger/40 focus:border-danger',
                        Icon && 'pl-10',
                        className
                    )}
                    {...rest}
                />
            </div>

            {error && (
                <p className="mt-2 text-sm text-danger flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-danger rounded-full"></span>
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

Input.propTypes = {
    type: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    label: PropTypes.string,
    error: PropTypes.string,
    required: PropTypes.bool,
    className: PropTypes.string,
    icon: PropTypes.elementType
};

/**
 * Textarea Component - Zone de texte réutilisable
 */
export const Textarea = forwardRef(({
    value,
    onChange,
    placeholder,
    label,
    error,
    required = false,
    rows = 4,
    className,
    ...rest
}, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-grey-light mb-2">
                    {label}
                    {required && <span className="text-danger ml-1">*</span>}
                </label>
            )}

            <textarea
                ref={ref}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                rows={rows}
                className={clsx(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-input text-text-main placeholder:text-grey-medium',
                    'border border-border/10',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
                    'transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'resize-vertical',
                    error && 'border-danger focus:ring-danger/40 focus:border-danger',
                    className
                )}
                {...rest}
            />

            {error && (
                <p className="mt-2 text-sm text-danger flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-danger rounded-full"></span>
                    {error}
                </p>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';

Textarea.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    label: PropTypes.string,
    error: PropTypes.string,
    required: PropTypes.bool,
    rows: PropTypes.number,
    className: PropTypes.string
};

export default Input;
