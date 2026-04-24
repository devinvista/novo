import { useEffect, lazy, Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';
import { cleanupOnDialogClose } from '@/lib/modal-cleanup';

import AuthPage from '@/pages/auth-page';
import NotFound from '@/pages/not-found';

const AlignmentTree = lazy(() => import('@/pages/alignment-tree'));
const Objectives = lazy(() => import('@/pages/objectives'));
const KeyResults = lazy(() => import('@/pages/key-results'));
const Actions = lazy(() => import('@/pages/actions'));
const Checkpoints = lazy(() => import('@/pages/checkpoints'));
const Indicators = lazy(() => import('@/pages/indicators'));
const Users = lazy(() => import('@/pages/users'));
const Reports = lazy(() => import('@/pages/reports'));
const Settings = lazy(() => import('@/pages/settings'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Trash = lazy(() => import('@/pages/trash'));
const Audit = lazy(() => import('@/pages/audit'));

import Sidebar from '@/components/layout/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { AppProviders } from '@/providers/app-providers';

function PageFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center p-8 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
      data-testid="status-page-loading"
    >
      Carregando…
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    cleanupOnDialogClose();
  }, []);

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-background">
      <a href="#main" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Sidebar />
      <main id="main" className="flex-1 flex flex-col overflow-hidden" tabIndex={-1}>
        <Suspense fallback={<PageFallback />}>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/" component={AlignmentTree} />
            <Route path="/objectives" component={Objectives} />
            <Route path="/key-results" component={KeyResults} />
            <Route path="/actions" component={Actions} />
            <Route path="/checkpoints" component={Checkpoints} />
            <Route path="/indicators" component={Indicators} />
            <Route path="/users" component={Users} />
            <Route path="/reports" component={Reports} />
            <Route path="/settings" component={Settings} />
            <Route path="/trash" component={Trash} />
            <Route path="/audit" component={Audit} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Router>
        <AppContent />
      </Router>
    </AppProviders>
  );
}
