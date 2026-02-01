import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PageLoader - Composant de chargement pour les pages entières
 */
export const PageLoader: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="text-grey-medium text-sm animate-pulse">Chargement...</p>
        </div>
    </div>
);

/**
 * SuspenseLoader - Loader léger pour les sections ou composants lazy-loadés
 */
export const SuspenseLoader: React.FC = () => (
    <div className="flex items-center justify-center p-8 text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
    </div>
);

/**
 * DashboardLoader - Skeleton loader pour le layout dashboard
 */
export const DashboardLoader: React.FC = () => (
    <div className="flex h-screen bg-background">
        <div className="w-64 bg-surface border-r border-white/10 p-4 space-y-4">
            <div className="h-8 bg-white/5 rounded animate-pulse" />
            <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
                ))}
            </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
            <div className="h-12 bg-surface rounded animate-pulse" />
            <div className="h-64 bg-surface rounded animate-pulse" />
        </div>
    </div>
);

/**
 * ModalLoader - Overlay loader pour les modales
 */
export const ModalLoader: React.FC = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface rounded-2xl p-8 border border-white/10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    </div>
);
