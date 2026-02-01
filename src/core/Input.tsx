import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ElementType } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: ElementType;
}

/**
 * @component Input
 * @description Champ de saisie réutilisable avec support pour labels, icônes et messages d'erreur.
 * @param {InputProps} props - Propriétés de l'input incluant label, error, icon, et les attributs HTML standards.
 * @example
 * <Input label="Email" placeholder="votre@email.fr" icon={Mail} required />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(({
    type = 'text',
    value,
    onChange,
    placeholder,
    label,
    error,
    required = false,
    className,
    icon: Icon,
    id,
    ...rest
}, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-grey-light mb-2"
                >
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
                    id={inputId}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    aria-invalid={error ? true : undefined}
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

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

/**
 * @component Textarea
 * @description Zone de texte réutilisable pour de longs messages ou descriptions.
 * @param {TextareaProps} props - Propriétés du textarea incluant label, error, et les attributs HTML standards.
 * @example
 * <Textarea label="Commentaire" rows={4} placeholder="Laissez un message..." />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
    value,
    onChange,
    placeholder,
    label,
    error,
    required = false,
    rows = 4,
    className,
    id,
    ...rest
}, ref) => {
    const textareaId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={textareaId}
                    className="block text-sm font-medium text-grey-light mb-2"
                >
                    {label}
                    {required && <span className="text-danger ml-1">*</span>}
                </label>
            )}

            <textarea
                ref={ref}
                id={textareaId}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                rows={rows}
                aria-invalid={error ? true : undefined}
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

export default Input;
