import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import CheckpointUpdaterEnhanced from "@/components/checkpoint-updater-enhanced";
import { NextCheckpointsOverview } from "@/components/next-checkpoints-overview";
import { Target, Filter } from "lucide-react";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";

export default function Checkpoints() {
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | undefined>(undefined);
  const { selectedQuarter } = useQuarterlyFilter();

  const { data: keyResults, isLoading: isLoadingKeyResults } = useQuery({
    queryKey: ["/api/key-results", selectedQuarter],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const response = await fetch(`/api/quarters/${selectedQuarter}/data`, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar resultados-chave trimestrais");
        const data = await response.json();
        return data.keyResults || [];
      } else {
        const response = await fetch("/api/key-results", { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
        return response.json();
      }
    },
  });

  const { data: checkpoints, isLoading: isLoadingCheckpoints } = useQuery({
    queryKey: ["/api/checkpoints", selectedKeyResultId, selectedQuarter],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const response = await fetch(`/api/quarters/${selectedQuarter}/data`, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar checkpoints trimestrais");
        const data = await response.json();
        const quarterlyCheckpoints = data.checkpoints || [];
        return selectedKeyResultId 
          ? quarterlyCheckpoints.filter((cp: any) => cp.keyResultId === selectedKeyResultId)
          : quarterlyCheckpoints;
      } else {
        const url = selectedKeyResultId ? `/api/checkpoints?keyResultId=${selectedKeyResultId}` : "/api/checkpoints";
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar checkpoints");
        return response.json();
      }
    },
  });

  const totalCheckpoints = checkpoints?.length || 0;
  const completedCheckpoints = checkpoints?.filter((cp: any) => cp.status === "completed").length || 0;
  const atRiskCheckpoints = checkpoints?.filter((cp: any) => ["at_risk", "behind"].includes(cp.status)).length || 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Checkpoints" 
          description="Atualize e acompanhe o progresso dos resultados-chave"
        />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview of Next Checkpoints - only shown when no specific key result is selected */}
          {!selectedKeyResultId && (
            <NextCheckpointsOverview />
          )}

          {/* Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Filtre os checkpoints por resultado-chave
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Select 
                    value={selectedKeyResultId?.toString() || "all"} 
                    onValueChange={(value) => setSelectedKeyResultId(value === "all" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um resultado-chave" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os resultados-chave</SelectItem>
                      {keyResults?.map((kr: any) => (
                        <SelectItem key={kr.id} value={kr.id.toString()}>
                          {kr.title} ({kr.frequency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {totalCheckpoints} checkpoint{totalCheckpoints !== 1 ? 's' : ''}
                  </Badge>
                  {completedCheckpoints > 0 && (
                    <Badge className="bg-green-100 text-green-800">
                      {completedCheckpoints} concluído{completedCheckpoints !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {atRiskCheckpoints > 0 && (
                    <Badge className="bg-red-100 text-red-800">
                      {atRiskCheckpoints} em risco
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checkpoints Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Checkpoints
                {selectedKeyResultId && (
                  <Badge variant="secondary">
                    {keyResults?.find((kr: any) => kr.id === selectedKeyResultId)?.title}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedKeyResultId 
                  ? "Acompanhe o progresso dos checkpoints do resultado-chave selecionado"
                  : "Acompanhe o progresso de todos os checkpoints"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingKeyResults || isLoadingCheckpoints ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-muted-foreground">Carregando checkpoints...</div>
                </div>
              ) : (
                <CheckpointUpdaterEnhanced keyResultId={selectedKeyResultId} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}