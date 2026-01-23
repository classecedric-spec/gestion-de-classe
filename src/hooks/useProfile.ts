import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { userService } from '../features/users/services/userService';

/**
 * Hook for managing user profile verification
 */
export function useProfile(userId: string | undefined) {
    const [profileIncomplete, setProfileIncomplete] = useState(false);
    const [pendingValidation, setPendingValidation] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const checkProfile = useCallback(async (id: string) => {
        try {
            const profile = await userService.getProfile(id);

            const isIncomplete = !profile || !profile.prenom || !profile.nom;
            const isPending = profile && (profile as any).validation_admin === false;

            setProfileIncomplete(isIncomplete);
            setPendingValidation(isPending as boolean);

            const isProfileTab =
                location.pathname === '/dashboard/settings' &&
                location.search.includes('tab=profil');

            if ((isIncomplete || isPending) && !isProfileTab) {
                navigate('/dashboard/settings?tab=profil');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }, [location.pathname, location.search, navigate]);

    useEffect(() => {
        if (userId) {
            checkProfile(userId);
        }
    }, [userId, checkProfile]);

    return { profileIncomplete, pendingValidation, checkProfile };
}

