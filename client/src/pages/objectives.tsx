
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Sidebar from "@/components/sidebar";
import ObjectivesTable from "@/components/objectives-table";
import { FiergsHeader } from "@/components/fiergs-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ObjectiveForm from "@/components/objective-form";
import { useAuth } from "@/hooks/use-auth";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";

export default function Objectives() {
  const { user } = useAuth();
  const { selectedQuarter } = useQuarterlyFilter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  }>({});

  // Check if user can create/edit objectives
  const canManageObjectives = user?.role === "admin" || user?.role === "gestor";

  const { data: objectives, isLoading } = useQuery({
    queryKey: ["/api/objectives", selectedQuarter, filters],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar objetivos trimestrais");
        const data = await response.json();
        return Array.isArray(data.objectives) ? data.objectives : [];
      } else {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/objectives${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar objetivos");
        return response.json();
      }
    },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <FiergsHeader 
          user={user} 
          onFilterChange={setFilters}
          showFilters={true}
        />
        
        <div className="p-6 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Objetivos</h2>
              <p className="text-gray-600">
                {canManageObjectives ? "Gerencie todos os objetivos organizacionais" : "Visualize os objetivos organizacionais"}
              </p>
            </div>
            {canManageObjectives && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Objetivo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <ObjectiveForm onSuccess={() => setIsCreateModalOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <ObjectivesTable objectives={objectives || []} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
