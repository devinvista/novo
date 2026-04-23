import { lazy, Suspense } from "react";
import ExecutiveSummary from "@/features/reports/executive-summary";
import CompactHeader from "@/components/layout/compact-header";
import { useFilters } from "@/hooks/use-filters";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, CheckSquare } from "lucide-react";
import ActionPlan from "@/features/actions/action-plan";

// Lazy-load chart-heavy component (isolates `recharts` in its own chunk)
const IndicatorsDashboard = lazy(() => import("@/features/indicators/indicators-dashboard"));

function ChartFallback() {
  return (
    <div
      className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground"
      data-testid="status-chart-loading"
    >
      Carregando gráficos...
    </div>
  );
}

export default function Reports() {
  const { selectedQuarter } = useQuarterlyFilter();
  const { filters } = useFilters();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CompactHeader showFilters={true} />

      <div className="flex-1 overflow-y-auto p-6 pt-16">
        <Tabs defaultValue="indicators" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="indicators" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Indicadores</span>
            </TabsTrigger>
            <TabsTrigger value="executive" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Resumo Executivo</span>
            </TabsTrigger>
            <TabsTrigger value="action-plan" className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4" />
              <span>Plano de Ação</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="indicators" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Indicadores Estratégicos</h2>
              <p className="text-muted-foreground">
                Acompanhe os indicadores estratégicos da organização em tempo real
              </p>
            </div>
            <Suspense fallback={<ChartFallback />}>
              <IndicatorsDashboard selectedQuarter={selectedQuarter} filters={filters} />
            </Suspense>
          </TabsContent>

          <TabsContent value="executive" className="space-y-6">
            <ExecutiveSummary />
          </TabsContent>

          <TabsContent value="action-plan" className="space-y-6">
            <ActionPlan selectedQuarter={selectedQuarter} filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
