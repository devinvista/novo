import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import IndicatorsDashboard from "@/components/indicators-dashboard";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import QuarterlyFilter from "@/components/quarterly-filter";

export default function Indicators() {
  const { selectedQuarter } = useQuarterlyFilter();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Indicadores Estratégicos" 
          description="Acompanhe os indicadores estratégicos da organização"
          action={<QuarterlyFilter variant="compact" />}
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <IndicatorsDashboard filters={{ quarter: selectedQuarter }} />
        </div>
      </main>
    </div>
  );
}