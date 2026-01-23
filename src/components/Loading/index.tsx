import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PageLoader - Composant de chargement pour les pages lazy-loadées
 */
export const PageLoader: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-grey-medium text-sm animate-pulse">Chargement...</p>
            </div>
        </div>
    );
};

/**
 * DashboardLoader - Loader pour le layout du dashboard
 */
export const DashboardLoader: React.FC = () => {
    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar skeleton */}
            <div className="w-64 bg-surface border-r border-white/10 p-4 space-y-4">
                <div className="h-8 bg-white/5 rounded animate-pulse" />
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Main content skeleton */}
            <div className="flex-1 p-6 space-y-4">
                <div className="h-12 bg-surface rounded animate-pulse" />
                <div className="h-64 bg-surface rounded animate-pulse" />
            </div>
        </div>
    );
};

/**
 * ModalLoader - Loader pour les modals lazy-loadés
 */
export const ModalLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl p-8 border border-white/10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        </div>
    );
};

export default PageLoader;
