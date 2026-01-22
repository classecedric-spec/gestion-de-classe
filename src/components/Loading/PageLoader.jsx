import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PageLoader - Composant de chargement utilisé comme fallback pour les routes lazy‑loadées.
 * Le même composant existe déjà dans `src/components/Loading/index.jsx` mais certains imports
 * pointent directement vers `PageLoader.jsx`. Ce fichier garantit que le module existe et
 * exporte le même rendu, évitant ainsi les erreurs "module not found".
 */
export const PageLoader = () => (
    <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-grey-medium text-sm animate-pulse">Chargement...</p>
        </div>
    </div>
);

export default PageLoader;
