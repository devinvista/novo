import { lazy, Suspense } from "react";
import CompactHeader from "@/components/layout/compact-header";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useFilters } from "@/hooks/use-filters";

// Lazy-load chart-heavy component (isolates `recharts` in its own chunk)
const IndicatorsDashboard = lazy(() => import("@/features/indicators/indicators-dashboard"));

export default function Indicators() {
  const { selectedQuarter } = useQuarterlyFilter();
  const { filters } = useFilters();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={true} />

        <div className="p-6 border-b bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Indicadores Estratégicos</h2>
            <p className="text-gray-600">Acompanhe os indicadores estratégicos da organização</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Suspense
            fallback={
              <div
                className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground"
                data-testid="status-chart-loading"
              >
                Carregando gráficos...
              </div>
            }
          >
            <IndicatorsDashboard selectedQuarter={selectedQuarter} filters={filters} />
          </Suspense>
        </div>
    </div>
  );
}
