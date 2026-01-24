import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface ActionItemProps {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    subtitle?: string;
    progress?: number;
}

/**
 * ActionItem - A premium action item following the visual style requested by the user.
 * Displays an icon in a rounded square followed by a label.
 */
const ActionItem: React.FC<ActionItemProps> = ({
    icon: Icon,
    label,
    onClick,
    loading = false,
    disabled = false,
    className,
    subtitle,
    progress
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={clsx(
                "w-full flex items-center gap-4 p-3 rounded-2xl transition-all border text-left group relative overflow-hidden",
                "bg-white/5 border-white/5 hover:border-primary/30 hover:bg-white/10 active:scale-[0.98]",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/10">
                {loading ? (
                    <Loader2 size={24} className="text-primary animate-spin" />
                ) : (
                    <Icon size={24} className="text-secondary group-hover:text-primary transition-all duration-300" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-text-main text-base group-hover:text-primary transition-colors truncate">
                    {label}
                </p>
                {subtitle && (
                    <p className="text-xs text-grey-medium truncate mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>

            {loading && progress !== undefined && (
                <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </button>
    );
};

export default ActionItem;
