import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertActionSchema, type InsertAction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";

const actionFormSchema = insertActionSchema.extend({
  keyResultId: z.number().min(1, "Resultado-chave é obrigatório"),
  dueDate: z.string().optional(),
});

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

  const { data: indicators } = useQuery({
    queryKey: ["/api/strategic-indicators"],
    queryFn: async () => {
      const response = await fetch("/api/strategic-indicators");
      if (!response.ok) throw new Error("Erro ao carregar indicadores");
      return response.json();
    },
  });

  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      keyResultId: action?.keyResultId || 0,
      title: action?.title || "",
      description: action?.description || "",
      priority: action?.priority || "medium",
      status: action?.status || "pending",
      responsibleId: action?.responsibleId || null,
      strategicIndicatorId: action?.strategicIndicatorId || null,
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
        responsibleId: action.responsibleId || null,
        strategicIndicatorId: action.strategicIndicatorId || null,
        dueDate: action.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : "",
      });
    } else {
      form.reset({
        keyResultId: defaultKeyResultId || 0,
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        responsibleId: null,
        strategicIndicatorId: null,
        dueDate: "",
      });
    }
  }, [action, form]);

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

  const onSubmit = (data: ActionFormData) => {
    // Validate action due date is before linked Key Result end date
    if (data.dueDate && data.keyResultId) {
      const selectedKeyResult = keyResults?.find(kr => kr.id === data.keyResultId);
      if (selectedKeyResult) {
        const actionDueDate = new Date(data.dueDate);
        const krEndDate = new Date(selectedKeyResult.endDate);
        
        if (actionDueDate > krEndDate) {
          toast({
            title: "Erro de Validação",
            description: `A data de vencimento da ação deve ser anterior ao término do resultado-chave (${krEndDate.toLocaleDateString('pt-BR')})`,
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
      strategicIndicatorId: data.strategicIndicatorId || undefined,
      dueDate: data.dueDate || undefined,
    };
    
    console.log("Submitting action data:", cleanedData);
    mutation.mutate(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {action ? "Editar Ação" : "Nova Ação"}
          </DialogTitle>
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
                          const selectedKR = keyResults.find(kr => kr.id === form.watch("keyResultId"));
                          if (selectedKR) {
                            return `até ${new Date(selectedKR.endDate).toLocaleDateString('pt-BR')}`;
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

            <div>
              <Label htmlFor="strategicIndicatorId">Indicador Estratégico</Label>
              <Select 
                value={form.watch("strategicIndicatorId")?.toString() || "0"}
                onValueChange={(value) => form.setValue("strategicIndicatorId", value === "0" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um indicador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sem indicador</SelectItem>
                  {indicators?.map((indicator: any) => (
                    <SelectItem key={indicator.id} value={indicator.id.toString()}>
                      {indicator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
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