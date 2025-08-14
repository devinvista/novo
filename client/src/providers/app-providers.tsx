import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { SidebarProvider } from '@/hooks/use-sidebar-toggle';
import { FiltersProvider } from '@/hooks/use-filters';
import { QuarterlyFilterProvider } from '@/hooks/use-quarterly-filter';
import { queryClient } from '@/lib/queryClient';

// Main App Providers Wrapper
interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <FiltersProvider>
            <QuarterlyFilterProvider>
              <ThemeProvider attribute="class" defaultTheme="light">
                {children}
                <Toaster />
              </ThemeProvider>
            </QuarterlyFilterProvider>
          </FiltersProvider>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}