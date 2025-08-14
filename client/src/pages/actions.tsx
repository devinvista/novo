import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import CompactHeader from "@/components/compact-header";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ActionForm from "@/components/action-form";
import ActionTimeline from "@/components/action-timeline";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useFilters } from "@/hooks/use-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Actions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [keyResultFilter, setKeyResultFilter] = useState<string>("");
  const { selectedQuarter } = useQuarterlyFilter();
  const { filters } = useFilters();
  const [location] = useLocation();

  // Read kr parameter from URL and set filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const krParam = urlParams.get('kr');
    if (krParam) {
      setKeyResultFilter(krParam);
    }
  }, [location]);

  const { data: keyResults, error: keyResultsError } = useQuery({
    queryKey: ["/api/key-results", selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      try {
        console.log('📡 Actions: Fetching key results with filters:', { selectedQuarter, filters });
        
        if (selectedQuarter && selectedQuarter !== "all") {
          const params = new URLSearchParams();
          if (filters?.regionId) params.append('regionId', filters.regionId.toString());
          if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
          if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
          
          const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ''}`;
          console.log('📡 Actions KR Quarterly URL:', url);
          const response = await fetch(url, { credentials: "include" });
          if (!response.ok) throw new Error("Erro ao carregar key results trimestrais");
          const data = await response.json();
          return Array.isArray(data.keyResults) ? data.keyResults : [];
        } else {
          const params = new URLSearchParams();
          if (filters?.regionId) params.append('regionId', filters.regionId.toString());
          if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
          if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
          
          const url = `/api/key-results${params.toString() ? `?${params}` : ''}`;
          console.log('📡 Actions KR URL:', url);
          const response = await fetch(url, { credentials: "include" });
          if (!response.ok) throw new Error("Erro ao carregar key results");
          const result = await response.json();
          return Array.isArray(result) ? result : [];
        }
      } catch (error) {
        console.error('Error fetching key results:', error);
        return [];
      }
    },
    staleTime: 0,
  });

  // Force invalidation when filters change - with debounce
  useEffect(() => {
    console.log('🔄 Actions: Filters changed, invalidating queries:', filters);
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, queryClient]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader 
          showFilters={true}
        />
        
        <div className="p-6 border-b bg-white pt-16">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ações</h2>
              <p className="text-gray-600">Acompanhe e gerencie as ações dos resultados-chave</p>
            </div>
            <div className="flex gap-4 items-center">
              <Select value={keyResultFilter} onValueChange={setKeyResultFilter}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Filtrar por resultado-chave" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os resultados-chave</SelectItem>
                  {Array.isArray(keyResults) && keyResults.filter((kr: any) => kr && kr.id && kr.title).map((kr: any) => (
                    <SelectItem key={kr.id} value={kr.id.toString()}>
                      {kr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Ação
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="p-6">
            <ActionTimeline 
              keyResultId={keyResultFilter ? parseInt(keyResultFilter) : undefined} 
              showAll={true}
              selectedQuarter={selectedQuarter}
              filters={filters}
            />
          </Card>
        </div>
      </main>

      <ActionForm
        action={null}
        onSuccess={() => {
          setShowForm(false);
        }}
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
        }}
      />
    </div>
  );
}