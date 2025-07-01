import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Filters from "@/components/filters";
import KPICards from "@/components/kpi-cards";
import ObjectivesTable from "@/components/objectives-table";
import ProgressChart from "@/components/progress-chart";
import RecentActivities from "@/components/recent-activities";

export default function Dashboard() {
  const [filters, setFilters] = useState({
    regionId: undefined as number | undefined,
    subRegionId: undefined as number | undefined,
    serviceLineId: undefined as number | undefined,
    period: undefined as string | undefined,
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/dashboard/kpis", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.regionId) params.append("regionId", filters.regionId.toString());
      if (filters.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
      if (filters.period) params.append("period", filters.period);
      
      const response = await fetch(`/api/dashboard/kpis?${params}`);
      if (!response.ok) throw new Error("Erro ao carregar KPIs");
      return response.json();
    },
  });

  const { data: objectives, isLoading: objectivesLoading } = useQuery({
    queryKey: ["/api/objectives", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.regionId) params.append("regionId", filters.regionId.toString());
      if (filters.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
      if (filters.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
      if (filters.period) params.append("period", filters.period);
      
      const response = await fetch(`/api/objectives?${params}`);
      if (!response.ok) throw new Error("Erro ao carregar objetivos");
      return response.json();
    },
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
        
        <div className="flex-1 overflow-y-auto p-6">
          <KPICards data={kpis} isLoading={kpisLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2">
              <ProgressChart objectives={objectives} />
            </div>
            
            <div>
              <RecentActivities />
            </div>
          </div>
          
          <div className="mt-8">
            <ObjectivesTable 
              objectives={objectives} 
              isLoading={objectivesLoading}
              showActions={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
