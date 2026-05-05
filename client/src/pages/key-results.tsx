import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, ClipboardCheck, Trash2, MoreHorizontal } from "lucide-react";
import { useLocation } from "wouter";

import KeyResultForm from "@/features/key-results/key-result-form-simple";
import KrProgressChart from "@/features/key-results/kr-progress-chart-lazy";
import KrCheckInDialog from "@/features/key-results/kr-check-in-dialog";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useAuth } from "@/hooks/use-auth";
import { useFilters } from "@/hooks/use-filters";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { translateFrequency } from "@/lib/frequency-translations";
import { formatDateBR, parseDecimalBR } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { KeyResult } from "@shared/schema";

type KeyResultWithRelations = KeyResult & {
  objective?: { id: number; title: string } | null;
  serviceLine?: { id: number; name: string } | null;
};

export default function KeyResults() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedKeyResult, setSelectedKeyResult] = useState<any>(null);
  const [checkInKr, setCheckInKr] = useState<any>(null);
  const [, setLocation] = useLocation();
  const { selectedQuarter } = useQuarterlyFilter();
  const { filters } = useFilters();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManageKeyResults = user?.role === "admin" || user?.role === "gestor";

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/key-results/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      toast({ title: "Resultado-chave excluído", description: "O resultado-chave foi excluído com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao excluir resultado-chave.", variant: "destructive" });
    },
  });

  const { data: keyResults, isLoading, error } = useQuery<KeyResultWithRelations[]>({
    queryKey: ["/api/key-results", selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append("regionId", filters.regionId.toString());
        if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
        const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ""}`;
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Erro ao carregar resultados-chave trimestrais");
        }
        const data = await response.json();
        return data.keyResults || [];
      } else {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append("regionId", filters.regionId.toString());
        if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
        const url = `/api/key-results${params.toString() ? `?${params}` : ""}`;
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Erro ao carregar resultados-chave");
        }
        return response.json();
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: actionsCounts } = useQuery<Record<number, number>>({
    queryKey: ["/api/actions-counts", selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      if (!keyResults || keyResults.length === 0) return {};
      const params = new URLSearchParams();
      if (filters?.regionId) params.append("regionId", filters.regionId.toString());
      if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
      if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
      const response = await fetch(`/api/actions${params.toString() ? `?${params}` : ""}`, { credentials: "include" });
      if (!response.ok) return {};
      const actions = await response.json();
      const counts: Record<number, number> = {};
      if (Array.isArray(actions)) {
        actions.forEach((action: any) => {
          if (action.keyResultId) {
            counts[action.keyResultId] = (counts[action.keyResultId] || 0) + 1;
          }
        });
      }
      return counts;
    },
    enabled: !!keyResults && keyResults.length > 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return { label: "Pendente", variant: "secondary" as const };
      case "active": return { label: "Em andamento", variant: "default" as const };
      case "completed": return { label: "Concluído", variant: "default" as const };
      case "delayed": return { label: "Atrasado", variant: "destructive" as const };
      case "cancelled": return { label: "Cancelado", variant: "destructive" as const };
      default: return { label: "Em andamento", variant: "default" as const };
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resultados-Chave</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {canManageKeyResults ? "Gerencie os KRs vinculados aos objetivos" : "Visualize os KRs vinculados aos objetivos"}
            </p>
          </div>
          {canManageKeyResults && (
            <Button onClick={() => { setSelectedKeyResult(null); setIsFormOpen(true); }} data-testid="button-new-kr">
              <Plus className="mr-2 h-4 w-4" />
              Novo KR
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Erro ao carregar resultados-chave</p>
            <p className="text-sm text-red-500 mt-2">{error.message}</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-5xl">
            {keyResults && keyResults.length > 0 ? (
              keyResults.map((kr: any) => {
                const progress = typeof kr.progress === "number" ? kr.progress : parseDecimalBR(kr.progress || "0");
                const statusBadge = getStatusBadge(kr.status || "active");
                const actionsCount = actionsCounts?.[kr.id] || 0;

                return (
                  <Card key={kr.id} className="hover:shadow-md transition-shadow bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-snug">{kr.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {kr.objective?.title || "Sem objetivo associado"}
                          </p>
                          {kr.description && (
                            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{kr.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={statusBadge.variant} className="text-xs">
                            {statusBadge.label}
                          </Badge>
                          {canManageKeyResults && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-menu-kr-${kr.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedKeyResult(kr); setIsFormOpen(true); }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar KR
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir KR
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir "{kr.title}"? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMutation.mutate(kr.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Values row */}
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-0.5">Atual</p>
                          <p className="font-semibold text-gray-900 tabular-nums">
                            {kr.currentValue ?? "—"} <span className="text-gray-400 font-normal text-xs">{kr.unit}</span>
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-0.5">Meta</p>
                          <p className="font-semibold text-gray-900 tabular-nums">
                            {kr.targetValue ?? "—"} <span className="text-gray-400 font-normal text-xs">{kr.unit}</span>
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-0.5">Progresso</p>
                          <p className="font-semibold text-gray-900 tabular-nums">
                            {progress.toFixed(1).replace(".", ",")}%
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <Progress value={progress} className="h-2" />

                      {/* Meta info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{translateFrequency(kr.frequency || "")}</span>
                        <span>
                          {kr.startDate ? formatDateBR(kr.startDate) : "—"} →{" "}
                          {kr.endDate ? formatDateBR(kr.endDate) : "—"}
                        </span>
                      </div>

                      {/* Progress chart */}
                      <KrProgressChart keyResultId={kr.id} unit={kr.unit} targetValue={kr.targetValue} />

                      {/* Action buttons — simplified to 2 */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setLocation(`/actions?kr=${kr.id}`)}
                          data-testid={`button-actions-${kr.id}`}
                        >
                          {actionsCount === 0 ? "Criar Ações" : "Ações"}
                          {actionsCount > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs px-1.5 bg-blue-100 text-blue-800 hover:bg-blue-100">
                              {actionsCount}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => setLocation(`/checkpoints?kr=${kr.id}`)}
                          data-testid={`button-tracking-${kr.id}`}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-1.5" />
                          Acompanhar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border">
                <p className="text-muted-foreground">Nenhum resultado-chave encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie objetivos primeiro e depois adicione resultados-chave.
                </p>
                {canManageKeyResults && (
                  <Button className="mt-4" onClick={() => { setSelectedKeyResult(null); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeiro KR
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <KeyResultForm
        keyResult={selectedKeyResult}
        onSuccess={() => { setIsFormOpen(false); setSelectedKeyResult(null); }}
        open={isFormOpen}
        onOpenChange={(open) => { setIsFormOpen(open); if (!open) setSelectedKeyResult(null); }}
      />

      {checkInKr && (
        <KrCheckInDialog
          keyResult={checkInKr}
          open={!!checkInKr}
          onOpenChange={(open) => { if (!open) setCheckInKr(null); }}
        />
      )}
    </div>
  );
}
