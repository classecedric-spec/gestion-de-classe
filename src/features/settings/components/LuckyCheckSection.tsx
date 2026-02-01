import React from 'react';
import { ShieldCheck, ChevronDown, Save } from 'lucide-react';
import { Card, Button } from '../../../core';

interface LuckyCheckSectionProps {
    defaultLuckyCheckIndex: number;
    setDefaultLuckyCheckIndex: (value: number) => void;
    isSavingDefaultIndex: boolean;
    handleSaveDefaultLuckyCheckIndex: (value: number) => Promise<void>;
}

export const LuckyCheckSection: React.FC<LuckyCheckSectionProps> = ({
    defaultLuckyCheckIndex,
    setDefaultLuckyCheckIndex,
    isSavingDefaultIndex,
    handleSaveDefaultLuckyCheckIndex
}) => {
    return (
        <Card variant="glass" className="p-6">
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <ShieldCheck size={20} className="text-primary" /> Configuration Lucky Check
            </h2>
            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Indice de vérification par défaut</h3>
                    <p className="text-xs text-grey-medium max-w-md">
                        Définit la probabilité de vérification aléatoire si aucun indice spécifique n'est défini pour l'élève ou la branche.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-48">
                        <select
                            title="Indice de vérification par défaut"
                            value={defaultLuckyCheckIndex}
                            onChange={(e) => setDefaultLuckyCheckIndex(parseInt(e.target.value))}
                            className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer pr-10 text-sm font-bold"
                        >
                            <option value={100}>100% (Toujours)</option>
                            <option value={75}>75% (3/4)</option>
                            <option value={50}>50% (1/2)</option>
                            <option value={25}>25% (1/4)</option>
                            <option value={10}>10% (Régulier)</option>
                            <option value={0}>0% (Désactivé)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                    <Button
                        onClick={() => handleSaveDefaultLuckyCheckIndex(defaultLuckyCheckIndex)}
                        loading={isSavingDefaultIndex}
                        icon={Save}
                    >
                        {isSavingDefaultIndex ? '...' : 'Fixer'}
                    </Button>
                </div>
            </div>
        </Card>
    );
};
