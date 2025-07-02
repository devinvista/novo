import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertObjectiveSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const objectiveFormSchema = insertObjectiveSchema.extend({
  title: z.string().min(1, "Título é obrigatório"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
}).omit({
  solutionId: true,
  serviceLineId: true,
  serviceId: true,
  subRegionId: true,
});

type ObjectiveFormData = z.infer<typeof objectiveFormSchema>;

interface ObjectiveFormProps {
  objective?: any;
  onSuccess: () => void;
}

export default function ObjectiveForm({ objective, onSuccess }: ObjectiveFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ObjectiveFormData>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: {
      title: objective?.title || "",
      description: objective?.description || "",
      ownerId: objective?.ownerId || user?.id,
      regionId: objective?.regionId || undefined,
      period: objective?.period || "",
      startDate: objective?.startDate ? new Date(objective.startDate).toISOString().split('T')[0] : "",
      endDate: objective?.endDate ? new Date(objective.endDate).toISOString().split('T')[0] : "",
    },
  });

  const selectedRegionId = form.watch("regionId");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const { data: regions } = useQuery({
    queryKey: ["/api/regions"],
    queryFn: async () => {
      const response = await fetch("/api/regions");
      if (!response.ok) throw new Error("Erro ao carregar regiões");
      return response.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ObjectiveFormData) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        progress: data.progress.toString(),
      };

      if (objective) {
        await apiRequest("PUT", `/api/objectives/${objective.id}`, payload);
      } else {
        await apiRequest("POST", "/api/objectives", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      toast({
        title: objective ? "Objetivo atualizado" : "Objetivo criado",
        description: objective 
          ? "O objetivo foi atualizado com sucesso." 
          : "O objetivo foi criado com sucesso.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar objetivo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ObjectiveFormData) => {
    mutation.mutate(data);
  };

  const periods = [
    { value: "2024-q1", label: "Q1 2024" },
    { value: "2024-q2", label: "Q2 2024" },
    { value: "2024-q3", label: "Q3 2024" },
    { value: "2024-q4", label: "Q4 2024" },
    { value: "2025-q1", label: "Q1 2025" },
  ];

  // Function to determine quarter from date
  const getQuarterFromDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const quarter = Math.ceil(month / 3);
    return `${year}-q${quarter}`;
  };

  // Function to generate period based on start and end dates
  const generatePeriod = (startDateStr: string, endDateStr: string): string => {
    if (!startDateStr || !endDateStr) return "";
    
    const startQuarter = getQuarterFromDate(startDateStr);
    const endQuarter = getQuarterFromDate(endDateStr);
    
    if (startQuarter === endQuarter) {
      return startQuarter;
    } else {
      // If spans multiple quarters, use the start quarter
      return startQuarter;
    }
  };

  // Auto-generate period when dates change
  React.useEffect(() => {
    if (startDate && endDate) {
      const generatedPeriod = generatePeriod(startDate, endDate);
      if (generatedPeriod) {
        form.setValue("period", generatedPeriod);
      }
    }
  }, [startDate, endDate, form]);

  return (
    <div>
      <DialogHeader>
        <DialogTitle>
          {objective ? "Editar Objetivo" : "Criar Novo Objetivo"}
        </DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título do Objetivo *</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o título do objetivo" {...field} />
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
                    placeholder="Descreva o objetivo"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="regionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Região</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma região</SelectItem>
                    {regions?.map((region: any) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
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
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período * (Gerado automaticamente)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled>
                  <FormControl>
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="Período será gerado com base nas datas" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  O período é calculado automaticamente com base na data de início
                </p>
              </FormItem>
            )}
          />

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

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending 
                ? "Salvando..." 
                : objective 
                  ? "Atualizar Objetivo" 
                  : "Criar Objetivo"
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
