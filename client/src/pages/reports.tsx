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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-xl">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-3 tracking-tight">Relatórios Institucionais</h1>
            <p className="text-blue-100 text-lg">
              Dashboard estratégico de indicadores e performance - Sistema FIERGS
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900 dark:to-slate-800">
          <Tabs defaultValue="indicators" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl h-14 bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              <TabsTrigger 
                value="indicators" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
              >
                <Activity className="h-4 w-4" />
                <span className="font-medium">Indicadores</span>
              </TabsTrigger>
              <TabsTrigger 
                value="executive" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
              >
                <FileText className="h-4 w-4" />
                <span className="font-medium">Resumo Executivo</span>
              </TabsTrigger>
              <TabsTrigger 
                value="action-plan" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="font-medium">Plano de Ação</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="indicators" className="space-y-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-2xl shadow-2xl border border-blue-500/20">
                <h2 className="text-3xl font-bold mb-3 flex items-center space-x-4">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Activity className="h-8 w-8" />
                  </div>
                  <span>Indicadores Estratégicos</span>
                </h2>
                <p className="text-blue-100 text-lg">
                  Dashboard em tempo real dos indicadores estratégicos organizacionais
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