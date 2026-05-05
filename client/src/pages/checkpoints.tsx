import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { formatDateBR } from "@/lib/formatters";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck,
  RotateCcw,
  Grid3X3,
  List,
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  PencilLine,
  Target,
  TrendingUp,
} from "lucide-react";
import { format, startOfWeek, isBefore, addDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

import CheckpointProgressGrid from "@/features/checkpoints/checkpoint-progress-grid";
import CheckpointTimelineHeader from "@/features/checkpoints/checkpoint-timeline-header";
import CheckpointUpdateDialog from "@/features/checkpoints/checkpoint-update-dialog";
import PlanVsActualChart from "@/features/checkpoints/plan-vs-actual-chart";
import KrCheckInDialog from "@/features/key-results/kr-check-in-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/hooks/use-filters";
import { useAuth } from "@/hooks/use-auth";
import type { KeyResult, Checkpoint, KrCheckIn } from "@shared/schema";

type ViewMode = "circles" | "simple";

export default function Checkpoints() {
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>("circles");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [checkInKr, setCheckInKr] = useState<any>(null);
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const krParam = urlParams.get("kr");
    if (krParam) {
      setSelectedKeyResultId(parseInt(krParam));
    }
  }, [location]);

  const { filters } = useFilters();

  const { data: keyResults, isLoading: keyResultsLoading } = useQuery<KeyResult[]>({
    queryKey: ["/api/key-results", JSON.stringify(filters)],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.regionId) params.append("regionId", filters.regionId.toString());
      if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
      if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
      const url = `/api/key-results${params.toString() ? `?${params}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Erro ao carregar resultados-chave");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: checkpoints, isLoading: checkpointsLoading } = useQuery<Checkpoint[]>({
    queryKey: ["/api/checkpoints", selectedKeyResultId, JSON.stringify(filters)],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedKeyResultId) params.append("keyResultId", selectedKeyResultId.toString());
      if (filters?.regionId) params.append("regionId", filters.regionId.toString());
      if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
      const url = `/api/checkpoints${params.toString() ? `?${params}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Erro ao carregar marcos");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: checkIns } = useQuery<KrCheckIn[]>({
    queryKey: ["/api/kr-check-ins"],
    queryFn: async () => {
      const res = await fetch("/api/kr-check-ins", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const checkedInKRIds = new Set(
    (checkIns ?? [])
      .filter((ci) => ci.weekStart === weekStart)
      .map((ci) => ci.keyResultId)
  );

  const activeKRs = (keyResults ?? []).filter((kr) => !kr.deletedAt && kr.status === "active");
  const krsNeedingCheckIn = activeKRs.filter((kr) => !checkedInKRIds.has(kr.id));
  const krsUpToDate = activeKRs.filter((kr) => checkedInKRIds.has(kr.id));

  const createCheckpointsMutation = useMutation({
    mutationFn: async (keyResultId: number) => {
      return apiRequest("POST", `/api/key-results/${keyResultId}/recreate-checkpoints`);
    },
    onSuccess: () => {
      toast({ title: "Marcos recriados", description: "Os marcos foram recriados com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao recriar marcos.", variant: "destructive" });
    },
  });

  const handleCheckpointClick = (checkpoint: any) => {
    setSelectedCheckpoint(checkpoint);
    setIsUpdateDialogOpen(true);
  };

  const handleRegenerateCheckpoints = () => {
    if (selectedKeyResultId) createCheckpointsMutation.mutate(selectedKeyResultId);
  };

  const handleSelectKeyResult = (kr: any) => {
    setSelectedKeyResultId(kr.id);
  };

  const handleBackToOverview = () => {
    setSelectedKeyResultId(undefined);
  };

  if (keyResultsLoading || checkpointsLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const selectedKeyResult = keyResults?.find((kr: any) => kr.id === selectedKeyResultId);
  const selectedCheckpoints = selectedKeyResultId
    ? checkpoints?.filter((cp: any) => cp.keyResultId === selectedKeyResultId) || []
    : checkpoints || [];

  const allCheckpoints = checkpoints || [];
  const now = new Date();
  const in7Days = addDays(now, 7);
  const overdueCheckpoints = allCheckpoints
    .filter((cp: any) => cp.status !== "completed" && isBefore(new Date(cp.dueDate), now))
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
  const upcomingCheckpoints = allCheckpoints
    .filter(
      (cp: any) =>
        cp.status !== "completed" &&
        isAfter(new Date(cp.dueDate), now) &&
        isBefore(new Date(cp.dueDate), in7Days)
    )
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "completed") return "default";
    if (status === "delayed") return "destructive";
    if (status === "in_progress") return "secondary";
    return "outline";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Concluído";
      case "delayed": return "Atrasado";
      case "in_progress": return "Em andamento";
      default: return "Pendente";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedKeyResultId && (
                <Button variant="ghost" size="sm" onClick={handleBackToOverview} className="mr-1">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedKeyResultId ? selectedKeyResult?.title ?? "Acompanhamento" : "Acompanhamento"}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedKeyResultId
                    ? "Check-ins e marcos de progresso do resultado-chave"
                    : "Registre check-ins semanais e acompanhe os marcos de cada KR"}
                </p>
              </div>
            </div>

            {selectedKeyResultId && (
              <div className="flex gap-2">
                <div className="flex bg-white rounded-lg border p-1">
                  <Button
                    variant={viewMode === "circles" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("circles")}
                    className="h-8 px-3"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "simple" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("simple")}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!selectedKeyResultId ? (
            /* ───────────── OVERVIEW MODE ───────────── */
            <>
              {/* Check-ins desta semana */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Check-ins desta semana
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {krsUpToDate.length}/{activeKRs.length} em dia
                  </Badge>
                </div>

                {activeKRs.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-gray-400">
                      <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhum resultado-chave ativo encontrado.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {krsNeedingCheckIn.map((kr: any) => (
                      <button
                        key={kr.id}
                        type="button"
                        data-testid={`card-kr-checkin-needed-${kr.id}`}
                        onClick={() => setCheckInKr(kr)}
                        className="text-left bg-white border-2 border-amber-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Aguardando check-in</p>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{kr.title}</h3>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, parseFloat(kr.progress ?? "0"))}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 tabular-nums">
                                {Math.round(parseFloat(kr.progress ?? "0"))}%
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                            <PencilLine className="h-4 w-4 text-amber-600" />
                          </div>
                        </div>
                      </button>
                    ))}

                    {krsUpToDate.map((kr: any) => (
                      <button
                        key={kr.id}
                        type="button"
                        data-testid={`card-kr-checkin-done-${kr.id}`}
                        onClick={() => handleSelectKeyResult(kr)}
                        className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all group opacity-80"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Check-in feito</p>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-700 line-clamp-2 mb-2">{kr.title}</h3>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, parseFloat(kr.progress ?? "0"))}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 tabular-nums">
                                {Math.round(parseFloat(kr.progress ?? "0"))}%
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Marcos atrasados */}
              {overdueCheckpoints.length > 0 && (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700 uppercase tracking-wide">
                    <AlertTriangle className="h-4 w-4" />
                    Marcos atrasados
                    <Badge variant="destructive" className="ml-1 text-xs">{overdueCheckpoints.length}</Badge>
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {overdueCheckpoints.map((cp: any) => {
                      const kr = keyResults?.find((k) => k.id === cp.keyResultId);
                      return (
                        <button
                          key={cp.id}
                          type="button"
                          data-testid={`card-overdue-cp-${cp.id}`}
                          onClick={() => handleCheckpointClick(cp)}
                          className="text-left bg-red-50 border border-red-200 rounded-xl p-4 hover:border-red-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">{cp.title}</h4>
                              {kr && <p className="text-xs text-gray-500 truncate mt-0.5">{kr.title}</p>}
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-600">
                                  Venceu em {formatDateBR(cp.dueDate)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs text-gray-400">Meta</div>
                              <div className="text-sm font-semibold tabular-nums text-gray-700">{cp.targetValue}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Marcos próximos */}
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  <Clock className="h-4 w-4" />
                  Marcos nos próximos 7 dias
                </h2>
                {upcomingCheckpoints.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-400">
                      <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhum marco com vencimento nos próximos 7 dias.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {upcomingCheckpoints.map((cp: any) => {
                      const kr = keyResults?.find((k) => k.id === cp.keyResultId);
                      const daysUntilDue = Math.ceil(
                        (new Date(cp.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <button
                          key={cp.id}
                          type="button"
                          data-testid={`card-upcoming-cp-${cp.id}`}
                          onClick={() => handleCheckpointClick(cp)}
                          className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">{cp.title}</h4>
                              {kr && <p className="text-xs text-gray-500 truncate mt-0.5">{kr.title}</p>}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge
                                  variant={daysUntilDue <= 1 ? "destructive" : daysUntilDue <= 3 ? "secondary" : "outline"}
                                  className="text-[10px]"
                                >
                                  {daysUntilDue <= 0 ? "Hoje" : `${daysUntilDue}d`}
                                </Badge>
                                <span className="text-xs text-gray-400">{formatDateBR(cp.dueDate)}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs text-gray-400">Meta</div>
                              <div className="text-sm font-semibold tabular-nums text-gray-700">{cp.targetValue}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* All KRs quick access */}
              {keyResults && keyResults.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Ver por resultado-chave
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {keyResults.filter((kr) => !kr.deletedAt).map((kr: any) => {
                      const cpCounts = (checkpoints || []).filter((cp: any) => cp.keyResultId === kr.id);
                      const completedCount = cpCounts.filter((cp: any) => cp.status === "completed").length;
                      return (
                        <button
                          key={kr.id}
                          type="button"
                          data-testid={`card-kr-detail-${kr.id}`}
                          onClick={() => handleSelectKeyResult(kr)}
                          className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{kr.title}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {completedCount}/{cpCounts.length} marcos concluídos
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ───────────── DETAIL MODE ───────────── */
            <>
              <CheckpointTimelineHeader
                keyResult={selectedKeyResult}
                checkpoints={selectedCheckpoints}
                onCheckpointClick={handleCheckpointClick}
              />

              <Tabs defaultValue="checkins">
                <TabsList className="bg-white border">
                  <TabsTrigger value="checkins" className="gap-2">
                    <PencilLine className="h-4 w-4" />
                    Check-in semanal
                  </TabsTrigger>
                  <TabsTrigger value="marcos" className="gap-2">
                    <Target className="h-4 w-4" />
                    Marcos
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {selectedCheckpoints.filter((cp: any) => cp.status === "completed").length}/
                      {selectedCheckpoints.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="checkins" className="mt-4">
                  {selectedKeyResult && (
                    <div className="bg-white border rounded-xl p-6 max-w-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Registrar check-in</h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Atualize o progresso desta semana para {selectedKeyResult.title}
                          </p>
                        </div>
                        <Button
                          onClick={() => setCheckInKr(selectedKeyResult)}
                          data-testid={`button-checkin-detail-${selectedKeyResult.id}`}
                        >
                          <PencilLine className="h-4 w-4 mr-2" />
                          Fazer check-in
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                        <div>
                          <span className="text-gray-400">Atual</span>
                          <p className="font-semibold text-gray-900 tabular-nums">
                            {selectedKeyResult.currentValue ?? "—"} {selectedKeyResult.unit}
                          </p>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div>
                          <span className="text-gray-400">Meta</span>
                          <p className="font-semibold text-gray-900 tabular-nums">
                            {selectedKeyResult.targetValue ?? "—"} {selectedKeyResult.unit}
                          </p>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div>
                          <span className="text-gray-400">Progresso</span>
                          <p className="font-semibold text-gray-900 tabular-nums">
                            {Math.round(parseFloat((selectedKeyResult as any).progress ?? "0"))}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="marcos" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        {selectedCheckpoints.length} marcos
                      </Badge>
                      <Badge variant="secondary">
                        {selectedCheckpoints.filter((cp: any) => cp.status === "completed").length} concluídos
                      </Badge>
                    </div>
                    <Button
                      onClick={handleRegenerateCheckpoints}
                      variant="outline"
                      size="sm"
                      disabled={createCheckpointsMutation.isPending}
                      data-testid="button-regenerate-checkpoints"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {createCheckpointsMutation.isPending ? "Recriando..." : "Recriar marcos"}
                    </Button>
                  </div>

                  <PlanVsActualChart
                    checkpoints={selectedCheckpoints}
                    unit={(selectedKeyResult as any)?.unit}
                  />

                  {viewMode === "circles" ? (
                    <CheckpointProgressGrid
                      checkpoints={selectedCheckpoints}
                      onCheckpointClick={handleCheckpointClick}
                      onRegenerateCheckpoints={handleRegenerateCheckpoints}
                      keyResultTitle={selectedKeyResult?.title}
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Lista de marcos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedCheckpoints.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                              <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                              <p className="text-sm">Nenhum marco encontrado</p>
                            </div>
                          ) : (
                            selectedCheckpoints.map((checkpoint: any) => (
                              <button
                                key={checkpoint.id}
                                type="button"
                                className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                onClick={() => handleCheckpointClick(checkpoint)}
                                data-testid={`row-checkpoint-${checkpoint.id}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-gray-900">{checkpoint.title}</h4>
                                    <p className="text-sm text-gray-500">{formatDateBR(checkpoint.period)}</p>
                                  </div>
                                  <div className="text-right flex items-center gap-4">
                                    <div>
                                      <div className="text-xs text-gray-400">Plano / Realizado</div>
                                      <div className="text-sm font-semibold tabular-nums text-gray-900">
                                        {checkpoint.targetValue} / {checkpoint.reportedValue ?? checkpoint.actualValue ?? "—"}
                                      </div>
                                    </div>
                                    <Badge variant={getStatusVariant(checkpoint.status)}>
                                      {getStatusLabel(checkpoint.status)}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Update Dialog (admin) */}
      <CheckpointUpdateDialog
        checkpoint={selectedCheckpoint}
        isOpen={isUpdateDialogOpen}
        onClose={() => {
          setIsUpdateDialogOpen(false);
          setSelectedCheckpoint(null);
        }}
      />

      {/* Check-in Dialog */}
      {checkInKr && (
        <KrCheckInDialog
          keyResult={checkInKr}
          open={!!checkInKr}
          onOpenChange={(open) => {
            if (!open) setCheckInKr(null);
          }}
        />
      )}
    </div>
  );
}
