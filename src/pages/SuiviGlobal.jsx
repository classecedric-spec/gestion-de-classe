import React, { useState } from 'react';
import { Users, Table, GraduationCap } from 'lucide-react';
import clsx from 'clsx';
import SuiviPedagogique from './SuiviPedagogique';
import AvancementAteliers from './AvancementAteliers';

const SuiviGlobal = () => {
    const [activeView, setActiveView] = useState('suivi'); // 'suivi' or 'avancement'

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* View Toggle Header */}
            <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 text-grey-medium mr-4">
                    <GraduationCap size={20} className="text-primary" />
                    <span className="text-sm font-bold uppercase tracking-wider">Suivi Global</span>
                </div>

                {/* Toggle Buttons */}
                <div className="flex bg-background/50 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveView('suivi')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                            activeView === 'suivi'
                                ? "bg-primary text-text-dark shadow-lg"
                                : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Users size={16} />
                        Suivi Pédago.
                    </button>
                    <button
                        onClick={() => setActiveView('avancement')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                            activeView === 'avancement'
                                ? "bg-primary text-text-dark shadow-lg"
                                : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Table size={16} />
                        Avancement
                    </button>
                </div>
            </div>

            {/* Active View Content */}
            <div className="flex-1 overflow-hidden">
                {activeView === 'suivi' ? (
                    <SuiviPedagogique />
                ) : (
                    <AvancementAteliers />
                )}
            </div>
        </div>
    );
};

export default SuiviGlobal;
