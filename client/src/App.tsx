import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ForceRefresh } from "@/components/force-refresh";
import { AuthProvider } from "@/hooks/use-auth";
import { QuarterlyFilterProvider } from "@/hooks/use-quarterly-filter";
import { SidebarProvider } from "@/hooks/use-sidebar-toggle";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Objectives from "@/pages/objectives";
import KeyResults from "@/pages/key-results";
import Actions from "@/pages/actions";
import Checkpoints from "@/pages/checkpoints";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/objectives" component={Objectives} />
      <ProtectedRoute path="/key-results" component={KeyResults} />
      <ProtectedRoute path="/actions" component={Actions} />
      <ProtectedRoute path="/checkpoints" component={Checkpoints} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/indicators" component={Reports} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QuarterlyFilterProvider>
          <SidebarProvider>
            <TooltipProvider>
              <ForceRefresh />
              <Toaster />
              <Router />
            </TooltipProvider>
          </SidebarProvider>
        </QuarterlyFilterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
