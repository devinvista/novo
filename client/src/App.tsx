import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { QuarterlyFilterProvider } from "@/hooks/use-quarterly-filter";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Objectives from "@/pages/objectives";
import KeyResults from "@/pages/key-results";
import Actions from "@/pages/actions";
import Checkpoints from "@/pages/checkpoints";
import Indicators from "@/pages/indicators";
import Users from "@/pages/users";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/objectives" component={Objectives} />
      <ProtectedRoute path="/key-results" component={KeyResults} />
      <ProtectedRoute path="/actions" component={Actions} />
      <ProtectedRoute path="/checkpoints" component={Checkpoints} />
      <ProtectedRoute path="/indicators" component={Indicators} />
      <ProtectedRoute path="/users" component={Users} />
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
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QuarterlyFilterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
