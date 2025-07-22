import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Filters from "@/components/filters";
import ModernDashboard from "@/components/modern-dashboard";

export default function Dashboard() {
  const [filters, setFilters] = useState({
    regionId: undefined as number | undefined,
    subRegionId: undefined as number | undefined,
    serviceLineId: undefined as number | undefined,
    period: undefined as string | undefined,
  });

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
          <ModernDashboard />
        </div>
      </main>
    </div>
  );
}
