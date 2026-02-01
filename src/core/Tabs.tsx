import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export interface Tab {
    id: string;
    label: string;
    icon?: React.ElementType;
    badge?: number | string;
    disabled?: boolean;
    variant?: 'primary' | 'danger' | 'success' | 'warning' | 'default';
}

export interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    /** 'capsule' is the neu-selector style, 'underline' is the flat style with bottom border */
    variant?: 'capsule' | 'underline';
    className?: string;
    fullWidth?: boolean;
    /** If true, automatically collapses labels on small containers (requires icons) */
    smart?: boolean;
    /** container style: 1 = engraved, 2 = flat/underline, 3 = outline */
    level?: 1 | 2 | 3;
    /** Disable compact mode even if smart is true */
    disableCompact?: boolean;
}

/**
 * Tabs component for navigation between different views.
 * Unified version supporting both simple and responsive (smart) behaviors.
 */
const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTab,
    onChange,
    variant = 'capsule',
    className,
    fullWidth = false,
    smart = false,
    level = 1,
    disableCompact = false
}) => {
    const [isCompact, setIsCompact] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [threshold, setThreshold] = useState<number | null>(null);

    // Responsive Logic for Smart Mode
    useEffect(() => {
        if (smart && measureRef.current && threshold === null) {
            const requiredWidth = measureRef.current.scrollWidth + 20;
            setThreshold(requiredWidth);
        }
    }, [tabs, threshold, smart]);

    useEffect(() => {
        if (!smart || !containerRef.current || threshold === null) return;

        if (disableCompact) {
            setIsCompact(false);
            return;
        }

        const parentElement = containerRef.current.parentElement;
        if (!parentElement) return;

        const checkSize = () => {
            if (parentElement && threshold !== null) {
                const availableWidth = parentElement.offsetWidth;
                setIsCompact(availableWidth <= threshold);
            }
        };

        checkSize();
        const observer = new ResizeObserver(checkSize);
        observer.observe(parentElement);
        return () => observer.disconnect();
    }, [threshold, smart, disableCompact]);

    // Handle the Underline variant separately (legacy or specific use case)
    if (variant === 'underline' && !smart) {
        return (
            <div className={clsx('flex border-b border-white/10', fullWidth && 'w-full', className)}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && onChange(tab.id)}
                            disabled={tab.disabled}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-all relative',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                isActive
                                    ? 'text-primary'
                                    : 'text-grey-medium hover:text-text-main'
                            )}
                        >
                            {Icon && <Icon size={18} className="shrink-0" />}
                            <span>{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className={clsx(
                                    'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                                    isActive
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-white/10 text-grey-light'
                                )}>
                                    {tab.badge}
                                </span>
                            )}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Main Smart/Capsule View
    return (
        <div
            ref={containerRef}
            className={clsx(
                "relative flex items-center justify-center",
                fullWidth && "w-full",
                className
            )}
        >
            {/* Hidden measurement container */}
            {smart && threshold === null && (
                <div ref={measureRef} className="smart-tabs-measure" aria-hidden="true">
                    <div className={level === 1 ? "smart-tabs-container" : level === 2 ? "smart-tabs-container-level2" : "smart-tabs-container-level3"}>
                        {tabs.map((tab) => (
                            <div key={`m-${tab.id}`} className="flex items-center gap-2 px-4 py-2.5 font-black uppercase tracking-[0.12em] text-sm whitespace-nowrap">
                                {tab.icon && <tab.icon size={16} />}
                                <span>{tab.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                (level === 1 || level === 2) && [
                                    "font-black uppercase tracking-[0.12em]",
                                    isActive ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                                ],
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
                            {!isCompact && tab.badge !== undefined && (
                                <span className={clsx(
                                    'px-1.5 py-0.5 rounded text-[9px] font-black min-w-[18px] text-center',
                                    isActive ? 'bg-text-dark/20 text-text-dark' : 'bg-primary/20 text-primary'
                                )}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Tabs;
