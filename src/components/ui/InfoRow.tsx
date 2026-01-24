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
}

/**
 * InfoRow
 * Affiche une ligne d'information standardisée avec icône.
 */
export const InfoRow: React.FC<InfoRowProps> = ({
    icon: Icon,
    label,
    value,
    iconColor = "text-primary",
    className,
    iconBgClassName = "bg-white/5"
}) => {
    return (
        <div className={clsx("flex items-center gap-4", className)}>
            {Icon && (
                <div className={clsx("p-3 rounded-xl shrink-0", iconBgClassName, iconColor)}>
                    <Icon size={24} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                {label && <p className="text-xs text-grey-medium mb-0.5">{label}</p>}
                <div className="text-text-main font-bold text-lg truncate flex items-center gap-2">
                    {value}
                </div>
            </div>
        </div>
    );
};
