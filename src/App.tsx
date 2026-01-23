import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './AppRoutes';

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff' } }} />
            <AppRoutes />
        </QueryClientProvider>
    );
}

export default App;
