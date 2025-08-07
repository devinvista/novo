import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, RotateCcw } from "lucide-react";
import Sidebar from "@/components/sidebar";
import CompactHeader from "@/components/compact-header";
import CheckpointProgressGrid from "@/components/checkpoint-progress-grid";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Checkpoints() {
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | undefined>(undefined);
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Read kr parameter from URL and set filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const krParam = urlParams.get('kr');
    if (krParam) {
      setSelectedKeyResultId(parseInt(krParam));
    }
  }, [location]);

  const { data: keyResults, isLoading: keyResultsLoading } = useQuery({
    queryKey: ["/api/key-results"],
    queryFn: () => {
      return fetch("/api/key-results", { credentials: "include" }).then(r => r.json()).then(data =>
        Array.isArray(data) ? data : []
      ).catch(() => []);
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: checkpoints, isLoading: checkpointsLoading } = useQuery({
    queryKey: ["/api/checkpoints", selectedKeyResultId],
    queryFn: () => {
      const url = selectedKeyResultId 
        ? `/api/checkpoints?keyResultId=${selectedKeyResultId}` 
        : "/api/checkpoints";
      return fetch(url, { credentials: "include" }).then(r => r.json()).then(data =>
        Array.isArray(data) ? data : []
      ).catch(() => []);
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const createCheckpointsMutation = useMutation({
    mutationFn: async (keyResultId: number) => {
      return apiRequest("POST", `/api/key-results/${keyResultId}/recreate-checkpoints`);
    },
    onSuccess: () => {
      toast({
        title: "Checkpoints criados",
        description: "Os checkpoints foram criados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar checkpoints.",
        variant: "destructive",
      });
    },
  });

  const handleCheckpointClick = (checkpoint: any) => {
    console.log("Checkpoint clicked:", checkpoint);
    // Implementar modal ou página de detalhes do checkpoint
  };

  const handleRegenerateCheckpoints = () => {
    if (selectedKeyResultId) {
      createCheckpointsMutation.mutate(selectedKeyResultId);
    }
  };

  if (keyResultsLoading || checkpointsLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <CompactHeader showFilters={false} />
          
          <div className="flex-1 overflow-y-auto p-6 pt-16">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const selectedKeyResult = keyResults?.find((kr: any) => kr.id === selectedKeyResultId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={false} />
        
        <div className="flex-1 overflow-y-auto p-6 pt-16">
          <div className="space-y-6">
            {/* Key Result Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Checkpoints de Progresso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center">
                  <Select 
                    value={selectedKeyResultId?.toString() || "all"} 
                    onValueChange={(value) => setSelectedKeyResultId(value === "all" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Selecione um Key Result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Key Results</SelectItem>
                      {keyResults?.map((kr: any) => (
                        <SelectItem key={kr.id} value={kr.id.toString()}>
                          {kr.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedKeyResultId && (
                    <Button 
                      onClick={handleRegenerateCheckpoints}
                      variant="outline"
                      disabled={createCheckpointsMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {createCheckpointsMutation.isPending ? "Criando..." : "Recriar Checkpoints"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Checkpoints Grid */}
            <CheckpointProgressGrid
              checkpoints={checkpoints || []}
              onCheckpointClick={handleCheckpointClick}
              onRegenerateCheckpoints={selectedKeyResultId ? handleRegenerateCheckpoints : undefined}
              keyResultTitle={selectedKeyResult?.title}
            />
          </div>
        </div>
      </main>
    </div>
  );
}