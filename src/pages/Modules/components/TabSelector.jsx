import React from 'react';
import PropTypes from 'prop-types';
import { Puzzle, Users, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

/**
 * TabSelector
 * Modern capsule-style tab switcher
 */
const TabSelector = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'activities', label: 'Activités', icon: Puzzle },
        { id: 'groups', label: 'Groupes', icon: Users },
        { id: 'progression', label: 'Suivi', icon: TrendingUp }
    ];

    return (
        <div className="flex justify-center mb-10">
            <div className="neu-selector-container p-1.5 rounded-2xl w-full">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        data-active={activeTab === tab.id}
                        className={clsx(
                            "flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.15em] transition-all duration-300",
                            activeTab === tab.id
                                ? "bg-primary text-text-dark"
                                : "text-grey-medium hover:text-white"
                        )}
                    >
                        <tab.icon size={16} />
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

TabSelector.propTypes = {
    activeTab: PropTypes.oneOf(['activities', 'groups', 'progression']).isRequired,
    onTabChange: PropTypes.func.isRequired
};

export default TabSelector;
