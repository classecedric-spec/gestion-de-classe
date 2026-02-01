import React from 'react';
import { Database, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { Card, Button } from '../../../core';

interface EnvironmentSectionProps {
    handleGenerateDemoData: () => Promise<void>;
    isGenerating: boolean;
    handleCheckAndFixProgressions: () => Promise<void>;
}

export const EnvironmentSection: React.FC<EnvironmentSectionProps> = ({
    handleGenerateDemoData,
    isGenerating,
    handleCheckAndFixProgressions
}) => {
    return (
        <Card variant="glass" className="p-6">
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <Database size={20} className="text-primary" /> Environnement
            </h2>
            <div className="space-y-4">
                <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Générer des données de test</h3>
                        <p className="text-xs text-grey-medium">Créez une classe fictive avec des élèves et des activités.</p>
                    </div>
                    <Button
                        onClick={handleGenerateDemoData}
                        loading={isGenerating}
                        icon={Sparkles}
                    >
                        Générer
                    </Button>
                </div>

                <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Maintenance des Données</h3>
                        <p className="text-xs text-grey-medium">Corrige les états de progression invalides.</p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleCheckAndFixProgressions}
                        icon={SettingsIcon}
                    >
                        Réparer
                    </Button>
                </div>
            </div>
        </Card>
    );
};
