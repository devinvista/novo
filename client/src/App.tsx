import { useEffect } from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';
import { cleanupOnDialogClose } from '@/lib/modal-cleanup';

// Import pages
import AuthPage from '@/pages/auth-page';
import Dashboard from '@/pages/dashboard';
import Objectives from '@/pages/objectives';
import KeyResults from '@/pages/key-results';
import Actions from '@/pages/actions';
import Checkpoints from '@/pages/checkpoints';
import Users from '@/pages/users';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

// Import components
import Sidebar from '@/components/sidebar';
import { useAuth, AuthProvider } from '@/hooks/use-auth';

// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function AppContent() {
  const { user } = useAuth();
  
  // Global cleanup on mount to handle any leftover modals
  useEffect(() => {
    cleanupOnDialogClose();
    
    // Set up global keyboard shortcut to force cleanup if needed (Dev only)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.ctrlKey && e.shiftKey) {
        console.log('🔧 Manual modal cleanup triggered');
        cleanupOnDialogClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/objectives" component={Objectives} />
          <Route path="/key-results" component={KeyResults} />
          <Route path="/actions" component={Actions} />
          <Route path="/checkpoints" component={Checkpoints} />
          <Route path="/users" component={Users} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="light">
          <Router>
            <AppContent />
          </Router>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}