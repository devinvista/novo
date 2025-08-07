import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Target, RotateCcw, Grid3X3, List, ArrowLeft, Settings } from "lucide-react";
import Sidebar from "@/components/sidebar";
import CompactHeader from "@/components/compact-header";
import CheckpointProgressGrid from "@/components/checkpoint-progress-grid";
import CheckpointTimelineHeader from "@/components/checkpoint-timeline-header";
import NextCheckpointsOverview from "@/components/next-checkpoints-overview";
import CheckpointUpdateDialog from "@/components/checkpoint-update-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ViewMode = 'circles' | 'simple';

export default function Checkpoints() {
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('circles');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
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
    setSelectedCheckpoint(checkpoint);
    setIsUpdateDialogOpen(true);
  };

  const handleRegenerateCheckpoints = () => {
    if (selectedKeyResultId) {
      createCheckpointsMutation.mutate(selectedKeyResultId);
    }
  };

  const handleSelectKeyResult = (keyResultId: number) => {
    if (keyResultId === -1) {
      setSelectedKeyResultId(undefined); // Show all
    } else {
      setSelectedKeyResultId(keyResultId);
    }
  };

  const handleBackToOverview = () => {
    setSelectedKeyResultId(undefined);
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
  const selectedCheckpoints = selectedKeyResultId 
    ? checkpoints?.filter((cp: any) => cp.keyResultId === selectedKeyResultId) || []
    : checkpoints || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={false} />
        
        <div className="flex-1 overflow-y-auto p-6 pt-16 bg-gray-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {selectedKeyResultId ? "Timeline de Checkpoints" : "Checkpoints"}
                </h1>
                <p className="text-gray-600 mt-1">
                  {selectedKeyResultId 
                    ? `Acompanhe o progresso detalhado do resultado-chave` 
                    : "Monitore seus próximos checkpoints e prazos"
                  }
                </p>
              </div>
              
              {selectedKeyResultId && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBackToOverview}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <div className="flex bg-white rounded-lg border p-1">
                    <Button
                      variant={viewMode === 'circles' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('circles')}
                      className="h-8 px-3"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'simple' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('simple')}
                      className="h-8 px-3"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!selectedKeyResultId ? (
              /* Overview Mode - Show next/overdue checkpoints */
              <>
                {/* Filter Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Filtros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Select 
                          value="overview" 
                          onValueChange={(value) => {
                            if (value !== "overview") {
                              setSelectedKeyResultId(parseInt(value));
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Visão Geral - Próximos & Atrasados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overview">Visão Geral - Próximos & Atrasados</SelectItem>
                            <SelectItem disabled className="text-xs font-medium text-gray-500 py-2">
                              ── Key Results Específicos ──
                            </SelectItem>
                            {keyResults?.map((kr: any) => (
                              <SelectItem key={kr.id} value={kr.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Target className="h-3 w-3" />
                                  {kr.title}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {checkpoints && checkpoints.length > 0 && (
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {checkpoints.length} checkpoints
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Next Checkpoints Overview */}
                <NextCheckpointsOverview
                  checkpoints={checkpoints || []}
                  keyResults={keyResults || []}
                  onCheckpointClick={handleCheckpointClick}
                  onSelectKeyResult={handleSelectKeyResult}
                />
              </>
            ) : (
              /* Detail Mode - Show specific key result timeline */
              <>
                {/* Timeline Header */}
                <CheckpointTimelineHeader
                  keyResult={selectedKeyResult}
                  checkpoints={selectedCheckpoints}
                  onCheckpointClick={handleCheckpointClick}
                />

                {/* Controls */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-sm">
                          {selectedCheckpoints.length} checkpoints
                        </Badge>
                        <Badge variant="secondary">
                          {selectedCheckpoints.filter((cp: any) => cp.status === 'completed').length} concluídos
                        </Badge>
                      </div>
                      
                      <Button 
                        onClick={handleRegenerateCheckpoints}
                        variant="outline"
                        size="sm"
                        disabled={createCheckpointsMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {createCheckpointsMutation.isPending ? "Recriando..." : "Recriar Checkpoints"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Checkpoints Display */}
                {viewMode === 'circles' ? (
                  <CheckpointProgressGrid
                    checkpoints={selectedCheckpoints}
                    onCheckpointClick={handleCheckpointClick}
                    onRegenerateCheckpoints={handleRegenerateCheckpoints}
                    keyResultTitle={selectedKeyResult?.title}
                  />
                ) : (
                  /* Simple List View */
                  <Card>
                    <CardHeader>
                      <CardTitle>Lista de Checkpoints</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedCheckpoints.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Nenhum checkpoint encontrado</p>
                          </div>
                        ) : (
                          selectedCheckpoints.map((checkpoint: any) => (
                            <div
                              key={checkpoint.id}
                              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => handleCheckpointClick(checkpoint)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">{checkpoint.title}</h4>
                                  <p className="text-sm text-gray-600">{checkpoint.period}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    {checkpoint.actualValue || 0} / {checkpoint.targetValue}
                                  </div>
                                  <Badge 
                                    variant={checkpoint.status === 'completed' ? 'default' : 'secondary'}
                                    className="mt-1"
                                  >
                                    {checkpoint.status === 'completed' ? 'Concluído' : 'Pendente'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Update Dialog */}
      <CheckpointUpdateDialog
        checkpoint={selectedCheckpoint}
        isOpen={isUpdateDialogOpen}
        onClose={() => {
          setIsUpdateDialogOpen(false);
          setSelectedCheckpoint(null);
        }}
      />
    </div>
  );
}