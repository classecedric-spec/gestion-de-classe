import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css'
import App from './App'

import { OfflineSyncProvider } from './context/OfflineSyncContext'
import { ThemeProvider } from './components/ThemeProvider'

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
    <StrictMode>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ThemeProvider>
                <OfflineSyncProvider>
                    <App />
                </OfflineSyncProvider>
            </ThemeProvider>
        </Router>
    </StrictMode>,
)
