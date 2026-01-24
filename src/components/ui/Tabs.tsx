import React from 'react';
import clsx from 'clsx';

export interface Tab {
    id: string;
    label: string;
    icon?: React.ElementType;
    badge?: number | string;
    disabled?: boolean;
    variant?: 'primary' | 'danger' | 'success' | 'warning';
}

export interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    variant?: 'capsule' | 'underline';
    className?: string;
    fullWidth?: boolean;
}

/**
 * Tabs component for navigation between different views
 * Supports capsule (neu-selector-container) and underline variants
 * 
 * @example
 * // Basic capsule tabs
 * <Tabs
 *   tabs={[
 *     { id: 'tab1', label: 'Informations' },
 *     { id: 'tab2', label: 'Suivi' },
 *     { id: 'tab3', label: 'To-Do' }
 *   ]}
 *   activeTab={currentTab}
 *   onChange={setCurrentTab}
 * />
 * 
 * @example
 * // With icons and badges
 * <Tabs
 *   tabs={[
 *     { id: 'infos', label: 'Infos', icon: User },
 *     { id: 'tasks', label: 'Tasks', icon: CheckCircle, badge: 5 },
 *     { id: 'urgent', label: 'Urgent', icon: AlertCircle, badge: '!' }
 *   ]}
 *   activeTab={activeTab}
 *   onChange={setActiveTab}
 * />
 * 
 * @example
 * // Underline variant
 * <Tabs
 *   variant="underline"
 *   tabs={tabs}
 *   activeTab={active}
 *   onChange={setActive}
 * />
 */
const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTab,
    onChange,
    variant = 'capsule',
    className,
    fullWidth = false
}) => {

    if (variant === 'capsule') {
        return (
            <div className={clsx('neu-selector-container p-1 rounded-2xl', fullWidth && 'w-full', className)}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && onChange(tab.id)}
                            disabled={tab.disabled}
                            data-active={isActive}
                            className={clsx(
                                'flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.12em] transition-all duration-300',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                isActive
                                    ? 'bg-primary text-text-dark'
                                    : 'text-grey-medium hover:text-white hover:bg-white/5'
                            )}
                        >
                            {Icon && <Icon size={16} className="shrink-0" />}
                            <span className="tab-label">{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className={clsx(
                                    'px-1.5 py-0.5 rounded text-[9px] font-black min-w-[18px] text-center',
                                    isActive
                                        ? 'bg-text-dark/20 text-text-dark'
                                        : 'bg-primary/20 text-primary'
                                )}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Underline variant
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

                        {/* Active indicator */}
                        {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default Tabs;
