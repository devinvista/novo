import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertActionSchema, type InsertAction, type ActionComment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageSquare, Calendar, User } from "lucide-react";
import { z } from "zod";
import { formatDateBR } from "@/lib/formatters";

// Use the proper insert schema directly
const actionFormSchema = insertActionSchema;

type ActionFormData = z.infer<typeof actionFormSchema>;

interface ActionFormProps {
  action?: any;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKeyResultId?: number;
}

export default function ActionForm({ action, onSuccess, open, onOpenChange, defaultKeyResultId }: ActionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results"],
    queryFn: async () => {
      const response = await fetch("/api/key-results");
      if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
      return response.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Erro ao carregar usuários");
      return response.json();
    },
  });

  const { data: serviceLines } = useQuery({
    queryKey: ["/api/service-lines"],
    queryFn: async () => {
      const response = await fetch("/api/service-lines");
      if (!response.ok) throw new Error("Erro ao carregar linhas de serviço");
      return response.json();
    },
  });

  const { data: services } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Erro ao carregar serviços");
      return response.json();
    },
  });

  // Fetch comments for the action if editing
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["/api/actions", action?.id?.toString() || "none", "comments"],
    queryFn: async () => {
      if (!action?.id) return [];
      const response = await fetch(`/api/actions/${action.id}/comments`);
      if (!response.ok) throw new Error("Erro ao carregar comentários");
      return response.json();
    },
    enabled: !!action?.id && open,
  });



  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      keyResultId: action?.keyResultId || 0,
      title: action?.title || "",
      description: action?.description || "",
      priority: action?.priority || "medium",
      status: action?.status || "pending",
      serviceLineId: action?.serviceLineId || null,
      serviceId: action?.serviceId || null,
      responsibleId: action?.responsibleId || null,
      dueDate: action?.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : "",
    },
  });

  // Reset form when action changes
  useEffect(() => {
    if (action) {
      form.reset({
        keyResultId: action.keyResultId,
        title: action.title || "",
        description: action.description || "",
        priority: action.priority || "medium",
        status: action.status || "pending",
        serviceLineId: action.serviceLineId || null,
        serviceId: action.serviceId || null,
        responsibleId: action.responsibleId || null,
        dueDate: action.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : "",
      });
    } else {
      form.reset({
        keyResultId: defaultKeyResultId || 0,
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        serviceLineId: null,
        serviceId: null,
        responsibleId: null,
        dueDate: "",
      });
    }
  }, [action, form]);

  // Watch for key result changes to filter service lines/services  
  const selectedKeyResultId = form.watch("keyResultId");
  const selectedServiceLineId = form.watch("serviceLineId");

  // Get the selected key result to check its service constraints
  const selectedKeyResult = keyResults?.find((kr: any) => kr.id === selectedKeyResultId);
  
  // Debug log for selected key result (can be removed in production)
  // console.log('🔍 Action Form - Selected KR:', selectedKeyResult);
  
  // Filter service lines based on key result constraints
  const availableServiceLines = serviceLines?.filter((sl: any) => {
    if (!selectedKeyResult) return true; // If no KR selected, show all
    
    // Parse serviceLineIds if it's a string
    let serviceLineIds = selectedKeyResult.serviceLineIds;
    if (typeof serviceLineIds === 'string') {
      try {
        serviceLineIds = JSON.parse(serviceLineIds);
      } catch (e) {
        serviceLineIds = [];
      }
    }
    
    // If KR has specific service line constraints, filter by them
    if (serviceLineIds && serviceLineIds.length > 0) {
      return serviceLineIds.includes(sl.id);
    }
    
    // If KR has a single service line, filter by it
    if (selectedKeyResult.serviceLineId) {
      return sl.id === selectedKeyResult.serviceLineId;
    }
    
    // If no constraints, show all
    return true;
  });

  // Filter services based on key result and selected service line
  const availableServices = services?.filter((s: any) => {
    // First filter by selected service line
    if (selectedServiceLineId && s.serviceLineId !== selectedServiceLineId) {
      return false;
    }
    
    if (!selectedKeyResult) return true;
    
    // If KR has a specific service constraint
    if (selectedKeyResult.serviceId) {
      return s.id === selectedKeyResult.serviceId;
    }
    
    // Parse serviceLineIds if it's a string
    let serviceLineIds = selectedKeyResult.serviceLineIds;
    if (typeof serviceLineIds === 'string') {
      try {
        serviceLineIds = JSON.parse(serviceLineIds);
      } catch (e) {
        serviceLineIds = [];
      }
    }
    
    // If KR has service line constraints, filter services by those lines
    if (serviceLineIds && serviceLineIds.length > 0) {
      return serviceLineIds.includes(s.serviceLineId);
    }
    
    // If KR has a single service line constraint
    if (selectedKeyResult.serviceLineId) {
      return s.serviceLineId === selectedKeyResult.serviceLineId;
    }
    
    return true;
  });

  const mutation = useMutation({
    mutationFn: async (data: ActionFormData) => {
      const payload = {
        ...data,
        dueDate: data.dueDate || undefined,
      };
      
      if (action) {
        await apiRequest("PUT", `/api/actions/${action.id}`, payload);
      } else {
        await apiRequest("POST", "/api/actions", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: action ? "Ação atualizada" : "Ação criada",
        description: action ? "A ação foi atualizada com sucesso." : "A ação foi criada com sucesso.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar ação.",
        variant: "destructive",
      });
    },
  });

  const submitComment = async () => {
    if (!newComment.trim() || !action?.id) return;
    
    setIsSubmittingComment(true);
    try {
      await apiRequest('POST', `/api/actions/${action.id}/comments`, {
        comment: newComment.trim()
      });
      
      setNewComment("");
      refetchComments();
      toast({
        title: "Comentário adicionado!",
        description: "Seu comentário de progresso foi salvo com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar comentário",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const onSubmit = (data: ActionFormData) => {
    // Validate action due date is before linked Key Result end date
    if (data.dueDate && data.keyResultId) {
      const selectedKeyResult = keyResults?.find((kr: any) => kr.id === data.keyResultId);
      if (selectedKeyResult) {
        const actionDueDate = new Date(data.dueDate);
        const krEndDate = new Date(selectedKeyResult.endDate);
        
        if (actionDueDate > krEndDate) {
          toast({
            title: "Erro de Validação",
            description: `A data de vencimento da ação deve ser anterior ao término do resultado-chave (${formatDateBR(selectedKeyResult.endDate)})`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Clean up the data to handle null values properly
    const cleanedData = {
      ...data,
      responsibleId: data.responsibleId || undefined,
      dueDate: data.dueDate || undefined,
    };
    
    console.log("Submitting action data:", cleanedData);
    mutation.mutate(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {action ? "Editar Ação" : "Nova Ação"}
          </DialogTitle>
          <DialogDescription>
            {action ? "Edite os detalhes da ação e acompanhe o progresso com comentários." : "Crie uma nova ação vinculada a um resultado-chave."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="keyResultId">Resultado-Chave *</Label>
              <Select 
                value={form.watch("keyResultId")?.toString() || ""}
                onValueChange={(value) => form.setValue("keyResultId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um resultado-chave" />
                </SelectTrigger>
                <SelectContent>
                  {keyResults?.map((kr: any) => (
                    <SelectItem key={kr.id} value={kr.id.toString()}>
                      {kr.title} (Objetivo: {kr.objective?.title})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.keyResultId && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.keyResultId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Digite o título da ação"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Descreva a ação em detalhes"
                rows={3}
              />
            </div>

            {/* Service Line and Service Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* Service Line Selection */}
              <div>
                <Label htmlFor="serviceLineId">Linha de Serviço</Label>
                <Select
                  value={form.watch("serviceLineId")?.toString() || "0"}
                  onValueChange={(value) => {
                    const numValue = value === "0" ? null : parseInt(value);
                    form.setValue("serviceLineId", numValue);
                    // Clear service selection when service line changes
                    form.setValue("serviceId", null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma linha de serviço (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nenhuma linha de serviço</SelectItem>
                    {availableServiceLines?.map((serviceLine: any) => (
                      <SelectItem key={serviceLine.id} value={serviceLine.id.toString()}>
                        {serviceLine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedKeyResult && (selectedKeyResult.serviceLineIds?.length > 0 || selectedKeyResult.serviceLineId) && (
                  <p className="text-xs text-blue-600 mt-1">
                    📌 Filtrado pelo resultado-chave selecionado
                  </p>
                )}
              </div>

              {/* Service Selection */}
              <div>
                <Label htmlFor="serviceId">Serviço</Label>
                <Select
                  value={form.watch("serviceId")?.toString() || "0"}
                  onValueChange={(value) => {
                    const numValue = value === "0" ? null : parseInt(value);
                    form.setValue("serviceId", numValue);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nenhum serviço</SelectItem>
                    {availableServices?.map((service: any) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedKeyResult && selectedKeyResult.serviceId && (
                  <p className="text-xs text-blue-600 mt-1">
                    📌 Filtrado pelo resultado-chave selecionado
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select 
                  value={form.watch("priority") || "medium"}
                  onValueChange={(value) => form.setValue("priority", value as "low" | "medium" | "high")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={form.watch("status") || "pending"}
                  onValueChange={(value) => form.setValue("status", value as "pending" | "in_progress" | "completed" | "cancelled")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsibleId">Responsável</Label>
                <Select 
                  value={form.watch("responsibleId")?.toString() || "0"}
                  onValueChange={(value) => form.setValue("responsibleId", value === "0" ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem responsável</SelectItem>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                {form.watch("keyResultId") && keyResults && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>⏰ Limite:</strong> {
                        (() => {
                          const selectedKR = keyResults.find((kr: any) => kr.id === form.watch("keyResultId"));
                          if (selectedKR) {
                            return `até ${formatDateBR(selectedKR.endDate)}`;
                          }
                          return 'Selecione um resultado-chave';
                        })()
                      }
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ A data de vencimento deve ser anterior ao fim do resultado-chave.
                    </p>
                  </div>
                )}
                <Input
                  id="dueDate"
                  type="date"
                  {...form.register("dueDate")}
                />
              </div>
            </div>


          </div>

          {/* Seção de Comentários de Progresso - apenas para ações existentes */}
          {action?.id && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Acompanhamento de Progresso
                </h3>
              </div>
              
              {/* Formulário para novo comentário */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label htmlFor="newComment" className="text-sm font-medium text-gray-700">
                  Adicionar comentário de progresso:
                </Label>
                <div className="mt-2 space-y-2">
                  <Textarea
                    id="newComment"
                    placeholder="Descreva o progresso, obstáculos enfrentados, próximos passos..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={submitComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmittingComment ? "Enviando..." : "Adicionar Comentário"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista de comentários existentes */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments && comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{comment.user?.username || 'Usuário'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(comment.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{comment.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhum comentário de progresso ainda.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Adicione comentários para acompanhar o andamento desta ação.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : action ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}