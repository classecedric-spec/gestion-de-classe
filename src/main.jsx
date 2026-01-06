import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css'
import App from './App.jsx'

import { OfflineSyncProvider } from './context/OfflineSyncContext.jsx'
import { ThemeProvider } from './components/ThemeProvider.jsx'

createRoot(document.getElementById('root')).render(
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
