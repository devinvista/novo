import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Settings as SettingsIcon, MapPin, Target, Layers, Download, Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CompactHeader from "@/components/compact-header";
import Sidebar from "@/components/sidebar";
import { cleanupOnDialogClose } from "@/lib/modal-cleanup";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schemas para validação
const strategicIndicatorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().optional(),
  unit: z.string().optional(),
});

const regionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
});

const subRegionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Code é obrigatório"),
  regionId: z.number().min(1, "Região é obrigatória"),
});

const solutionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().optional(),
});

const serviceLineSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().optional(),
  solutionId: z.number().min(1, "Solução é obrigatória"),
});

const serviceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  description: z.string().optional(),
  serviceLineId: z.number().min(1, "Linha de serviço é obrigatória"),
});

type StrategicIndicator = z.infer<typeof strategicIndicatorSchema> & { id: number };
type Region = z.infer<typeof regionSchema> & { id: number };
type SubRegion = z.infer<typeof subRegionSchema> & { id: number };
type Solution = z.infer<typeof solutionSchema> & { id: number };
type ServiceLine = z.infer<typeof serviceLineSchema> & { id: number };
type Service = z.infer<typeof serviceSchema> & { id: number };

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("indicators");

  // Verificar se o usuário é admin
  if (user?.role !== "admin") {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <CompactHeader showFilters={false} />
          
          <div className="flex-1 flex items-center justify-center pt-16">
            <Card className="w-96">
              <CardHeader>
                <CardTitle className="text-center">Acesso Negado</CardTitle>
                <CardDescription className="text-center">
                  Apenas administradores podem acessar as configurações do sistema.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <CompactHeader showFilters={false} />
        
        <div className="p-6 border-b bg-white pt-16">
          <div className="flex items-center gap-4">
            <SettingsIcon className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h2>
              <p className="text-gray-600">
                Gerencie indicadores estratégicos, regiões e estrutura organizacional
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="indicators" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="regions" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Regiões
          </TabsTrigger>
          <TabsTrigger value="solutions" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Soluções
          </TabsTrigger>
          <TabsTrigger value="service-lines" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Linhas de Serviço
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Importar Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicators">
          <StrategicIndicatorsTab />
        </TabsContent>

        <TabsContent value="regions">
          <RegionsTab />
        </TabsContent>

        <TabsContent value="solutions">
          <SolutionsTab />
        </TabsContent>

        <TabsContent value="service-lines">
          <ServiceLinesTab />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="import">
          <ImportDataTab />
        </TabsContent>
      </Tabs>
        </div>
      </main>
    </div>
  );
}

// Componente para gerenciar indicadores estratégicos
function StrategicIndicatorsTab() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<StrategicIndicator | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof strategicIndicatorSchema>>({
    resolver: zodResolver(strategicIndicatorSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      unit: "",
    },
  });

  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ["/api/strategic-indicators"],
    queryFn: async () => {
      const response = await fetch("/api/strategic-indicators");
      if (!response.ok) throw new Error("Falha ao carregar indicadores");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof strategicIndicatorSchema>) => {
      const response = await fetch("/api/admin/strategic-indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao criar indicador");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategic-indicators"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Indicador estratégico criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar indicador estratégico",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof strategicIndicatorSchema> }) => {
      const response = await fetch(`/api/admin/strategic-indicators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao atualizar indicador");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategic-indicators"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Indicador estratégico atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar indicador estratégico",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/strategic-indicators/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao excluir indicador");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategic-indicators"] });
      toast({
        title: "Sucesso",
        description: "Indicador estratégico excluído com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir indicador estratégico",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (indicator: StrategicIndicator) => {
    setEditingItem(indicator);
    form.reset({
      name: indicator.name,
      code: indicator.code || "",
      description: indicator.description || "",
      unit: indicator.unit || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: z.infer<typeof strategicIndicatorSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    form.reset();
  };

  if (isLoading) {
    return <div>Carregando indicadores estratégicos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Indicadores Estratégicos</CardTitle>
            <CardDescription>
              Gerencie os indicadores estratégicos utilizados nos resultados-chave
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Indicador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Indicador" : "Novo Indicador Estratégico"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Taxa de Satisfação" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: TSF001" {...field} />
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
                            placeholder="Descriição detalhada do indicador..."
                            {...field}
                          />
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
                        <FormLabel>Unidade de Medida</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: %, pontos, unidades" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingItem ? "Atualizar" : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indicators.map((indicator: StrategicIndicator) => (
              <TableRow key={indicator.id}>
                <TableCell className="font-medium">{indicator.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{indicator.code || "-"}</Badge>
                </TableCell>
                <TableCell>{indicator.description || "-"}</TableCell>
                <TableCell>
                  {indicator.unit ? <Badge variant="secondary">{indicator.unit}</Badge> : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(indicator)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este indicador?")) {
                          deleteMutation.mutate(indicator.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Componente para gerenciar regiões e sub-regiões
function RegionsTab() {
  const { toast } = useToast();
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editingSubRegion, setEditingSubRegion] = useState<SubRegion | null>(null);
  const [isRegionDialogOpen, setIsRegionDialogOpen] = useState(false);
  const [isSubRegionDialogOpen, setIsSubRegionDialogOpen] = useState(false);

  const regionForm = useForm<z.infer<typeof regionSchema>>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const subRegionForm = useForm<z.infer<typeof subRegionSchema>>({
    resolver: zodResolver(subRegionSchema),
    defaultValues: {
      name: "",
      code: "",
      regionId: 0,
    },
  });

  const { data: regions = [], isLoading: isLoadingRegions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: subRegions = [], isLoading: isLoadingSubRegions } = useQuery<SubRegion[]>({
    queryKey: ["/api/sub-regions"],
  });

  // Mutations para regiões
  const createRegionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof regionSchema>) => {
      const response = await fetch("/api/admin/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao criar região");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      setIsRegionDialogOpen(false);
      regionForm.reset();
      toast({
        title: "Sucesso",
        description: "Região criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar região",
        variant: "destructive",
      });
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof regionSchema> }) => {
      const response = await fetch(`/api/admin/regions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao atualizar região");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      setIsRegionDialogOpen(false);
      setEditingRegion(null);
      regionForm.reset();
      toast({
        title: "Sucesso",
        description: "Região atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar região",
        variant: "destructive",
      });
    },
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/regions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao excluir região");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      toast({
        title: "Sucesso",
        description: "Região excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir região",
        variant: "destructive",
      });
    },
  });

  // Mutations para sub-regiões
  const createSubRegionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof subRegionSchema>) => {
      const response = await fetch("/api/admin/sub-regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao criar sub-região");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-regions"] });
      setIsSubRegionDialogOpen(false);
      subRegionForm.reset();
      toast({
        title: "Sucesso",
        description: "Sub-região criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar sub-região",
        variant: "destructive",
      });
    },
  });

  const updateSubRegionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof subRegionSchema> }) => {
      const response = await fetch(`/api/admin/sub-regions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao atualizar sub-região");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-regions"] });
      setIsSubRegionDialogOpen(false);
      setEditingSubRegion(null);
      subRegionForm.reset();
      toast({
        title: "Sucesso",
        description: "Sub-região atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar sub-região",
        variant: "destructive",
      });
    },
  });

  const deleteSubRegionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/sub-regions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao excluir sub-região");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-regions"] });
      toast({
        title: "Sucesso",
        description: "Sub-região excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir sub-região",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleRegionSubmit = (data: z.infer<typeof regionSchema>) => {
    if (editingRegion) {
      updateRegionMutation.mutate({ id: editingRegion.id, data });
    } else {
      createRegionMutation.mutate(data);
    }
  };

  const handleSubRegionSubmit = (data: z.infer<typeof subRegionSchema>) => {
    if (editingSubRegion) {
      updateSubRegionMutation.mutate({ id: editingSubRegion.id, data });
    } else {
      createSubRegionMutation.mutate(data);
    }
  };

  const handleEditRegion = (region: Region) => {
    setEditingRegion(region);
    regionForm.reset({
      name: region.name,
      code: region.code,
    });
    setIsRegionDialogOpen(true);
  };

  const handleEditSubRegion = (subRegion: SubRegion) => {
    setEditingSubRegion(subRegion);
    subRegionForm.reset({
      name: subRegion.name,
      code: subRegion.code,
      regionId: subRegion.regionId,
    });
    setIsSubRegionDialogOpen(true);
  };

  const handleDeleteRegion = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta região?")) {
      deleteRegionMutation.mutate(id);
      // Cleanup modals after confirmation
      setTimeout(() => {
        cleanupOnDialogClose();
      }, 300);
    }
  };

  const handleDeleteSubRegion = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta sub-região?")) {
      deleteSubRegionMutation.mutate(id);
      // Cleanup modals after confirmation
      setTimeout(() => {
        cleanupOnDialogClose();
      }, 300);
    }
  };

  if (isLoadingRegions || isLoadingSubRegions) {
    return <div>Carregando regiões...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Regiões</CardTitle>
              <CardDescription>
                Gerencie as regiões do sistema
              </CardDescription>
            </div>
            <Button onClick={() => setIsRegionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Região
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((region: Region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{region.code}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditRegion(region)}
                        data-testid={`button-edit-region-${region.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteRegion(region.id)}
                        data-testid={`button-delete-region-${region.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sub-regiões</CardTitle>
              <CardDescription>
                Gerencie as sub-regiões do sistema
              </CardDescription>
            </div>
            <Button onClick={() => setIsSubRegionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Sub-região
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Região</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subRegions.map((subRegion: SubRegion) => {
                const region = regions.find((r: Region) => r.id === subRegion.regionId);
                return (
                  <TableRow key={subRegion.id}>
                    <TableCell className="font-medium">{subRegion.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{subRegion.code}</Badge>
                    </TableCell>
                    <TableCell>{region?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditSubRegion(subRegion)}
                          data-testid={`button-edit-subregion-${subRegion.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteSubRegion(subRegion.id)}
                          data-testid={`button-delete-subregion-${subRegion.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para Região */}
      <Dialog open={isRegionDialogOpen} onOpenChange={setIsRegionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? "Editar Região" : "Nova Região"}
            </DialogTitle>
          </DialogHeader>
          <Form {...regionForm}>
            <form onSubmit={regionForm.handleSubmit(handleRegionSubmit)} className="space-y-4">
              <FormField
                control={regionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome da região" 
                        {...field} 
                        data-testid="input-region-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regionForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código da região" 
                        {...field} 
                        data-testid="input-region-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsRegionDialogOpen(false);
                    setEditingRegion(null);
                    regionForm.reset();
                  }}
                  data-testid="button-cancel-region"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRegionMutation.isPending || updateRegionMutation.isPending}
                  data-testid="button-save-region"
                >
                  {createRegionMutation.isPending || updateRegionMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Sub-região */}
      <Dialog open={isSubRegionDialogOpen} onOpenChange={setIsSubRegionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubRegion ? "Editar Sub-região" : "Nova Sub-região"}
            </DialogTitle>
          </DialogHeader>
          <Form {...subRegionForm}>
            <form onSubmit={subRegionForm.handleSubmit(handleSubRegionSubmit)} className="space-y-4">
              <FormField
                control={subRegionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome da sub-região" 
                        {...field} 
                        data-testid="input-subregion-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subRegionForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código da sub-região" 
                        {...field} 
                        data-testid="input-subregion-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subRegionForm.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Região</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subregion-region">
                          <SelectValue placeholder="Selecione uma região" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((region: Region) => (
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
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsSubRegionDialogOpen(false);
                    setEditingSubRegion(null);
                    subRegionForm.reset();
                  }}
                  data-testid="button-cancel-subregion"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSubRegionMutation.isPending || updateSubRegionMutation.isPending}
                  data-testid="button-save-subregion"
                >
                  {createSubRegionMutation.isPending || updateSubRegionMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componentes de gerenciamento para Solutions, ServiceLines e Services
function SolutionsTab() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<Solution | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof solutionSchema>>({
    resolver: zodResolver(solutionSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const { data: solutions = [], isLoading } = useQuery({
    queryKey: ["/api/solutions"],
    queryFn: async () => {
      const response = await fetch("/api/solutions");
      if (!response.ok) throw new Error("Falha ao carregar soluções");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof solutionSchema>) => {
      const response = await fetch("/api/admin/solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao criar solução");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solutions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Solução criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar solução",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof solutionSchema> }) => {
      const response = await fetch(`/api/admin/solutions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao atualizar solução");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solutions"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Solução atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar solução",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/solutions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao excluir solução");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solutions"] });
      toast({
        title: "Sucesso",
        description: "Solução excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir solução",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof solutionSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (solution: Solution) => {
    setEditingItem(solution);
    form.reset({
      name: solution.name,
      code: solution.code || "",
      description: solution.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta solução?")) {
      deleteMutation.mutate(id);
      // Cleanup modals after confirmation
      setTimeout(() => {
        cleanupOnDialogClose();
      }, 300);
    }
  };

  if (isLoading) {
    return <div>Carregando soluções...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Soluções</CardTitle>
              <CardDescription>
                Gerencie as soluções organizacionais
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solução
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solutions.map((solution: Solution) => (
                <TableRow key={solution.id}>
                  <TableCell className="font-medium">{solution.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{solution.code || "-"}</Badge>
                  </TableCell>
                  <TableCell>{solution.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(solution)}
                        data-testid={`button-edit-solution-${solution.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDelete(solution.id)}
                        data-testid={`button-delete-solution-${solution.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Solução" : "Nova Solução"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome da solução" 
                        {...field} 
                        data-testid="input-solution-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código da solução" 
                        {...field} 
                        data-testid="input-solution-code"
                      />
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
                        placeholder="Descrição da solução" 
                        {...field} 
                        data-testid="input-solution-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingItem(null);
                    form.reset();
                  }}
                  data-testid="button-cancel-solution"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-solution"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceLinesTab() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<ServiceLine | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof serviceLineSchema>>({
    resolver: zodResolver(serviceLineSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      solutionId: undefined,
    },
  });

  const { data: serviceLines = [], isLoading } = useQuery({
    queryKey: ["/api/service-lines"],
    queryFn: async () => {
      const response = await fetch("/api/service-lines");
      if (!response.ok) throw new Error("Falha ao carregar linhas de serviço");
      return response.json();
    },
  });

  const { data: solutions = [] } = useQuery({
    queryKey: ["/api/solutions"],
    queryFn: async () => {
      const response = await fetch("/api/solutions");
      if (!response.ok) throw new Error("Falha ao carregar soluções");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceLineSchema>) => {
      const response = await fetch("/api/admin/service-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao criar linha de serviço");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-lines"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Linha de serviço criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar linha de serviço",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof serviceLineSchema> }) => {
      const response = await fetch(`/api/admin/service-lines/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao atualizar linha de serviço");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-lines"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Linha de serviço atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar linha de serviço",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/service-lines/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao excluir linha de serviço");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-lines"] });
      toast({
        title: "Sucesso",
        description: "Linha de serviço excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir linha de serviço",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof serviceLineSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (serviceLine: ServiceLine) => {
    setEditingItem(serviceLine);
    form.reset({
      name: serviceLine.name,
      code: serviceLine.code || "",
      description: serviceLine.description || "",
      solutionId: serviceLine.solutionId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta linha de serviço?")) {
      deleteMutation.mutate(id);
      // Cleanup modals after confirmation
      setTimeout(() => {
        cleanupOnDialogClose();
      }, 300);
    }
  };

  if (isLoading) {
    return <div>Carregando linhas de serviço...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Linhas de Serviço</CardTitle>
              <CardDescription>
                Gerencie as linhas de serviço por solução
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Linha de Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Solução</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceLines.map((serviceLine: ServiceLine) => {
                const solution = solutions.find((s: Solution) => s.id === serviceLine.solutionId);
                return (
                  <TableRow key={serviceLine.id}>
                    <TableCell className="font-medium">{serviceLine.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{serviceLine.code || "-"}</Badge>
                    </TableCell>
                    <TableCell>{serviceLine.description || "-"}</TableCell>
                    <TableCell>{solution?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(serviceLine)}
                          data-testid={`button-edit-service-line-${serviceLine.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDelete(serviceLine.id)}
                          data-testid={`button-delete-service-line-${serviceLine.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Linha de Serviço" : "Nova Linha de Serviço"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome da linha de serviço" 
                        {...field} 
                        data-testid="input-service-line-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código da linha de serviço" 
                        {...field} 
                        data-testid="input-service-line-code"
                      />
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
                        placeholder="Descrição da linha de serviço" 
                        {...field} 
                        data-testid="input-service-line-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="solutionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solução</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-line-solution">
                          <SelectValue placeholder="Selecione uma solução" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {solutions.map((solution: Solution) => (
                          <SelectItem key={solution.id} value={solution.id.toString()}>
                            {solution.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingItem(null);
                    form.reset();
                  }}
                  data-testid="button-cancel-service-line"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-service-line"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServicesTab() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      serviceLineId: undefined,
    },
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Falha ao carregar serviços");
      return response.json();
    },
  });

  const { data: serviceLines = [] } = useQuery({
    queryKey: ["/api/service-lines"],
    queryFn: async () => {
      const response = await fetch("/api/service-lines");
      if (!response.ok) throw new Error("Falha ao carregar linhas de serviço");
      return response.json();
    },
  });

  const { data: solutions = [] } = useQuery({
    queryKey: ["/api/solutions"],
    queryFn: async () => {
      const response = await fetch("/api/solutions");
      if (!response.ok) throw new Error("Falha ao carregar soluções");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceSchema>) => {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao criar serviço");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Serviço criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar serviço",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof serviceSchema> }) => {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao atualizar serviço");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Serviço atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar serviço",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao excluir serviço");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Sucesso",
        description: "Serviço excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir serviço",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof serviceSchema>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingItem(service);
    form.reset({
      name: service.name,
      code: service.code || "",
      description: service.description || "",
      serviceLineId: service.serviceLineId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este serviço?")) {
      deleteMutation.mutate(id);
      // Cleanup modals after confirmation
      setTimeout(() => {
        cleanupOnDialogClose();
      }, 300);
    }
  };

  if (isLoading) {
    return <div>Carregando serviços...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Serviços</CardTitle>
              <CardDescription>
                Gerencie os serviços específicos por linha de serviço
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Linha de Serviço</TableHead>
                <TableHead>Solução</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service: Service) => {
                const serviceLine = serviceLines.find((sl: ServiceLine) => sl.id === service.serviceLineId);
                const solution = solutions.find((s: Solution) => s.id === serviceLine?.solutionId);
                return (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.code || "-"}</Badge>
                    </TableCell>
                    <TableCell>{service.description || "-"}</TableCell>
                    <TableCell>{serviceLine?.name || "-"}</TableCell>
                    <TableCell>{solution?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(service)}
                          data-testid={`button-edit-service-${service.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDelete(service.id)}
                          data-testid={`button-delete-service-${service.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome do serviço" 
                        {...field} 
                        data-testid="input-service-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código do serviço" 
                        {...field} 
                        data-testid="input-service-code"
                      />
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
                        placeholder="Descrição do serviço" 
                        {...field} 
                        data-testid="input-service-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceLineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linha de Serviço</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-service-line">
                          <SelectValue placeholder="Selecione uma linha de serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceLines.map((serviceLine: ServiceLine) => {
                          const solution = solutions.find((s: Solution) => s.id === serviceLine.solutionId);
                          return (
                            <SelectItem key={serviceLine.id} value={serviceLine.id.toString()}>
                              {serviceLine.name} ({solution?.name})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingItem(null);
                    form.reset();
                  }}
                  data-testid="button-cancel-service"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-service"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// Componente para importação de dados
function ImportDataTab() {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/export-template", {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Falha ao gerar modelo");
      }
      return response.blob();
    },
    onSuccess: (blob) => {
      // Criar download do arquivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo_okr_import.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Sucesso",
        description: "Modelo Excel baixado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao baixar modelo Excel",
        variant: "destructive",
      });
    },
  });

  const importDataMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/admin/import-data", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Falha ao importar dados");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      // Invalidar todas as queries para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ["/api/strategic-indicators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/solutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      setImportFile(null);
      setIsImporting(false);
      
      toast({
        title: "Sucesso",
        description: `Dados importados com sucesso. ${result.imported || 0} registros processados.`,
      });
    },
    onError: (error: any) => {
      setIsImporting(false);
      toast({
        title: "Erro",
        description: error.message || "Falha ao importar dados",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é um arquivo Excel
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel"
      ];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
          variant: "destructive",
        });
        return;
      }
      
      setImportFile(file);
    }
  };

  const handleImport = () => {
    if (!importFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo para importar",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    importDataMutation.mutate(importFile);
  };

  return (
    <div className="space-y-6">
      {/* Download do Modelo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            <CardTitle>Baixar Modelo Excel</CardTitle>
          </div>
          <CardDescription>
            Faça o download do modelo Excel com todas as planilhas e estruturas necessárias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              <p>O modelo contém as seguintes planilhas:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Objetivos:</strong> Objetivos com título, descrição, datas, região e responsável</li>
                <li><strong>Resultados-Chave:</strong> Resultados-chave vinculados aos objetivos com metas e valores</li>
                <li><strong>Ações:</strong> Ações vinculadas aos resultados-chave com prazos e prioridades</li>
              </ul>
            </div>
            <Button 
              onClick={() => downloadTemplateMutation.mutate()}
              disabled={downloadTemplateMutation.isPending}
              className="w-fit"
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadTemplateMutation.isPending ? "Gerando..." : "Baixar Modelo Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Importação de Dados */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <CardTitle>Importar Dados</CardTitle>
          </div>
          <CardDescription>
            Selecione o arquivo Excel preenchido para importar os dados para o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">Arquivo Excel</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isImporting}
                data-testid="input-import-file"
              />
              {importFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Arquivo selecionado: {importFile.name}
                </p>
              )}
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">Instruções importantes:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Use apenas o modelo Excel baixado acima</li>
                <li>• Não altere os cabeçalhos das colunas</li>
                <li>• Use os códigos/IDs corretos para regiões, usuários e indicadores existentes</li>
                <li>• Mantenha as relações entre objetivos, resultados-chave e ações</li>
                <li>• Datas devem estar no formato AAAA-MM-DD</li>
                <li>• A importação irá adicionar novos registros, não substituir os existentes</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleImport}
                disabled={!importFile || isImporting || importDataMutation.isPending}
                data-testid="button-import-data"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting || importDataMutation.isPending ? "Importando..." : "Importar Dados"}
              </Button>
              
              {importFile && (
                <Button 
                  variant="outline"
                  onClick={() => setImportFile(null)}
                  disabled={isImporting}
                  data-testid="button-clear-file"
                >
                  Limpar Arquivo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
