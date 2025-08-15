import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CheckCircle, Circle, Clock, AlertCircle, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ActionForm from "./action-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ActionTimelineProps {
  keyResultId?: number;
  showAll?: boolean;
  selectedQuarter?: string;
  filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  };
  onCreateAction?: () => void;
}

export default function ActionTimeline({ keyResultId, showAll = false, selectedQuarter, filters, onCreateAction }: ActionTimelineProps) {
  const [editingAction, setEditingAction] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteActionId, setDeleteActionId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteActionMutation = useMutation({
    mutationFn: (actionId: number) => apiRequest("DELETE", `/api/actions/${actionId}`),
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Ação deletada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      setDeleteActionId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar ação",
        variant: "destructive",
      });
    },
  });

  const { data: actions, isLoading, error: actionsError } = useQuery({
    queryKey: ["/api/actions", keyResultId, selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      try {
        if (selectedQuarter && selectedQuarter !== "all") {
          const params = new URLSearchParams();
          if (filters?.regionId) params.append('regionId', filters.regionId.toString());
          if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
          if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
          
          const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ''}`;
          const response = await fetch(url, { credentials: "include" });
          if (!response.ok) throw new Error("Erro ao carregar ações trimestrais");
          const data = await response.json();
          let actions = Array.isArray(data.actions) ? data.actions : [];
          
          // Filter by keyResultId if specified
          if (keyResultId) {
            actions = actions.filter((action: any) => action.keyResult?.id === keyResultId);
          }
          
          return actions;
        } else {
          const params = new URLSearchParams();
          if (keyResultId) params.append('keyResultId', keyResultId.toString());
          if (filters?.regionId) params.append('regionId', filters.regionId.toString());
          if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
          if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
          
          const url = `/api/actions${params.toString() ? `?${params}` : ''}`;
          const response = await fetch(url, { credentials: "include" });
          if (!response.ok) throw new Error("Erro ao carregar ações");
          const result = await response.json();
          return Array.isArray(result) ? result : [];
        }
      } catch (error) {
        console.error('Error fetching actions:', error);
        return [];
      }
    },
    staleTime: 0,
  });

  // Force invalidation when filters change
  useEffect(() => {
    console.log('🔄 ActionTimeline: Filters changed, invalidating queries:', filters);
    queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
  }, [filters, queryClient]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "cancelled":
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityVariant = (priority: string): "error" | "warning" | "secondary" => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getStatusVariant = (status: string): "success" | "info" | "secondary" => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "info";
      default:
        return "secondary";
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const sortedActions = Array.isArray(actions) ? actions.sort((a: any, b: any) => {
    // Prioridade: alta > média > baixa
    const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    // Depois por data de vencimento
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  }) : [];

  const displayActions = showAll ? sortedActions : sortedActions?.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma ação cadastrada</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            if (onCreateAction) {
              onCreateAction();
            } else {
              setEditingAction(null);
              setShowForm(true);
            }
          }}
        >
          Criar primeira ação
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {displayActions?.map((action: any, index: number) => {
          const daysUntilDue = action.dueDate ? getDaysUntilDue(action.dueDate) : null;
          const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && action.status !== "completed";

          return (
            <Card
              key={action.id || `action-${index}`}
              className={`p-4 hover:shadow-md transition-shadow ${
                isOverdue ? "border-red-300 bg-red-50" : ""
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">{getStatusIcon(action.status)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{action.title}</h4>
                      {action.description && (
                        <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {action.keyResult && action.keyResult.title ? (
                          <span className="text-xs text-gray-500">
                            KR: {action.keyResult.title}
                          </span>
                        ) : action.keyResultTitle ? (
                          <span className="text-xs text-gray-500">
                            KR: {action.keyResultTitle}
                          </span>
                        ) : (
                          <span className="text-xs text-red-500">
                            ⚠️ Resultado-chave não vinculado
                          </span>
                        )}
                        {action.serviceLine && (
                          <span className="text-xs text-blue-600">
                            📋 {action.serviceLine.name}
                          </span>
                        )}
                        {action.service && (
                          <span className="text-xs text-green-600">
                            🔧 {action.service.name}
                          </span>
                        )}
                        {action.responsible && (
                          <span className="text-xs text-gray-500">
                            Responsável: {action.responsible.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityVariant(action.priority)}>
                          {action.priority === "high" ? "Alta" : 
                           action.priority === "medium" ? "Média" : "Baixa"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingAction(action);
                                setShowForm(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteActionId(action.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Badge variant={getStatusVariant(action.status)}>
                        {action.status === "completed" ? "Concluída" :
                         action.status === "in_progress" ? "Em Progresso" :
                         action.status === "cancelled" ? "Cancelada" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                  {action.dueDate && (
                    <div className="mt-2 flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                        {isOverdue ? (
                          `Atrasada por ${Math.abs(daysUntilDue)} dias`
                        ) : daysUntilDue === 0 ? (
                          "Vence hoje"
                        ) : daysUntilDue === 1 ? (
                          "Vence amanhã"
                        ) : (
                          `Vence em ${daysUntilDue} dias`
                        )}
                        {" - "}
                        {format(new Date(action.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        
        {!showAll && sortedActions?.length > 5 && (
          <div className="text-center pt-2">
            <span className="text-sm text-gray-500">
              +{sortedActions.length - 5} ações adicionais
            </span>
          </div>
        )}
      </div>

      <ActionForm
        action={editingAction}
        onSuccess={() => {
          setShowForm(false);
          setEditingAction(null);
        }}
        open={showForm}
        onOpenChange={setShowForm}
        defaultKeyResultId={keyResultId}
      />

      <AlertDialog open={deleteActionId !== null} onOpenChange={() => setDeleteActionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta ação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteActionId && deleteActionMutation.mutate(deleteActionId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}