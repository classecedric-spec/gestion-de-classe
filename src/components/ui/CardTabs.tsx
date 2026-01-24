import React from 'react';
import clsx from 'clsx';
import SmartTabs from './SmartTabs';
import { Tab } from './Tabs';

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
    ...props
}) => {
    return (
        <div
            className={clsx("card-flat flex-1 flex flex-col overflow-hidden", className)}
            {...props}
        >
            {/* Zone Onglets (Fixe) */}
            <div className="px-6 py-0 border-b border-white/5 flex justify-start z-10">
                <SmartTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={onChange}
                    level={level}
                />
            </div>

            {/* Zone Contenu (Scrollable) */}
            <div className={clsx(
                "flex-1 overflow-y-auto custom-scrollbar",
                contentClassName || "p-8 bg-background/20"
            )}>
                {children}
            </div>
        </div>
    );
};
