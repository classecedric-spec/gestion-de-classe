import React from 'react';
import { ArrowLeft, Users, ChevronDown, WifiOff, Loader2, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

const MobileHeader = ({
    groups,
    currentGroupId,
    onGroupChange,
    isOnline,
    helpRequestCount,
    isAutoGenerating,
    onAutoSuivi
}) => {
    const navigate = useNavigate();

    return (
        <div className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20">
            {/* Top Row: Back button + Group selector */}
            <div className="flex items-center gap-3 mb-3">
                <button
                    onClick={() => navigate('/mobile-dashboard')}
                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-grey-medium hover:text-primary hover:bg-white/10 transition-all shrink-0"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="relative flex-1">
                    <select
                        value={currentGroupId}
                        onChange={(e) => onGroupChange(e.target.value)}
                        className="w-full bg-background border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-8 appearance-none text-sm font-bold"
                    >
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.nom}</option>
                        ))}
                    </select>
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={16} />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={14} />
                </div>
            </div>

            {/* Bottom Row: Title + Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-black uppercase tracking-tighter text-primary leading-none">Suivi Mobile</h1>
                    {!isOnline && (
                        <div className="bg-danger/20 p-1.5 rounded-full animate-pulse" title="Mode Hors-ligne">
                            <WifiOff size={14} className="text-danger" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onAutoSuivi}
                        disabled={isAutoGenerating || !isOnline}
                        className={clsx(
                            "flex items-center gap-2 bg-primary text-black px-3 py-1.5 rounded-full border border-primary/20 shadow-lg shadow-primary/5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest",
                            (isAutoGenerating || !isOnline) && "opacity-50"
                        )}
                    >
                        {isAutoGenerating ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                        Suivi Auto
                    </button>
                    <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20 shadow-lg shadow-primary/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-xs font-black text-primary">{helpRequestCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileHeader;
