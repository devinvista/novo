import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Filters from "@/components/filters";
import ObjectivesTable from "@/components/objectives-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ObjectiveForm from "@/components/objective-form";
import { useAuth } from "@/hooks/use-auth";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";

export default function Objectives() {
  const { user } = useAuth();
  const { selectedQuarter } = useQuarterlyFilter();
  const [filters, setFilters] = useState({
    regionId: undefined as number | undefined,
    subRegionId: undefined as number | undefined,
    serviceLineId: undefined as string | undefined,
    period: undefined as string | undefined,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Check if user can create/edit objectives
  const canManageObjectives = user?.role === "admin" || user?.role === "gestor";

  const { data: objectives, isLoading } = useQuery({
    queryKey: ["/api/objectives", filters, selectedQuarter],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        // Use quarterly data endpoint
        const response = await fetch(`/api/quarters/${selectedQuarter}/data`, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar objetivos trimestrais");
        const data = await response.json();
        return data.objectives || [];
      } else {
        // Use regular objectives endpoint with filters
        const params = new URLSearchParams();
        if (filters.regionId) params.append("regionId", filters.regionId.toString());
        if (filters.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
        if (filters.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
        
        const response = await fetch(`/api/objectives?${params}`);
        if (!response.ok) throw new Error("Erro ao carregar objetivos");
        return response.json();
      }
    },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Objetivos" 
          description={canManageObjectives ? "Gerencie todos os objetivos organizacionais" : "Visualize os objetivos organizacionais"}
          action={
            canManageObjectives ? (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Objetivo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <ObjectiveForm onSuccess={() => setIsCreateModalOpen(false)} />
                </DialogContent>
              </Dialog>
            ) : null
          }
        />
        
        <Filters filters={filters} onFiltersChange={setFilters} />
        
        <div className="flex-1 overflow-y-auto p-6">
          <ObjectivesTable 
            objectives={objectives} 
            isLoading={isLoading}
            showActions={canManageObjectives}
          />
        </div>
      </main>
    </div>
  );
}
