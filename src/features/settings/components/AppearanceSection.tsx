import React from 'react';
import { Palette, Sun, Moon, Sparkles, Monitor } from 'lucide-react';
import clsx from 'clsx';
// @ts-ignore
import { useTheme } from '../../../components/ThemeProvider';
import { Card } from '../../../core';

type Theme = 'default' | 'light' | 'dark' | 'neumo-2' | 'glass' | 'system';

export const AppearanceSection: React.FC = () => {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: 'default', label: 'Défaut', icon: Palette },
        { id: 'light', label: 'Clair', icon: Sun },
        { id: 'dark', label: 'Sombre', icon: Moon },
        { id: 'neumo-2', label: 'Neumorphisme', icon: Sparkles },
        { id: 'glass', label: 'Vision', icon: Sparkles },
        { id: 'system', label: 'Système', icon: Monitor },
    ];

    return (
        <Card variant="glass" className="p-6">
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <Palette size={20} className="text-primary" /> Apparence
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map((t) => {
                    const Icon = t.icon;
                    const isActive = theme === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id as Theme)}
                            className={clsx(
                                "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                                isActive
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-white/5 border-white/10 text-grey-medium hover:text-white"
                            )}
                        >
                            <Icon size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};
