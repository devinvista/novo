import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Target, Calendar, TrendingUp, Settings, Users, Briefcase, CheckCircle2 } from "lucide-react";

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
    strategicIndicatorIds: [] as number[],
    serviceLineIds: [] as number[],
    serviceId: undefined as number | undefined,
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
          strategicIndicatorIds: keyResult.strategicIndicatorIds || [],
          serviceLineIds: keyResult.serviceLineIds || [],
          serviceId: keyResult.serviceId || undefined,
          initialValue: keyResult.initialValue?.toString() || "0",
          targetValue: keyResult.targetValue?.toString() || "0",
          currentValue: keyResult.currentValue?.toString() || "0",
          unit: keyResult.unit || "",
          frequency: keyResult.frequency || "monthly",
          startDate: keyResult.startDate ? new Date(keyResult.startDate).toISOString().split('T')[0] : "",
          endDate: keyResult.endDate ? new Date(keyResult.endDate).toISOString().split('T')[0] : "",
          progress: keyResult.progress?.toString() || "0",
          status: keyResult.status || "active",
        });
      } else {
        // Creating new key result
        setFormData({
          objectiveId: "",
          title: "",
          description: "",
          strategicIndicatorIds: [],
          serviceLineIds: [],
          serviceId: undefined,
          initialValue: "0",
          targetValue: "0",
          currentValue: "0",
          unit: "",
          frequency: "monthly",
          startDate: "",
          endDate: "",
          progress: "0",
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

  // Fetch services for dropdown
  const { data: services } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Erro ao carregar serviços");
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
      strategicIndicatorIds: formData.strategicIndicatorIds,
      serviceLineIds: formData.serviceLineIds,
      serviceId: formData.serviceId || null,
      initialValue: parseFloat(String(formData.initialValue || "0")) || 0,
      targetValue: parseFloat(String(formData.targetValue || "0")) || 0,
      currentValue: parseFloat(String(formData.currentValue || "0")) || 0,
      unit: formData.unit || null,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate,
      progress: parseFloat(String(formData.progress || "0")) || 0,
      status: formData.status,
    };
    
    mutation.mutate(processedData);
  };

  const handleInputChange = (field: string, value: string | number | undefined) => {
    if (field === 'serviceId' && (value === '' || value === '0')) {
      setFormData(prev => ({ ...prev, [field]: undefined }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-3 pb-6">
          <div className="flex items-center justify-center space-x-2">
            <Target className="h-6 w-6" style={{ color: 'hsl(220, 65%, 36%)' }} />
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, hsl(220, 65%, 36%), hsl(195, 100%, 50%))' }}>
              {keyResult ? "Editar Resultado-Chave" : "Novo Resultado-Chave"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-base">
            {keyResult ? "Atualize as informações do resultado-chave para acompanhar o progresso." : "Defina um resultado mensurável que contribua para o alcance do objetivo estratégico."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: 'hsl(220, 65%, 36%)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Target className="h-5 w-5 mr-2" style={{ color: 'hsl(220, 65%, 36%)' }} />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objectiveId" className="text-sm font-semibold flex items-center">
                  <span className="text-red-500 mr-1">*</span>
                  Objetivo
                </Label>
                <Select value={formData.objectiveId.toString()} onValueChange={(value) => handleInputChange("objectiveId", value)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o objetivo estratégico" />
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
                <Label htmlFor="title" className="text-sm font-semibold flex items-center">
                  <span className="text-red-500 mr-1">*</span>
                  Título do Resultado-Chave
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Ex: Aumentar satisfação do cliente em 25%"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Descrição Detalhada
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Descreva como este resultado será medido e qual impacto esperado..."
                  className="resize-none h-20"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: 'hsl(137, 62%, 42%)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <TrendingUp className="h-5 w-5 mr-2" style={{ color: 'hsl(137, 62%, 42%)' }} />
                Métricas e Metas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetValue" className="text-sm font-semibold flex items-center">
                    <span className="text-red-500 mr-1">*</span>
                    Valor Meta
                  </Label>
                  <Input
                    id="targetValue"
                    type="number"
                    step="0.01"
                    value={formData.targetValue}
                    onChange={(e) => handleInputChange("targetValue", e.target.value)}
                    placeholder="100"
                    required
                    className="h-11 text-center font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-semibold">
                    Unidade de Medida
                  </Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange("unit", e.target.value)}
                    placeholder="Ex: %, R$, unidades"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-sm font-semibold flex items-center">
                    <span className="text-red-500 mr-1">*</span>
                    Frequência de Acompanhamento
                  </Label>
                  <Select value={formData.frequency} onValueChange={(value) => handleInputChange("frequency", value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Periodicidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">🗓️ Semanal</SelectItem>
                      <SelectItem value="monthly">📅 Mensal</SelectItem>
                      <SelectItem value="quarterly">📊 Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: 'hsl(165, 100%, 32%)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Settings className="h-5 w-5 mr-2" style={{ color: 'hsl(165, 100%, 32%)' }} />
                Indicadores Estratégicos
                <Badge variant="secondary" className="ml-2 text-xs">Opcional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  {strategicIndicators && strategicIndicators.length > 0 ? strategicIndicators.map((indicator: any) => (
                    <label 
                      key={indicator.id} 
                      htmlFor={`indicator-${indicator.id}`}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        formData.strategicIndicatorIds.includes(indicator.id) 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`indicator-${indicator.id}`}
                        checked={formData.strategicIndicatorIds.includes(indicator.id)}
                        onChange={(e) => {
                          const currentValue = formData.strategicIndicatorIds;
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              strategicIndicatorIds: [...currentValue, indicator.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              strategicIndicatorIds: currentValue.filter((id: number) => id !== indicator.id)
                            }));
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm font-medium flex-1">{indicator.name}</span>
                      {formData.strategicIndicatorIds.includes(indicator.id) && (
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      )}
                    </label>
                  )) : (
                    <p className="col-span-2 text-sm text-gray-500 text-center py-4">Nenhum indicador estratégico disponível</p>
                  )}
                </div>
                {formData.strategicIndicatorIds.length > 0 && (
                  <div className="flex items-center space-x-2 mt-3">
                    <Badge variant="default" className="border" style={{ backgroundColor: 'hsl(165, 100%, 95%)', color: 'hsl(165, 100%, 32%)', borderColor: 'hsl(165, 100%, 32%)' }}>
                      {formData.strategicIndicatorIds.length} selecionado{formData.strategicIndicatorIds.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: 'hsl(14, 80%, 58%)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Briefcase className="h-5 w-5 mr-2" style={{ color: 'hsl(14, 80%, 58%)' }} />
                Linhas de Serviço
                <Badge variant="secondary" className="ml-2 text-xs">Opcional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  {serviceLines && serviceLines.length > 0 ? serviceLines.map((serviceLine: any) => (
                    <label 
                      key={serviceLine.id} 
                      htmlFor={`serviceline-${serviceLine.id}`}
                      className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                      style={formData.serviceLineIds.includes(serviceLine.id) 
                        ? { borderColor: 'hsl(14, 80%, 58%)', backgroundColor: 'hsl(14, 80%, 95%)' }
                        : { borderColor: 'hsl(220, 20%, 90%)', backgroundColor: 'transparent' }
                      }
                    >
                      <input
                        type="checkbox"
                        id={`serviceline-${serviceLine.id}`}
                        checked={formData.serviceLineIds.includes(serviceLine.id)}
                        onChange={(e) => {
                          const currentValue = formData.serviceLineIds;
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              serviceLineIds: [...currentValue, serviceLine.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              serviceLineIds: currentValue.filter((id: number) => id !== serviceLine.id)
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'hsl(14, 80%, 58%)' }}
                      />
                      <span className="text-sm font-medium flex-1">{serviceLine.name}</span>
                      {formData.serviceLineIds.includes(serviceLine.id) && (
                        <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(14, 80%, 58%)' }} />
                      )}
                    </label>
                  )) : (
                    <p className="col-span-2 text-sm text-gray-500 text-center py-4">Nenhuma linha de serviço disponível</p>
                  )}
                </div>
                {formData.serviceLineIds.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="border" style={{ backgroundColor: 'hsl(14, 80%, 95%)', color: 'hsl(14, 80%, 58%)', borderColor: 'hsl(14, 80%, 58%)' }}>
                      {formData.serviceLineIds.length} selecionada{formData.serviceLineIds.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="serviceId" className="text-sm font-semibold flex items-center">
                  <Users className="h-4 w-4 mr-1" style={{ color: 'hsl(14, 80%, 58%)' }} />
                  Serviço Específico
                  <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                </Label>
                <Select value={formData.serviceId?.toString() || "0"} onValueChange={(value) => handleInputChange("serviceId", value === "0" ? undefined : parseInt(value))}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione um serviço específico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">🔹 Nenhum serviço específico</SelectItem>
                    {services && services.length > 0 && services.map((service: any) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: 'hsl(195, 100%, 50%)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Calendar className="h-5 w-5 mr-2" style={{ color: 'hsl(195, 100%, 50%)' }} />
                Cronograma de Execução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-semibold flex items-center">
                    <span className="text-red-500 mr-1">*</span>
                    <Calendar className="h-4 w-4 mr-1" style={{ color: 'hsl(137, 62%, 42%)' }} />
                    Data de Início
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-semibold flex items-center">
                    <span className="text-red-500 mr-1">*</span>
                    <Calendar className="h-4 w-4 mr-1" style={{ color: 'hsl(14, 80%, 58%)' }} />
                    Data de Término
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange("endDate", e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="w-full sm:w-auto h-11 border-2"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending} 
              className="w-full sm:w-auto h-11 text-white font-semibold hover:opacity-90 transition-opacity"
              style={{ 
                background: 'linear-gradient(to right, hsl(220, 65%, 36%), hsl(195, 100%, 50%))',
                boxShadow: '0 4px 14px 0 hsla(220, 65%, 36%, 0.39)'
              }}
            >
              {mutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {keyResult ? "Atualizar" : "Criar Resultado-Chave"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}