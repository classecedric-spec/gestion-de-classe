import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { PageLoader, DashboardLoader } from './components/Loading';
import { ROUTES } from "./routes";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Lazy load all pages
const Layout = lazy(() => import('./components/Layout'));
const Home = lazy(() => import('./pages/Home'));
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Students = lazy(() => import('./pages/Students'));
const Classes = lazy(() => import('./pages/Classes'));
const Groups = lazy(() => import('./pages/Groups'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ActivitiesLayout = lazy(() => import('./pages/ActivitiesLayout'));
const Branches = lazy(() => import('./pages/Branches'));
const SubBranches = lazy(() => import('./pages/SubBranches'));
const Modules = lazy(() => import('./pages/Modules'));
const Activities = lazy(() => import('./pages/Activities'));
const Niveaux = lazy(() => import('./pages/Niveaux'));
const Materiels = lazy(() => import('./pages/Materiels'));
const Presence = lazy(() => import('./pages/Presence'));
const Settings = lazy(() => import('./pages/Settings'));
const SuiviGlobal = lazy(() => import('./pages/SuiviGlobal'));
const SuiviGlobalTBI = lazy(() => import('./pages/SuiviGlobalTBI'));
const Adults = lazy(() => import('./pages/Adults'));
const MobileSuivi = lazy(() => import('./pages/MobileSuivi'));
const Features = lazy(() => import('./pages/Features'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Fonctionnement = lazy(() => import('./pages/Fonctionnement'));
const LandingMobile = lazy(() => import('./pages/LandingMobile'));
const MobileDashboard = lazy(() => import('./pages/MobileDashboard'));
const MobileEncodage = lazy(() => import('./pages/MobileEncodage'));
const MobilePresence = lazy(() => import('./pages/MobilePresence'));

function App() {
  // Global effect to ensure all buttons have an aria-label
  useEffect(() => {
    const addAriaLabels = () => {
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        if (!btn.hasAttribute('aria-label')) {
          // Use textContent, title, or a default fallback
          const label = btn.textContent?.trim() || btn.getAttribute('title') || 'element interactif';
          if (label) {
            btn.setAttribute('aria-label', label);
          }
        }
      });
    };

    // Run initially
    addAriaLabels();

    // Setup an observer to handle dynamically added buttons
    const observer = new MutationObserver(() => {
      addAriaLabels();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff' } }} />
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<PageLoader />}>
            <PublicRoute><Landing /></PublicRoute>
          </Suspense>
        } />

        <Route path="/mobile" element={
          <Suspense fallback={<PageLoader />}>
            <PublicRoute><LandingMobile /></PublicRoute>
          </Suspense>
        } />

        <Route path="/mobile-dashboard" element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute><MobileDashboard /></ProtectedRoute>
          </Suspense>
        } />

        <Route path="/mobile-presence" element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute><MobilePresence /></ProtectedRoute>
          </Suspense>
        } />

        <Route path="/mobile-encodage" element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute><MobileEncodage /></ProtectedRoute>
          </Suspense>
        } />

        <Route path="/features" element={
          <Suspense fallback={<PageLoader />}>
            <Features />
          </Suspense>
        } />

        <Route path="/privacy" element={
          <Suspense fallback={<PageLoader />}>
            <Privacy />
          </Suspense>
        } />

        <Route path="/login" element={
          <Suspense fallback={<PageLoader />}>
            <PublicRoute><Auth /></PublicRoute>
          </Suspense>
        } />

        <Route path="/dashboard" element={
          <Suspense fallback={<DashboardLoader />}>
            <ProtectedRoute><Layout /></ProtectedRoute>
          </Suspense>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><Home /></Suspense>} />
          <Route path={ROUTES.DASHBOARD_SUIVI} element={<Suspense fallback={<PageLoader />}><SuiviGlobal /></Suspense>} />
          <Route path="avancement" element={<Navigate to="/dashboard/suivi" replace />} />

          <Route path={ROUTES.DASHBOARD_USER} element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>}>
            <Route index element={<Navigate to="groups" replace />} />
            <Route path="students" element={<Suspense fallback={<PageLoader />}><Students /></Suspense>} />
            <Route path="groups" element={<Suspense fallback={<PageLoader />}><Groups /></Suspense>} />
            <Route path={ROUTES.USER_CLASSES} element={<Suspense fallback={<PageLoader />}><Classes /></Suspense>} />
            <Route path={ROUTES.USER_NIVEAUX} element={<Suspense fallback={<PageLoader />}><Niveaux /></Suspense>} />
            <Route path={ROUTES.USER_ADULTS} element={<Suspense fallback={<PageLoader />}><Adults /></Suspense>} />
          </Route>

          <Route path="activities" element={<Suspense fallback={<PageLoader />}><ActivitiesLayout /></Suspense>}>
            <Route index element={<Navigate to="modules" replace />} />
            <Route path="branches" element={<Suspense fallback={<PageLoader />}><Branches /></Suspense>} />
            <Route path="sub-branches" element={<Suspense fallback={<PageLoader />}><SubBranches /></Suspense>} />
            <Route path="modules" element={<Suspense fallback={<PageLoader />}><Modules /></Suspense>} />
            <Route path="materiels" element={<Suspense fallback={<PageLoader />}><Materiels /></Suspense>} />
            <Route path="list" element={<Suspense fallback={<PageLoader />}><Activities /></Suspense>} />
          </Route>

          <Route path={ROUTES.DASHBOARD_SETTINGS} element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          <Route path={ROUTES.DASHBOARD_PRESENCE} element={<Suspense fallback={<PageLoader />}><Presence /></Suspense>} />
        </Route>



        <Route path="/suivi-tbi" element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute><SuiviGlobalTBI /></ProtectedRoute>
          </Suspense>
        } />

        <Route path="/mobile-suivi/:groupId" element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute><MobileSuivi /></ProtectedRoute>
          </Suspense>
        } />

        <Route path="/fonctionnement" element={
          <Suspense fallback={<PageLoader />}>
            <Fonctionnement />
          </Suspense>
        } />
      </Routes>
    </QueryClientProvider>
  );
}

export default App;
