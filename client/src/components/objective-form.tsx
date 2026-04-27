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
import { formatSP } from "@/lib/timezone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const objectiveFormSchema = insertObjectiveSchema.extend({
  title: z.string().min(1, "Título é obrigatório"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
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

  const form = useForm<z.input<typeof objectiveFormSchema>, any, ObjectiveFormData>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: {
      title: objective?.title || "",
      description: objective?.description || "",
      ownerId: objective?.ownerId || user?.id,
      regionId: objective?.regionId || undefined,
      subRegionIds: objective?.subRegionIds || (objective?.subRegionId ? [objective.subRegionId] : []),
      startDate: objective?.startDate ? formatSP(objective.startDate, "yyyy-MM-dd") : "",
      endDate: objective?.endDate ? formatSP(objective.endDate, "yyyy-MM-dd") : "",
    },
  });

  const selectedRegionId = form.watch("regionId");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const { data: regions } = useQuery({
    queryKey: ["/api/regions"],
    queryFn: async () => {
      const response = await fetch("/api/regions", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Erro ao carregar regiões");
      return response.json();
    },
  });

  const { data: subRegions } = useQuery({
    queryKey: ["/api/sub-regions"],
    queryFn: async () => {
      const response = await fetch("/api/sub-regions", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Erro ao carregar sub-regiões");
      return response.json();
    },
  });

  // Filter sub-regions based on selected region
  const filteredSubRegions = selectedRegionId && subRegions
    ? subRegions.filter((subRegion: any) => subRegion.regionId === selectedRegionId)
    : [];

  const mutation = useMutation({
    mutationFn: async (data: ObjectiveFormData) => {
      const payload = {
        ...data,
        startDate: data.startDate,
        endDate: data.endDate,
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

  // Function to determine quarter from date (kept for reference but not used)
  const getQuarterFromDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const quarter = Math.ceil(month / 3);
    return `${year}-q${quarter}`;
  };



  return (
    <div className="w-full">
      <DialogHeader>
        <DialogTitle>
          {objective ? "Editar Objetivo" : "Criar Novo Objetivo"}
        </DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
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
                    value={field.value || ""}
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
                  onValueChange={(value) => {
                    const regionId = value === "none" ? undefined : parseInt(value);
                    field.onChange(regionId);
                    // Clear sub-regions when region changes
                    form.setValue("subRegionIds", []);
                  }}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma região</SelectItem>
                    {regions && regions.map((region: any) => (
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

          {selectedRegionId && filteredSubRegions && filteredSubRegions.length > 0 && (
            <FormField
              control={form.control}
              name="subRegionIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-Regiões (Opcional - Múltipla Escolha)</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 sm:p-4 border rounded-lg">
                    {filteredSubRegions.map((subRegion: any) => (
                      <div key={subRegion.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`subregion-${subRegion.id}`}
                          checked={Array.isArray(field.value) && field.value.includes(subRegion.id)}
                          onChange={(e) => {
                            const currentValues = Array.isArray(field.value) ? field.value : [];
                            if (e.target.checked) {
                              field.onChange([...currentValues, subRegion.id]);
                            } else {
                              field.onChange(currentValues.filter((id: number) => id !== subRegion.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`subregion-${subRegion.id}`} className="text-sm font-medium">
                          {subRegion.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Informação sobre responsabilidade automática */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 text-blue-600 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Responsabilidade Automática</h4>
                <p className="text-sm text-blue-700">
                  O responsável pelo objetivo será definido automaticamente como o gestor da região ou sub-região selecionada. 
                  Se você é um gestor, será automaticamente definido como responsável.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 sm:pt-6 border-t">
            <Button type="button" variant="outline" onClick={onSuccess} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
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