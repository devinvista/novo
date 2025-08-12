
import Sidebar from "@/components/sidebar";
import SimpleDashboard from "@/components/simple-dashboard";
import CompactHeader from "@/components/compact-header";
import { useAuth } from "@/hooks/use-auth";
import { useFilters } from "@/hooks/use-filters";

export default function Dashboard() {
  const { user } = useAuth();
  const { filters } = useFilters();
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader 
          showFilters={true}
        />
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 pt-16">
          <SimpleDashboard filters={filters} />
        </div>
      </main>
    </div>
  );
}
