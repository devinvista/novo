import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import IndicatorsDashboard from "@/components/indicators-dashboard";
import Filters from "@/components/filters";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";

export default function Indicators() {
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
        <Header 
          title="Indicadores Estratégicos" 
          description="Acompanhe os indicadores estratégicos da organização"
        />
        
        <Filters filters={filters} onFiltersChange={setFilters} />
        
        <div className="flex-1 overflow-y-auto p-6">
          <IndicatorsDashboard selectedQuarter={selectedQuarter} filters={filters} />
        </div>
      </main>
    </div>
  );
}