import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/react';
import AppRoutes from './AppRoutes';
import { RealtimeSyncProvider } from './context/RealtimeSyncContext';

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <RealtimeSyncProvider>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: { background: 'var(--surface)', color: 'var(--text-main)' },
                    }}
                />
                <AppRoutes />
                <SpeedInsights />
            </RealtimeSyncProvider>
        </QueryClientProvider>
    );
}

export default App;
