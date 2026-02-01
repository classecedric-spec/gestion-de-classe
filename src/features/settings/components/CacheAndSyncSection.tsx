import React from 'react';
import { Database, Activity, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Card, Button } from '../../../core';
import { formatBytes } from '../hooks/usePhotoOptimization';

interface CacheAndSyncSectionProps {
    cacheStats: { count: number; estimatedSize: number };
    cacheEnabled: boolean;
    handleToggleCache: (enabled: boolean) => Promise<void>;
    handleClearCache: () => Promise<void>;
    syncStats: any[];
    handleClearSyncData: () => Promise<void>;
}

export const CacheAndSyncSection: React.FC<CacheAndSyncSectionProps> = ({
    cacheStats,
    cacheEnabled,
    handleToggleCache,
    handleClearCache,
    syncStats,
    handleClearSyncData
}) => {
    return (
        <div className="space-y-8">
            {/* Cache Management */}
            <Card variant="glass" className="p-6">
                <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                    <Database size={20} className="text-primary" /> Gestion du Cache Local
                </h2>
                <div className="space-y-4">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Cache des photos</h3>
                            <p className="text-xs text-grey-medium">Stocke les photos localement pour réduire la bande passante.</p>
                            {cacheEnabled && (
                                <div className="mt-3 flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-grey-light">Photos en cache:</span>
                                        <span className="font-mono font-bold text-primary">{cacheStats.count}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-grey-light">Taille estimée:</span>
                                        <span className="font-mono font-bold text-primary">{formatBytes(cacheStats.estimatedSize)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                title={cacheEnabled ? "Désactiver le cache" : "Activer le cache"}
                                onClick={() => handleToggleCache(!cacheEnabled)}
                                className={clsx(
                                    "relative w-14 h-7 rounded-full transition-colors",
                                    cacheEnabled ? "bg-primary" : "bg-grey-dark"
                                )}
                            >
                                <div className={clsx(
                                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
                                    cacheEnabled ? "right-1" : "left-1"
                                )} />
                            </button>
                            <span className="text-xs font-bold text-white">{cacheEnabled ? "Activé" : "Désactivé"}</span>
                        </div>
                    </div>

                    {cacheEnabled && (
                        <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Vider le cache</h3>
                                <p className="text-xs text-grey-medium">Supprime toutes les photos en cache.</p>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={handleClearCache}
                                icon={Trash2}
                                className="text-danger hover:bg-danger hover:text-white border border-danger/20"
                            >
                                Vider
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Delta Sync Management */}
            <Card variant="glass" className="p-6">
                <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-primary" /> Synchronisation Incrémentale
                </h2>
                <div className="space-y-4">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Delta Sync</h3>
                        <p className="text-xs text-grey-medium mb-4">Charge uniquement les données modifiées depuis la dernière visite.</p>
                        {syncStats && syncStats.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-white uppercase tracking-wider">Dernières synchronisations :</p>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {syncStats.map((stat: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-xs bg-black/20 p-2 rounded">
                                            <span className="font-mono text-primary">{stat.table}</span>
                                            <span className="text-grey-light">{new Date(stat.lastSync).toLocaleString('fr-FR')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Réinitialiser la sync</h3>
                            <p className="text-xs text-grey-medium">Force un rechargement complet des données.</p>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={handleClearSyncData}
                            icon={Trash2}
                            className="text-danger hover:bg-danger hover:text-white border border-danger/20"
                        >
                            Réinitialiser
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
