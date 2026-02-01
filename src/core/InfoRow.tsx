import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export interface InfoRowProps {
    /** Icône à afficher à gauche */
    icon?: LucideIcon;
    /** Petit label au-dessus de la valeur (optionnel) */
    label?: string;
    /** Valeur principale (Texte, Badge, ou autre composant) */
    value: React.ReactNode;
    /** Couleur de l'icône (classe Tailwind). Défaut: "text-primary" */
    iconColor?: string;
    /** Classes additionnelles pour le conteneur */
    className?: string;
    /** Classes pour le conteneur de l'icône (ex: "bg-surface" au lieu de bg-white/5) */
    iconBgClassName?: string;
    /** Si vrai, affiche un input au lieu de la valeur statique */
    editable?: boolean;
    /** Callback pour le changement de valeur (si editable) */
    onChange?: (value: string) => void;
    /** Valeur min (si editable type number) */
    min?: number;
    /** Valeur max (si editable type number) */
    max?: number;
    /** Suffixe à afficher (ex: '%') */
    suffix?: string;
    /** Type de l'input (si editable) */
    type?: 'text' | 'number';
    /** Placeholder (si editable) */
    placeholder?: string;
}

/**
 * InfoRow
 * Affiche une ligne d'information standardisée avec icône.
 * Supporte désormais un mode édition avec jauge de progression.
 */
export const InfoRow: React.FC<InfoRowProps> = ({
    icon: Icon,
    label,
    value,
    iconColor = "text-primary",
    className,
    iconBgClassName = "bg-white/5",
    editable = false,
    onChange,
    min = 0,
    max = 100,
    suffix,
    type = 'number',
    placeholder
}) => {
    const percentage = editable && type === 'number' ? Math.min(100, Math.max(0, Number(value) || 0)) : null;

    return (
        <div className={clsx(
            "group flex items-center gap-4 transition-all duration-300",
            editable && "p-3 rounded-2xl hover:bg-white/[0.03]",
            className
        )}>
            {Icon && (
                <div className={clsx(
                    "p-3 rounded-xl shrink-0 transition-colors",
                    iconBgClassName,
                    iconColor,
                    editable && "group-hover:bg-primary/10"
                )}>
                    <Icon size={24} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                {label && (
                    <p className={clsx(
                        "text-grey-medium mb-0.5 uppercase tracking-widest",
                        editable ? "text-[10px] font-black" : "text-xs"
                    )}>
                        {label}
                    </p>
                )}

                {editable ? (
                    <div className="relative inline-flex flex-col">
                        <div className="flex items-baseline gap-1">
                            <input
                                type={type}
                                min={min}
                                max={max}
                                value={String(value)}
                                onChange={(e) => onChange?.(e.target.value)}
                                placeholder={placeholder}
                                className={clsx(
                                    "bg-transparent font-black text-text-main focus:outline-none focus:text-primary transition-all p-0",
                                    type === 'number' ? "text-2xl w-16" : "text-lg w-full"
                                )}
                            />
                            {suffix && (
                                <span className="text-xs font-black text-primary opacity-30 group-hover:opacity-60 transition-opacity">
                                    {suffix}
                                </span>
                            )}
                        </div>

                        {percentage !== null && (
                            <div className="absolute -bottom-1 left-0 w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary/40 group-hover:bg-primary transition-all duration-700 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)] dynamic-width"
                                    style={{ "--dynamic-width": `${percentage}%` } as React.CSSProperties}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-text-main font-bold text-lg truncate flex items-center gap-2">
                        {value}
                    </div>
                )}
            </div>
        </div>
    );
};
