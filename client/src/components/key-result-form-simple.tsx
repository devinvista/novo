import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface KeyResultFormProps {
  keyResult?: any;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyResultForm({ keyResult, onSuccess, open, onOpenChange }: KeyResultFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    objectiveId: "",
    title: "",
    description: "",
    strategicIndicatorId: "",
    targetValue: "0",
    currentValue: "0",
    unit: "",
    frequency: "monthly",
    startDate: "",
    endDate: "",
    status: "active",
  });

  // Reset form when dialog opens/closes or keyResult changes
  useEffect(() => {
    if (open) {
      if (keyResult) {
        // Editing existing key result
        setFormData({
          objectiveId: keyResult.objectiveId?.toString() || "",
          title: keyResult.title || "",
          description: keyResult.description || "",
          strategicIndicatorId: keyResult.strategicIndicatorId?.toString() || "",
          targetValue: keyResult.targetValue || "0",
          currentValue: keyResult.currentValue || "0",
          unit: keyResult.unit || "",
          frequency: keyResult.frequency || "monthly",
          startDate: keyResult.startDate ? new Date(keyResult.startDate).toISOString().split('T')[0] : "",
          endDate: keyResult.endDate ? new Date(keyResult.endDate).toISOString().split('T')[0] : "",
          status: keyResult.status || "active",
        });
      } else {
        // Creating new key result
        setFormData({
          objectiveId: "",
          title: "",
          description: "",
          strategicIndicatorId: "",
          targetValue: "0",
          currentValue: "0",
          unit: "",
          frequency: "monthly",
          startDate: "",
          endDate: "",
          status: "active",
        });
      }
    }
  }, [open, keyResult]);

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

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = keyResult ? `/api/key-results/${keyResult.id}` : "/api/key-results";
      const method = keyResult ? "PUT" : "POST";
      
      console.log("Sending data:", data);
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Server response:", response.status, errorData);
        throw new Error(errorData || `HTTP ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Sucesso",
        description: keyResult ? "Resultado-chave atualizado com sucesso!" : "Resultado-chave criado com sucesso!",
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.objectiveId || !formData.title || !formData.targetValue || !formData.startDate || !formData.endDate) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validate date logic
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast({
        title: "Erro",
        description: "A data de término deve ser posterior à data de início",
        variant: "destructive",
      });
      return;
    }

    const processedData = {
      objectiveId: parseInt(formData.objectiveId),
      title: formData.title,
      description: formData.description || null,
      strategicIndicatorId: formData.strategicIndicatorId && formData.strategicIndicatorId !== "" ? parseInt(formData.strategicIndicatorId) : null,
      initialValue: "0",
      targetValue: formData.targetValue.toString(),
      currentValue: formData.currentValue.toString(),
      unit: formData.unit || null,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate,
      progress: "0",
      status: formData.status,
    };
    
    mutation.mutate(processedData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {keyResult ? "Editar Resultado-Chave" : "Novo Resultado-Chave"}
          </DialogTitle>
          <DialogDescription>
            {keyResult ? "Atualize as informações do resultado-chave." : "Crie um novo resultado-chave associado a um objetivo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="objectiveId">Objetivo *</Label>
            <Select value={formData.objectiveId.toString()} onValueChange={(value) => handleInputChange("objectiveId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um objetivo" />
              </SelectTrigger>
              <SelectContent>
                {objectives?.map((objective: any) => (
                  <SelectItem key={objective.id} value={objective.id.toString()}>
                    {objective.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Digite o título do resultado-chave"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descreva o resultado-chave em detalhes"
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetValue">Valor Meta *</Label>
            <Input
              id="targetValue"
              type="number"
              step="0.01"
              value={formData.targetValue}
              onChange={(e) => handleInputChange("targetValue", e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unidade</Label>
            <Input
              id="unit"
              value={formData.unit}
              onChange={(e) => handleInputChange("unit", e.target.value)}
              placeholder="Ex: %, unidades, R$"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência *</Label>
              <Select value={formData.frequency} onValueChange={(value) => handleInputChange("frequency", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategicIndicatorId">Indicador Estratégico</Label>
              <Select value={formData.strategicIndicatorId.toString()} onValueChange={(value) => handleInputChange("strategicIndicatorId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um indicador" />
                </SelectTrigger>
                <SelectContent>
                  {strategicIndicators?.map((indicator: any) => (
                    <SelectItem key={indicator.id} value={indicator.id.toString()}>
                      {indicator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
              {mutation.isPending ? "Salvando..." : keyResult ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}