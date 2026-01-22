import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Layout from '../Layout';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({
                data: {
                    session: {
                        user: { id: 'test-user-id' }
                    }
                }
            }),
            onAuthStateChange: vi.fn().mockReturnValue({
                data: { subscription: { unsubscribe: vi.fn() } }
            }),
            signOut: vi.fn(),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                        data: { prenom: 'Test', nom: 'User', validation_admin: true }
                    }),
                    single: vi.fn().mockResolvedValue({ // fallback for checkUserProfile if used by mistake
                        data: { prenom: 'Test', nom: 'User', role: 'prof', is_active: true }
                    })
                })
            })
        })
    }
}));

vi.mock('../../lib/overdueLogic', () => ({
    checkOverdueActivities: vi.fn()
}));

vi.mock('../../lib/cleanupUtils', () => ({
    cleanupOrphanProgressions: vi.fn()
}));

// Mock navigation config to avoid import issues
vi.mock('../../config/navigation', () => ({
    MAIN_NAV_ITEMS: [
        { label: 'Accueil', path: '/dashboard', icon: () => null }
    ]
}));

// Mock ROUTES
vi.mock('../../routes', () => ({
    ROUTES: {
        DASHBOARD: '/dashboard',
        DASHBOARD_PRESENCE: '/dashboard/presence',
        DASHBOARD_SUIVI: '/dashboard/suivi',
        DASHBOARD_USER: '/dashboard/user',
        DASHBOARD_ACTIVITIES: '/dashboard/activities',
        DASHBOARD_SETTINGS: '/dashboard/settings',
    }
}));

// Mock react-router-dom hooks that are used directly in the component
// We can wrap the component in BrowserRouter, but we also need to mock useNavigate/useLocation if they are used heavily,
// or just let BrowserRouter handle it. Layout uses them, so BrowserRouter wrapper is good.
// However, we might want to spy on them if we tested interactions. For simple render, BrowserRouter is enough.

describe('Layout Component', () => {
    it('renders correctly with a valid session', async () => {

        render(
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        );

        // Wait for loading to finish (Layout shows Loader2 while loading)
        // We expect "Gestion Classe" which is in the sidebar
        await waitFor(() => {
            expect(screen.getByText('Gestion Classe')).toBeInTheDocument();
        });

        // Check if nav item is rendered
        expect(screen.getByText('Accueil')).toBeInTheDocument();
    });
});
