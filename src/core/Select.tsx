import React from 'react';
import clsx from 'clsx';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    options: SelectOption[];
    label?: string;
    error?: string;
    icon?: React.ElementType;
    variant?: 'default' | 'neu' | 'inset';
    fullWidth?: boolean;
    iconClassName?: string;
}


/**
 * Select component with consistent styling
 * Supports neu-selector-container style and standard variants
 * 
 * @example
 * // Basic usage
 * <Select 
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' }
 *   ]}
 *   value={selectedValue}
 *   onChange={(e) => setSelectedValue(e.target.value)}
 * />
 * 
 * @example
 * // With label and icon
 * <Select 
 *   label="Choose a group"
 *   icon={Users}
 *   options={groupOptions}
 * />
 * 
 * @example
 * // Neu variant (capsule style)
 * <Select 
 *   variant="neu"
 *   options={options}
 *   icon={Filter}
 * />
 */
const Select: React.FC<SelectProps> = ({
    options,
    label,
    error,
    icon: Icon,
    variant = 'default',
    fullWidth = false,
    className,
    iconClassName,
    ...props
}) => {
    const selectId = React.useId();

    if (variant === 'neu') {
        return (
            <div className={clsx('relative group neu-selector-container rounded-xl overflow-hidden', !fullWidth && 'min-w-[120px]', className)}>
                <select
                    id={selectId}
                    className="w-full bg-transparent border-none py-2 pl-3 pr-6 text-[10px] font-bold text-white uppercase tracking-wider focus:ring-0 outline-none appearance-none cursor-pointer truncate"
                    {...props}
                >
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                            className="bg-background text-text-main normal-case"
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                {Icon && (
                    <div className={clsx("absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-primary transition-colors", iconClassName || "text-grey-medium")}>
                        <Icon size={12} />
                    </div>
                )}
            </div>
        );
    }

    if (variant === 'inset') {
        return (
            <div className={clsx('relative group', fullWidth ? 'w-full' : 'min-w-[140px]', className)}>
                {Icon && (
                    <div className={clsx("absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-primary transition-colors z-10", iconClassName || "text-grey-medium")}>
                        <Icon size={16} />
                    </div>
                )}
                <select
                    id={selectId}
                    className={clsx(
                        'w-full input-inset rounded-xl py-2.5 pr-8 text-sm text-text-main',
                        'focus:outline-none appearance-none cursor-pointer',
                        Icon && 'pl-9',
                        !Icon && 'pl-3'
                    )}
                    {...props}
                >
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                            className="bg-background text-text-main"
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div className={clsx('space-y-2', fullWidth && 'w-full', className)}>
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-sm font-medium text-text-main"
                >
                    {label}
                </label>
            )}

            <div className="relative group">
                {Icon && (
                    <div className={clsx("absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-primary transition-colors z-10", iconClassName || "text-grey-medium")}>
                        <Icon size={18} />
                    </div>
                )}

                <select
                    id={selectId}
                    className={clsx(
                        'w-full bg-input border border-border rounded-xl py-3 pr-10 text-sm text-text-main',
                        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                        'transition-all appearance-none cursor-pointer',
                        Icon && 'pl-10',
                        !Icon && 'pl-4',
                        error && 'bg-danger/50 border-danger focus:ring-danger/50 focus:border-danger'
                    )}
                    {...props}
                >
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                            className="bg-input text-text-main"
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Custom dropdown arrow */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {error && (
                <p className="text-xs text-danger mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 8a.75.75 0 110-1.5.75.75 0 010 1.5zm0-2.5a.5.5 0 01-.5-.5V4a.5.5 0 011 0v2a.5.5 0 01-.5.5z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
};

export default Select;
