import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import IndicatorsDashboard from "@/components/indicators-dashboard";
import ExecutiveSummary from "@/components/executive-summary";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText, CheckSquare } from "lucide-react";
import ActionPlan from "@/components/action-plan";

export default function Reports() {
  const { selectedQuarter } = useQuarterlyFilter();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-lg">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">Relatórios Institucionais</h1>
            <p className="text-blue-100">
              Indicadores estratégicos e resumo executivo da implementação OKRs - Sistema FIERGS
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="indicators" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-lg bg-white dark:bg-slate-800 shadow-md border border-blue-200 dark:border-blue-700">
              <TabsTrigger 
                value="indicators" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white"
              >
                <Activity className="h-4 w-4" />
                <span>Indicadores</span>
              </TabsTrigger>
              <TabsTrigger 
                value="executive" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4" />
                <span>Resumo Executivo</span>
              </TabsTrigger>
              <TabsTrigger 
                value="action-plan" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:text-white"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Plano de Ação</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="indicators" className="space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-2 flex items-center space-x-3">
                  <Activity className="h-6 w-6" />
                  <span>Indicadores Estratégicos</span>
                </h2>
                <p className="text-blue-100">
                  Acompanhe os indicadores estratégicos da organização em tempo real
                </p>
              </div>
              <IndicatorsDashboard selectedQuarter={selectedQuarter} />
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