import { useState } from "react";
import Sidebar from "@/components/sidebar";
import ModernDashboard from "@/components/modern-dashboard";
import { FiergsHeader } from "@/components/fiergs-header";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<{
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  }>({});
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <FiergsHeader 
          user={user} 
          onFilterChange={setFilters}
          showFilters={true}
        />
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <ModernDashboard filters={filters} />
        </div>
      </main>
    </div>
  );
}
