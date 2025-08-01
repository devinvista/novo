import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import IndicatorsDashboard from "@/components/indicators-dashboard";
import ExecutiveSummary from "@/components/executive-summary";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText } from "lucide-react";

export default function Reports() {
  const { selectedQuarter } = useQuarterlyFilter();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Relatórios" 
          description="Indicadores estratégicos e resumo executivo da implementação OKRs"
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="indicators" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="indicators" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Indicadores</span>
              </TabsTrigger>
              <TabsTrigger value="executive" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Resumo Executivo</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="indicators" className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Indicadores Estratégicos</h2>
                <p className="text-muted-foreground">
                  Acompanhe os indicadores estratégicos da organização em tempo real
                </p>
              </div>
              <IndicatorsDashboard selectedQuarter={selectedQuarter} />
            </TabsContent>
            
            <TabsContent value="executive" className="space-y-6">
              <ExecutiveSummary />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}