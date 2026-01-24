import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Tab } from './Tabs';

interface SmartTabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
    fullWidth?: boolean;
    level?: 1 | 2 | 3; // 1 = engraved, 2 = flat, 3 = outline
}


/**
 * SmartTabs (Niveau 1)
 * Intelligent navigation that switches between full mode (icon + text) and compact mode (icon only).
 * Uses the neu-selector-container style with dynamic threshold calculation.
 */
const SmartTabs: React.FC<SmartTabsProps> = ({
    tabs,
    activeTab,
    onChange,
    className,
    fullWidth = false,
    level = 1
}) => {
    const [isCompact, setIsCompact] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [threshold, setThreshold] = useState<number | null>(null);

    // STEP 1: On mount, measure and set the fixed threshold
    useEffect(() => {
        if (measureRef.current && threshold === null) {
            // Add small margin to switch before text gets cut
            const requiredWidth = measureRef.current.scrollWidth + 9;
            setThreshold(requiredWidth);
        }
    }, [tabs, threshold]);

    // STEP 2: On resize, compare available width to threshold
    useEffect(() => {
        if (!containerRef.current || threshold === null) return;

        // Observe the PARENT element which actually resizes with the window
        const parentElement = containerRef.current.parentElement;
        if (!parentElement) return;

        const checkSize = () => {
            if (parentElement && threshold !== null) {
                const availableWidth = parentElement.offsetWidth;
                const shouldBeCompact = availableWidth <= threshold;
                setIsCompact(shouldBeCompact);
            }
        };

        // Initial check
        checkSize();

        // Watch for resize on parent
        const observer = new ResizeObserver(checkSize);
        observer.observe(parentElement);
        return () => observer.disconnect();
    }, [threshold]);

    return (
        <div
            ref={containerRef}
            className={clsx(
                "relative flex items-center justify-center",
                fullWidth && "w-full",
                className
            )}
        >
            {/* Hidden container for measuring full mode width */}
            <div
                ref={measureRef}
                className="smart-tabs-measure"
                aria-hidden="true"
            >
                <div className={
                    level === 1 ? "smart-tabs-container" :
                        level === 2 ? "smart-tabs-container-level2" :
                            "smart-tabs-container-level3"
                }>
                    {tabs.map((tab) => (
                        <div
                            key={`measure-${tab.id}`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase tracking-[0.12em] text-sm whitespace-nowrap"
                        >
                            {tab.icon && <tab.icon size={16} />}
                            <span>{tab.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visible Container */}
            <div className={clsx(
                "transition-all duration-300",
                level === 1 ? "smart-tabs-container" :
                    level === 2 ? "smart-tabs-container-level2" :
                        "flex items-center gap-1 p-1 rounded-full border border-white/10 bg-black/20"
            )}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && onChange(tab.id)}
                            disabled={tab.disabled}
                            title={isCompact ? tab.label : undefined}
                            data-active={isActive}
                            className={clsx(
                                "relative flex items-center justify-center gap-2 transition-all duration-300 rounded-full",
                                // Level 1 & 2 styles
                                (level === 1 || level === 2) && [
                                    "font-black uppercase tracking-[0.12em]",
                                    isActive ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                                ],
                                // Level 3 style (Nouvel effet capsule)
                                level === 3 && [
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all",
                                    isActive
                                        ? clsx(
                                            "shadow-lg shadow-black/20",
                                            tab.variant === 'danger' ? "bg-danger/10 border-danger text-danger" :
                                                tab.variant === 'warning' ? "bg-amber-accent/10 border-amber-accent text-amber-accent" :
                                                    tab.variant === 'success' ? "bg-success/10 border-success text-success" :
                                                        tab.variant === 'primary' ? "bg-primary/10 border-primary text-primary" :
                                                            "bg-white/5 border-white/40 text-white"
                                        )
                                        : "bg-transparent border-transparent text-grey-medium hover:text-grey-light"
                                ],
                                tab.disabled && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            {Icon && <Icon size={isCompact ? 18 : 14} />}
                            {!isCompact && <span className="tab-label">{tab.label}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SmartTabs;
