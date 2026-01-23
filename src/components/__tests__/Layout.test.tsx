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
                    single: vi.fn().mockResolvedValue({
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

// Mock navigation config
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

describe('Layout Component', () => {
    it('renders correctly with a valid session', async () => {

        render(
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Gestion Classe')).toBeInTheDocument();
        });

        expect(screen.getByText('Accueil')).toBeInTheDocument();
    });
});
