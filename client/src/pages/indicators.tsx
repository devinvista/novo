import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Filters from "@/components/filters";
import IndicatorsDashboard from "@/components/indicators-dashboard";

export default function Indicators() {
  const [filters, setFilters] = useState({
    regionId: undefined as number | undefined,
    subRegionId: undefined as number | undefined,
    serviceLineId: undefined as number | undefined,
  });

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
          <IndicatorsDashboard filters={filters} />
        </div>
      </main>
    </div>
  );
}