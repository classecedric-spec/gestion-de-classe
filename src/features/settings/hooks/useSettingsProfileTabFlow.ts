/**
 * @hook useSettingsProfileTabFlow
 * @description Chef d'orchestre pour l'onglet Profil des paramètres.
 * Gère le chargement et la mise à jour du profil utilisateur.
 * 
 * @param {Function} refreshProfile - Callback pour rafraîchir le profil global.
 */

import { useEffect } from 'react';
import { useProfileSettings } from './useProfileSettings';

export function useSettingsProfileTabFlow(refreshProfile?: () => void) {
    const profileHook = useProfileSettings(refreshProfile);

    // Initial load
    useEffect(() => {
        profileHook.getProfile();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return profileHook;
}
