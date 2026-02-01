/**
 * @hook useSettingsSystemTabFlow
 * @description Chef d'orchestre pour la logique de l'onglet Système des paramètres.
 * Regroupe les hooks système, cache et optimisation de photos.
 */

import { useEffect } from 'react';
import { useSystemSettings } from './useSystemSettings';
import { useCacheSettings } from './useCacheSettings';
import { usePhotoOptimization } from './usePhotoOptimization';

export function useSettingsSystemTabFlow(
    setProfile?: (profile: any) => void,
    refreshProfile?: () => void
) {
    const system = useSystemSettings();
    const cache = useCacheSettings();
    const photos = usePhotoOptimization(setProfile, refreshProfile);

    // Initial load when tab is active
    useEffect(() => {
        cache.loadSyncStats();
        cache.fetchBulkData();
        if (cache.cacheEnabled) {
            cache.loadCacheStats();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        system,
        cache,
        photos
    };
}
