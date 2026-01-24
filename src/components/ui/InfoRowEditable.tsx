import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export interface InfoRowEditableProps {
    icon?: LucideIcon;
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    min?: number;
    max?: number;
    placeholder?: string;
    className?: string;
}

/**
 * InfoRowEditable (Design Stealth)
 * Parfaitement intégré au style InfoRow standard.
 * La valeur est une input sans bordure avec une jauge sous-jacente fine.
 */
export const InfoRowEditable: React.FC<InfoRowEditableProps> = ({
    icon: Icon,
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    placeholder,
    className
}) => {
    const percentage = Math.min(100, Math.max(0, Number(value) || 0));

    return (
        <div className={clsx(
            "group flex items-center gap-4 p-3 rounded-2xl transition-all duration-300",
            "hover:bg-white/[0.03]",
            className
        )}>
            {/* L'icône (Style identique à InfoRow) */}
            {Icon && (
                <div className="p-3 rounded-xl bg-white/5 text-primary shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Icon size={24} />
                </div>
            )}

            <div className="flex-1 min-w-0">
                {/* Le Label */}
                <p className="text-[10px] text-grey-medium mb-0.5 uppercase tracking-widest font-black">
                    {label}
                </p>

                {/* La Valeur + Jauge */}
                <div className="relative inline-flex flex-col">
                    <div className="flex items-baseline gap-1">
                        <input
                            type="number"
                            min={min}
                            max={max}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            className="bg-transparent text-2xl font-black text-text-main focus:outline-none focus:text-primary transition-all p-0 w-16"
                        />
                        <span className="text-xs font-black text-primary opacity-30 group-hover:opacity-60 transition-opacity">%</span>
                    </div>

                    {/* La Jauge (Underline style) */}
                    <div className="absolute -bottom-1 left-0 w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary/40 group-hover:bg-primary transition-all duration-700 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
