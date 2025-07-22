import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertKeyResultSchema } from "@shared/schema";

// Custom validation schema that includes objective date validation
const createKeyResultValidationSchema = (objectives: any[] = []) => {
  return insertKeyResultSchema.refine((data) => {
    if (!data.objectiveId) return true; // Skip validation if no objective selected
    
    const selectedObjective = objectives.find(obj => obj.id === parseInt(data.objectiveId as unknown as string));
    if (!selectedObjective) return true; // Skip if objective not found
    
    const objectiveStartDate = new Date(selectedObjective.startDate);
    const objectiveEndDate = new Date(selectedObjective.endDate);
    const krStartDate = new Date(data.startDate);
    const krEndDate = new Date(data.endDate);
    
    // Check if KR dates are within objective dates
    const startDateValid = krStartDate >= objectiveStartDate;
    const endDateValid = krEndDate <= objectiveEndDate;
    
    return startDateValid && endDateValid;
  }, {
    message: "As datas do resultado-chave devem estar dentro do período do objetivo",
    path: ["startDate"], // This will show the error on startDate field
  }).refine((data) => {
    // Additional validation: ensure start date is before end date
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.startDate) <= new Date(data.endDate);
  }, {
    message: "A data de início deve ser anterior à data de fim",
    path: ["endDate"],
  });
};

type KeyResultFormData = z.infer<typeof insertKeyResultSchema>;

interface KeyResultFormProps {
  keyResult?: any;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyResultForm({ keyResult, onSuccess, open, onOpenChange }: KeyResultFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch objectives for dropdown
  const { data: objectives } = useQuery({
    queryKey: ["/api/objectives"],
    queryFn: async () => {
      const response = await fetch("/api/objectives");
      if (!response.ok) throw new Error("Erro ao carregar objetivos");
      return response.json();
    },
    enabled: open,
  });

  // Fetch strategic indicators for dropdown
  const { data: strategicIndicators } = useQuery({
    queryKey: ["/api/strategic-indicators"],
    queryFn: async () => {
      const response = await fetch("/api/strategic-indicators");
      if (!response.ok) throw new Error("Erro ao carregar indicadores estratégicos");
      return response.json();
    },
    enabled: open,
  });

  // Fetch service lines for dropdown
  const { data: serviceLines } = useQuery({
    queryKey: ["/api/service-lines"],
    queryFn: async () => {
      const response = await fetch("/api/service-lines");
      if (!response.ok) throw new Error("Erro ao carregar linhas de serviço");
      return response.json();
    },
    enabled: open,
  });

  // State for selected service line to control services query
  const [selectedServiceLine, setSelectedServiceLine] = useState<string | null>(null);
  
  // State for selected objective to show date constraints
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>(keyResult?.objectiveId?.toString() || "");

  // Fetch services for dropdown (based on selected service line)
  const { data: services } = useQuery({
    queryKey: ["/api/services", selectedServiceLine],
    queryFn: async () => {
      if (!selectedServiceLine || selectedServiceLine === "0") return [];
      const response = await fetch(`/api/services?serviceLineId=${selectedServiceLine}`);
      if (!response.ok) throw new Error("Erro ao carregar serviços");
      return response.json();
    },
    enabled: open && !!selectedServiceLine && selectedServiceLine !== "0",
  });

  // Create validation schema with objective date constraints
  const validationSchema = useMemo(() => {
    return createKeyResultValidationSchema(objectives || []);
  }, [objectives]);

  const form = useForm<KeyResultFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      objectiveId: keyResult?.objectiveId || "",
      title: keyResult?.title || "",
      description: keyResult?.description || "",
      strategicIndicatorIds: keyResult?.strategicIndicatorIds || [],
      serviceLineIds: keyResult?.serviceLineIds || [],
      serviceId: keyResult?.serviceId || undefined,
      targetValue: keyResult?.targetValue || "0",
      currentValue: keyResult?.currentValue || "0",
      unit: keyResult?.unit || "",
      frequency: keyResult?.frequency || "monthly",
      startDate: keyResult?.startDate ? new Date(keyResult.startDate).toISOString().split('T')[0] : "",
      endDate: keyResult?.endDate ? new Date(keyResult.endDate).toISOString().split('T')[0] : "",
      progress: keyResult?.progress || "0",
      status: keyResult?.status || "active",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: KeyResultFormData) => {
      const endpoint = keyResult ? `/api/key-results/${keyResult.id}` : "/api/key-results";
      const method = keyResult ? "PUT" : "POST";
      
      return await apiRequest(endpoint, method, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Sucesso",
        description: keyResult ? "Resultado-chave atualizado com sucesso!" : "Resultado-chave criado com sucesso!",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar resultado-chave",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: KeyResultFormData) => {
    // Convert string values to numbers for numeric fields
    const processedData = {
      ...data,
      objectiveId: parseInt(data.objectiveId as unknown as string),
      strategicIndicatorIds: data.strategicIndicatorIds || [],
      serviceLineIds: data.serviceLineIds || [],
      serviceId: data.serviceId ? parseInt(data.serviceId as unknown as string) : undefined,
      targetValue: parseFloat(data.targetValue as unknown as string),
      currentValue: parseFloat(data.currentValue as unknown as string) || 0,
      progress: parseFloat(data.progress as unknown as string) || 0,
      unit: data.unit || "",
    };
    
    console.log("Sending data:", processedData);
    mutation.mutate(processedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {keyResult ? "Editar Resultado-Chave" : "Novo Resultado-Chave"}
          </DialogTitle>
          <DialogDescription>
            {keyResult ? "Atualize as informações do resultado-chave." : "Crie um novo resultado-chave associado a um objetivo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="objectiveId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo *</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedObjectiveId(value);
                  }} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um objetivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {objectives?.map((objective: any) => (
                        <SelectItem key={objective.id} value={objective.id.toString()}>
                          {objective.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título do resultado-chave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o resultado-chave em detalhes"
                      className="resize-none"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initialValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Inicial *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Meta *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Atual</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: %, unidades, R$" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strategicIndicatorIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicadores Estratégicos</FormLabel>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                      {strategicIndicators?.map((indicator: any) => (
                        <div key={indicator.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`indicator-${indicator.id}`}
                            checked={field.value?.includes(indicator.id) || false}
                            onChange={(e) => {
                              const currentValue = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentValue, indicator.id]);
                              } else {
                                field.onChange(currentValue.filter((id: number) => id !== indicator.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`indicator-${indicator.id}`} className="text-sm font-medium">
                            {indicator.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="serviceLineIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linhas de Serviço (Opcional)</FormLabel>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                      {serviceLines && serviceLines.length > 0 ? serviceLines.map((serviceLine: any) => (
                        <div key={serviceLine.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`serviceline-${serviceLine.id}`}
                            checked={field.value?.includes(serviceLine.id) || false}
                            onChange={(e) => {
                              const currentValue = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentValue, serviceLine.id]);
                              } else {
                                field.onChange(currentValue.filter((id: number) => id !== serviceLine.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`serviceline-${serviceLine.id}`} className="text-sm font-medium">
                            {serviceLine.name}
                          </label>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500">Nenhuma linha de serviço disponível</p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço Específico (Opcional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "0" ? undefined : parseInt(value))} value={field.value?.toString() || "0"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço específico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Nenhum serviço específico</SelectItem>
                        {services && services.length > 0 && services.map((service: any) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Show objective date constraints if objective is selected */}
            {selectedObjectiveId && objectives && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Período do objetivo:</strong> {
                    (() => {
                      const selectedObj = objectives.find(obj => obj.id.toString() === selectedObjectiveId);
                      if (selectedObj) {
                        const startDate = new Date(selectedObj.startDate).toLocaleDateString('pt-BR');
                        const endDate = new Date(selectedObj.endDate).toLocaleDateString('pt-BR');
                        return `${startDate} até ${endDate}`;
                      }
                      return 'Selecione um objetivo';
                    })()
                  }
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  As datas do resultado-chave devem estar dentro deste período.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : keyResult ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}