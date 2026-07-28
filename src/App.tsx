import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PublicPagesAdmin from '@/pages/PublicPagesAdmin';
import TischePage from '@/pages/TischePage';
import TischeDetailPage from '@/pages/TischeDetailPage';
import ReservierungenPage from '@/pages/ReservierungenPage';
import ReservierungenDetailPage from '@/pages/ReservierungenDetailPage';
import VeranstaltungenPage from '@/pages/VeranstaltungenPage';
import VeranstaltungenDetailPage from '@/pages/VeranstaltungenDetailPage';
import SpeisekartePage from '@/pages/SpeisekartePage';
import SpeisekarteDetailPage from '@/pages/SpeisekarteDetailPage';
// <custom:imports>
const ReservierungAufnehmenPage = lazy(() => import('@/pages/intents/ReservierungAufnehmenPage'));
const VeranstaltungVorbereitenPage = lazy(() => import('@/pages/intents/VeranstaltungVorbereitenPage'));
// </custom:imports>

// Lazy: public pages live outside <Layout> and only load on /#/public/:slug —
// dashboard users never pay for them, anonymous visitors skip the dashboard.
const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/:slug" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="tische" element={<TischePage />} />
                <Route path="tische/:id" element={<TischeDetailPage />} />
                <Route path="reservierungen" element={<ReservierungenPage />} />
                <Route path="reservierungen/:id" element={<ReservierungenDetailPage />} />
                <Route path="veranstaltungen" element={<VeranstaltungenPage />} />
                <Route path="veranstaltungen/:id" element={<VeranstaltungenDetailPage />} />
                <Route path="speisekarte" element={<SpeisekartePage />} />
                <Route path="speisekarte/:id" element={<SpeisekarteDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="verwaltung/oeffentliche-seiten" element={<PublicPagesAdmin />} />
                {/* <custom:routes> */}
                <Route path="intents/reservierung-aufnehmen" element={<Suspense fallback={null}><ReservierungAufnehmenPage /></Suspense>} />
                <Route path="intents/veranstaltung-vorbereiten" element={<Suspense fallback={null}><VeranstaltungVorbereitenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
