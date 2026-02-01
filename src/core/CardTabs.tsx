import React from 'react';
import clsx from 'clsx';
import Tabs, { Tab } from './Tabs';
import Button from './Button';
import { LucideIcon } from 'lucide-react';

export interface CardTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /**
     * Liste des onglets à afficher.
     */
    tabs: Tab[];
    /**
     * ID de l'onglet actif.
     */
    activeTab: string;
    /**
     * Fonction appelée lors du changement d'onglet.
     */
    onChange: (tabId: string) => void;
    /**
     * Niveau de style des onglets (1=Engraved, 2=Flat, 3=Outline).
     * Par défaut: 2.
     */
    level?: 1 | 2 | 3;
    /**
     * Classes CSS pour la zone de contenu scrollable.
     * Par défaut: "p-8 bg-background/20"
     */
    contentClassName?: string;
    /**
     * Texte du bouton d'action en bas de carte.
     * Si non fourni, le pied de page ne s'affiche pas.
     */
    actionLabel?: string;
    /**
     * Fonction appelée au clic sur le bouton d'action.
     */
    onAction?: () => void;
    /**
     * Icône optionnelle pour le bouton d'action.
     */
    /**
     * Icône optionnelle pour le bouton d'action.
     */
    actionIcon?: LucideIcon;
    /**
     * Texte du bouton d'action secondaire (au dessus de l'action principale).
     */
    secondaryActionLabel?: string;
    /**
     * Fonction appelée au clic sur le bouton d'action secondaire.
     */
    onSecondaryAction?: () => void;
    /**
     * Icône optionnelle pour le bouton d'action secondaire.
     */
    secondaryActionIcon?: LucideIcon;
}

/**
 * CardTabs
 * Carte combinant un en-tête d'onglets (SmartTabs) et une zone de contenu scrollable.
 * Prend tout l'espace vertical disponible.
 */
export const CardTabs: React.FC<CardTabsProps> = ({
    tabs,
    activeTab,
    onChange,
    level = 2,
    children,
    className,
    contentClassName,
    actionLabel,
    onAction,
    actionIcon,
    secondaryActionLabel,
    onSecondaryAction,
    secondaryActionIcon,
    ...props
}) => {
    return (
        <div
            className={clsx("card-flat flex-1 flex flex-col overflow-hidden", className)}
            {...props}
        >
            {/* Zone Onglets (Fixe) */}
            <div className="px-6 py-0 border-b border-white/5 flex justify-start z-10">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={onChange}
                    level={level}
                    smart
                />
            </div>

            {/* Zone Contenu (Scrollable) */}
            <div className={clsx(
                "flex-1 overflow-y-auto custom-scrollbar",
                contentClassName || "p-8 bg-background/20"
            )}>
                {children}
            </div>

            {/* Pied de page action (conditionnel) */}
            {((actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction)) && (
                <div className="p-4 border-t border-white/5 bg-surface/30 space-y-3">
                    {secondaryActionLabel && onSecondaryAction && (
                        <Button
                            onClick={onSecondaryAction}
                            variant="secondary"
                            className="w-full border-dashed bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:border-yellow-500/40"
                            icon={secondaryActionIcon}
                        >
                            {secondaryActionLabel}
                        </Button>
                    )}
                    {actionLabel && onAction && (
                        <Button
                            onClick={onAction}
                            variant="secondary"
                            className="w-full border-dashed"
                            icon={actionIcon}
                        >
                            {actionLabel}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
