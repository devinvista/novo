import { useState } from "react";
import Sidebar from "@/components/sidebar";
import IndicatorsDashboard from "@/components/indicators-dashboard";
import ExecutiveSummary from "@/components/executive-summary";
import CompactHeader from "@/components/compact-header";
import { useAuth } from "@/hooks/use-auth";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, CheckSquare } from "lucide-react";
import ActionPlan from "@/components/action-plan";

export default function Reports() {
  const { user } = useAuth();
  const { selectedQuarter } = useQuarterlyFilter();
  const [filters, setFilters] = useState<{
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  }>({});

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader 
          onFilterChange={setFilters}
          showFilters={true}
        />
        
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
              <IndicatorsDashboard selectedQuarter={selectedQuarter} filters={filters} />
            </TabsContent>
            
            <TabsContent value="executive" className="space-y-6">
              <ExecutiveSummary />
            </TabsContent>
            
            <TabsContent value="action-plan" className="space-y-6">
              <ActionPlan />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}