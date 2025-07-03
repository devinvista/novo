import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertKeyResultSchema } from "@shared/schema";

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

  const form = useForm<KeyResultFormData>({
    resolver: zodResolver(insertKeyResultSchema),
    defaultValues: {
      objectiveId: keyResult?.objectiveId || "",
      title: keyResult?.title || "",
      description: keyResult?.description || "",
      strategicIndicatorId: keyResult?.strategicIndicatorId || "",
      serviceLineId: keyResult?.serviceLineId || "",
      serviceId: keyResult?.serviceId || "",
      initialValue: keyResult?.initialValue || "0",
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
      strategicIndicatorId: data.strategicIndicatorId ? parseInt(data.strategicIndicatorId as unknown as string) : undefined,
      serviceLineId: data.serviceLineId ? parseInt(data.serviceLineId as unknown as string) : undefined,
      serviceId: data.serviceId ? parseInt(data.serviceId as unknown as string) : undefined,
      initialValue: String(data.initialValue || "0"),
      targetValue: String(data.targetValue || "0"),
      currentValue: String(data.currentValue || "0"),
      progress: String(data.progress || "0"),
    };
    
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
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
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
                name="strategicIndicatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicador Estratégico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um indicador" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {strategicIndicators?.map((indicator: any) => (
                          <SelectItem key={indicator.id} value={indicator.id.toString()}>
                            {indicator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceLineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linha de Serviço</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedServiceLine(value);
                      form.setValue("serviceId", ""); // Reset service when service line changes
                    }} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma linha de serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Nenhuma</SelectItem>
                        {serviceLines?.map((serviceLine: any) => (
                          <SelectItem key={serviceLine.id} value={serviceLine.id.toString()}>
                            {serviceLine.name}
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
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Nenhum</SelectItem>
                        {services?.map((service: any) => (
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