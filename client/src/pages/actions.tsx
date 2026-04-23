import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, List, GanttChart } from "lucide-react";
import { useLocation } from "wouter";
import CompactHeader from "@/components/layout/compact-header";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ActionForm from "@/features/actions/action-form";
import ActionTimeline from "@/features/actions/action-timeline";
import GanttTimeline from "@/features/actions/gantt-timeline";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useFilters } from "@/hooks/use-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewMode = "list" | "gantt";

export default function Actions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [keyResultFilter, setKeyResultFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { selectedQuarter } = useQuarterlyFilter();
  const { filters } = useFilters();
  const [location] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const krParam = urlParams.get("kr");
    if (krParam) {
      setKeyResultFilter(krParam);
    }
  }, [location]);

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results", selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      try {
        if (selectedQuarter && selectedQuarter !== "all") {
          const params = new URLSearchParams();
          if (filters?.regionId) params.append("regionId", filters.regionId.toString());
          if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
          if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
          const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ""}`;
          const response = await fetch(url, { credentials: "include" });
          if (!response.ok) throw new Error("Erro ao carregar key results trimestrais");
          const data = await response.json();
          return Array.isArray(data.keyResults) ? data.keyResults : [];
        } else {
          const params = new URLSearchParams();
          if (filters?.regionId) params.append("regionId", filters.regionId.toString());
          if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
          if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
          const url = `/api/key-results${params.toString() ? `?${params}` : ""}`;
          const response = await fetch(url, { credentials: "include" });
          if (!response.ok) throw new Error("Erro ao carregar key results");
          const result = await response.json();
          return Array.isArray(result) ? result : [];
        }
      } catch (error) {
        console.error("Error fetching key results:", error);
        throw error;
      }
    },
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CompactHeader showFilters={true} />

      <div className="p-6 border-b bg-white pt-16">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ações</h2>
            <p className="text-gray-600">
              {viewMode === "gantt"
                ? "Visualize prazos e progresso das ações na linha do tempo"
                : "Acompanhe e gerencie as ações dos resultados-chave"}
            </p>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                data-testid="toggle-list-view"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
              <button
                data-testid="toggle-gantt-view"
                onClick={() => setViewMode("gantt")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                  viewMode === "gantt"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <GanttChart className="h-4 w-4" />
                Gantt
              </button>
            </div>

            {/* KR Filter */}
            <Select value={keyResultFilter} onValueChange={setKeyResultFilter}>
              <SelectTrigger className="w-[280px]" data-testid="select-kr-filter">
                <SelectValue placeholder="Filtrar por resultado-chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os resultados-chave</SelectItem>
                {Array.isArray(keyResults) &&
                  keyResults
                    .filter((kr: any) => kr && kr.id && kr.title)
                    .map((kr: any) => (
                      <SelectItem key={kr.id} value={kr.id.toString()}>
                        {kr.title}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setShowForm(true)} data-testid="button-nova-acao">
              <Plus className="mr-2 h-4 w-4" />
              Nova Ação
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === "list" ? (
          <Card className="p-6">
            <ActionTimeline
              keyResultId={
                keyResultFilter && keyResultFilter !== "all"
                  ? parseInt(keyResultFilter)
                  : undefined
              }
              showAll={true}
              selectedQuarter={selectedQuarter}
              filters={filters}
              onCreateAction={() => setShowForm(true)}
            />
          </Card>
        ) : (
          <Card className="p-6">
            <GanttTimeline
              keyResultId={
                keyResultFilter && keyResultFilter !== "all"
                  ? parseInt(keyResultFilter)
                  : undefined
              }
              selectedQuarter={selectedQuarter}
              filters={filters}
              onCreateAction={() => setShowForm(true)}
            />
          </Card>
        )}
      </div>

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
