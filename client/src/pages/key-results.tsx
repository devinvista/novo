import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Edit, Activity, Calendar, Trash2, MoreHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import KeyResultForm from "@/components/key-result-form-simple";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function KeyResults() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedKeyResult, setSelectedKeyResult] = useState<any>(null);
  const [, setLocation] = useLocation();
  const { selectedQuarter } = useQuarterlyFilter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if user can manage key results
  const canManageKeyResults = user?.role === "admin" || user?.role === "gestor";

  // Delete mutation for key results
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/key-results/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      toast({
        title: "Resultado-chave excluído",
        description: "O resultado-chave foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir resultado-chave.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteKeyResult = (id: number) => {
    deleteMutation.mutate(id);
  };
  
  const { data: keyResults, isLoading, error } = useQuery({
    queryKey: ["/api/key-results", selectedQuarter],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const response = await fetch(`/api/quarters/${selectedQuarter}/data`, { credentials: "include" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Erro ao carregar resultados-chave trimestrais");
        }
        const data = await response.json();
        return data.keyResults || [];
      } else {
        const response = await fetch("/api/key-results", { credentials: "include" });
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

  // Fetch actions and checkpoints counts for each key result
  const { data: actionsCounts } = useQuery({
    queryKey: ["/api/actions-counts", keyResults?.map((kr: any) => kr.id)],
    queryFn: async () => {
      if (!keyResults || keyResults.length === 0) return {};
      
      const counts: Record<number, number> = {};
      
      // Fetch actions count for each key result
      await Promise.all(
        keyResults.map(async (kr: any) => {
          try {
            const response = await fetch(`/api/actions?keyResultId=${kr.id}`, { credentials: "include" });
            if (response.ok) {
              const actions = await response.json();
              counts[kr.id] = Array.isArray(actions) ? actions.length : 0;
            } else {
              counts[kr.id] = 0;
            }
          } catch {
            counts[kr.id] = 0;
          }
        })
      );
      
      return counts;
    },
    enabled: !!keyResults && keyResults.length > 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Fetch checkpoints counts and status for each key result
  const { data: checkpointsCounts } = useQuery({
    queryKey: ["/api/checkpoints-counts", keyResults?.map((kr: any) => kr.id)],
    queryFn: async () => {
      if (!keyResults || keyResults.length === 0) return {};
      
      const counts: Record<number, { completed: number; total: number }> = {};
      
      // Fetch checkpoints data for each key result
      await Promise.all(
        keyResults.map(async (kr: any) => {
          try {
            const response = await fetch(`/api/checkpoints?keyResultId=${kr.id}`, { credentials: "include" });
            if (response.ok) {
              const checkpoints = await response.json();
              if (Array.isArray(checkpoints)) {
                const completed = checkpoints.filter((cp: any) => cp.status === "completed").length;
                counts[kr.id] = { completed, total: checkpoints.length };
              } else {
                counts[kr.id] = { completed: 0, total: 0 };
              }
            } else {
              counts[kr.id] = { completed: 0, total: 0 };
            }
          } catch {
            counts[kr.id] = { completed: 0, total: 0 };
          }
        })
      );
      
      return counts;
    },
    enabled: !!keyResults && keyResults.length > 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const handleCreateKeyResult = () => {
    setSelectedKeyResult(null);
    setIsFormOpen(true);
  };

  const handleEditKeyResult = (keyResult: any) => {
    setSelectedKeyResult(keyResult);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedKeyResult(null);
  };

  const getStatusColor = (progress: number) => {
    if (progress >= 70) return "bg-secondary";
    if (progress >= 40) return "bg-accent";
    return "bg-destructive";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: "Pendente", variant: "secondary" as const };
      case 'active':
        return { label: "Em andamento", variant: "default" as const };
      case 'completed':
        return { label: "Concluído", variant: "default" as const };
      case 'delayed':
        return { label: "Atrasado", variant: "destructive" as const };
      case 'cancelled':
        return { label: "Cancelado", variant: "destructive" as const };
      default:
        return { label: "Em andamento", variant: "default" as const };
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Resultados-Chave" 
          description={canManageKeyResults ? "Gerencie os KRs vinculados aos objetivos" : "Visualize os KRs vinculados aos objetivos"}
          action={
            canManageKeyResults ? (
              <Button onClick={handleCreateKeyResult}>
                <Plus className="mr-2 h-4 w-4" />
                Novo KR
              </Button>
            ) : undefined
          }
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid gap-6">
              {[1, 2, 3, 4].map((i) => (
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
            <div className="grid gap-6">
              {keyResults && keyResults.length > 0 ? keyResults.map((kr: any, index: number) => {
                const progress = typeof kr.progress === 'number' ? kr.progress : (parseFloat((kr.progress || '0').toString().replace(',', '.')) || 0);
                console.log(`🔍 KR "${kr.title}" - progress field:`, kr.progress, 'type:', typeof kr.progress, 'parsed:', progress);
                const statusBadge = getStatusBadge(kr.status || 'active');
                
                return (
                  <Card key={kr.id || `kr-${index}`} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {kr.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Objetivo: {kr.objective?.title || 'Sem objetivo associado'}
                          </p>
                          {kr.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {kr.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                          {canManageKeyResults && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditKeyResult(kr)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar KR
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Deletar KR
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja deletar o resultado-chave "{kr.title}"? 
                                        Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteKeyResult(kr.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Deletar
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
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Valor Atual:</span>
                            <p className="font-medium">{kr.currentValue} {kr.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Meta:</span>
                            <p className="font-medium">{kr.targetValue} {kr.unit}</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progresso</span>
                            <span className="font-medium">{progress.toFixed(1).replace('.', ',')}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Frequência: {kr.frequency}</span>
                          {kr.strategicIndicator?.name && (
                            <span>Indicador: {kr.strategicIndicator.name}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 relative"
                            onClick={() => setLocation(`/actions?kr=${kr.id}`)}
                          >
                            <Activity className="h-4 w-4 mr-1" />
                            {(actionsCounts?.[kr.id] || 0) === 0 ? "Criar Ações" : "Ações"}
                            {(actionsCounts?.[kr.id] || 0) > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="ml-2 h-5 min-w-5 text-xs px-1.5 bg-blue-100 text-blue-800 hover:bg-blue-100"
                              >
                                {actionsCounts?.[kr.id] || 0}
                              </Badge>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 relative"
                            onClick={() => setLocation(`/checkpoints?kr=${kr.id}`)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Checkpoints
                            <Badge 
                              variant="secondary" 
                              className="ml-2 h-5 min-w-5 text-xs px-1.5 bg-green-100 text-green-800 hover:bg-green-100"
                            >
                              {checkpointsCounts?.[kr.id] 
                                ? `${checkpointsCounts[kr.id].completed}/${checkpointsCounts[kr.id].total}`
                                : "0/0"
                              }
                            </Badge>
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Período: {kr.startDate ? new Date(kr.startDate).toLocaleDateString('pt-BR') : 'N/A'} - {kr.endDate ? new Date(kr.endDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum resultado-chave encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crie objetivos primeiro e depois adicione resultados-chave a eles.
                  </p>
                  <Button className="mt-4" onClick={handleCreateKeyResult}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeiro KR
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <KeyResultForm 
        keyResult={selectedKeyResult}
        onSuccess={handleFormSuccess}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
