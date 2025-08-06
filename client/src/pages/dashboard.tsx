import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import ModernDashboard from "@/components/modern-dashboard";
import Filters from "@/components/filters";

export default function Dashboard() {
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
          title="Dashboard" 
          description="Visão geral dos objetivos e resultados"
        />
        
        <Filters filters={filters} onFiltersChange={setFilters} />
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <ModernDashboard filters={filters} />
        </div>
      </main>
    </div>
  );
}
