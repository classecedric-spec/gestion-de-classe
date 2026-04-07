/**
 * Nom du module/fichier : CacheAndSyncSection.tsx
 * 
 * Données en entrée : 
 *   - `cacheStats` : Statistiques sur les images stockées localement (nombre, poids).
 *   - `cacheEnabled` : État d'activation du cache.
 *   - `syncStats` : Historique des dernières synchronisations par table de données.
 * 
 * Données en sortie : 
 *   - Activation/Désactivation du cache.
 *   - Suppression des données locales (Cache ou Sync) pour forcer un rechargement.
 * 
 * Objectif principal : Gérer la "mémoire locale" de l'application. Pour que l'app soit rapide, elle garde certaines informations (comme les photos ou les listes d'élèves) sur l'appareil de l'enseignant. Cette section permet de voir combien de place cela prend et de "faire le ménage" si les données semblent désynchronisées ou si l'appareil manque d'espace.
 * 
 * Ce que ça gère : 
 *   - L'interrupteur marche/arrêt du cache photo.
 *   - L'affichage de la taille occupée par les photos.
 *   - Le bouton "Vider le cache".
 *   - L'historique des synchronisations incrémentales (Delta Sync).
 */

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

/**
 * SECTION : Gestion de la persistance locale et de la vitesse.
 */
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
            {/* BLOC : GESTION DU CACHE PHOTO (Vitesse d'affichage) */}
            <Card variant="glass" className="p-6">
                <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                    <Database size={20} className="text-primary" /> Gestion du Cache Local
                </h2>
                <div className="space-y-4">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Cache des photos</h3>
                            <p className="text-xs text-grey-medium">Stocke les photos localement pour éviter de les télécharger à chaque fois et économiser votre forfait data.</p>
                            
                            {/* Statistiques si actif */}
                            {cacheEnabled && (
                                <div className="mt-3 flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-grey-light">Photos en cache :</span>
                                        <span className="font-mono font-bold text-primary">{cacheStats.count}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-grey-light">Taille occupée :</span>
                                        <span className="font-mono font-bold text-primary">{formatBytes(cacheStats.estimatedSize)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Interrupteur ON/OFF */}
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

                    {/* Zone de danger : Vider le cache */}
                    {cacheEnabled && (
                        <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Vider le cache</h3>
                                <p className="text-xs text-grey-medium">Supprime toutes les photos stockées sur cet appareil. Elles seront re-téléchargées si nécessaire.</p>
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

            {/* BLOC : SYNCHRONISATION DELTA (Intelligence du chargement) */}
            <Card variant="glass" className="p-6">
                <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-primary" /> Synchronisation Incrémentale
                </h2>
                <div className="space-y-4">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Delta Sync</h3>
                        <p className="text-xs text-grey-medium mb-4">L'application ne télécharge que ce qui a changé depuis votre dernière connexion. C'est beaucoup plus rapide !</p>
                        
                        {/* Liste des dernières syncos réussies */}
                        {syncStats && syncStats.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-white uppercase tracking-wider">Dernières mises à jour :</p>
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

                    {/* Zone de danger : Réinitialiser Sync */}
                    <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Réinitialiser les données</h3>
                            <p className="text-xs text-grey-medium">En cas d'erreur bizarre, force l'application à oublier ce qu'elle sait et à tout re-télécharger proprement.</p>
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

/**
 * LOGIGRAMME DE MAINTENANCE TECHNIQUE :
 * 
 * 1. CONSULTATION -> L'enseignant vérifie si ses données sont à jour (Delta Sync).
 * 2. NETTOYAGE -> S'il remarque un bug d'affichage (ex: photo qui ne change pas), il vide le cache.
 * 3. SYNCHRONISATION -> S'il manque des élèves, il réinitialise la synchro pour tout recharger.
 * 4. RÉSULTAT -> L'application repart sur une base "propre" synchronisée avec le serveur.
 */
