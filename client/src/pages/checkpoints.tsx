import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Checkpoints() {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ actualValue: "", notes: "" });
  const [selectedKeyResult, setSelectedKeyResult] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ["/api/checkpoints", selectedKeyResult],
    queryFn: async () => {
      const url = selectedKeyResult === "all" ? "/api/checkpoints" : `/api/checkpoints?keyResultId=${selectedKeyResult}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar checkpoints");
      return response.json();
    },
  });

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results"],
    queryFn: async () => {
      const response = await fetch("/api/key-results");
      if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PUT", `/api/checkpoints/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
      setSelectedCheckpoint(null);
      setUpdateForm({ actualValue: "", notes: "" });
      toast({
        title: "Checkpoint atualizado",
        description: "O checkpoint foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar checkpoint.",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = (checkpoint: any) => {
    setSelectedCheckpoint(checkpoint);
    setUpdateForm({
      actualValue: checkpoint.actualValue || "",
      notes: checkpoint.notes || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckpoint) return;

    updateMutation.mutate({
      id: selectedCheckpoint.id,
      data: updateForm,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Concluído", variant: "default" as const, icon: CheckCircle };
      case "pending":
        return { label: "Pendente", variant: "secondary" as const, icon: Clock };
      default:
        return { label: status, variant: "outline" as const, icon: Clock };
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Checkpoints" 
          description="Acompanhe o progresso dos resultados-chave"
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedKeyResult} onValueChange={setSelectedKeyResult}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filtrar por resultado-chave" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os resultados-chave</SelectItem>
                  {keyResults?.map((kr: any) => (
                    <SelectItem key={kr.id} value={kr.id.toString()}>
                      {kr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {checkpoints?.map((checkpoint: any) => {
                const statusBadge = getStatusBadge(checkpoint.status);
                const StatusIcon = statusBadge.icon;
                const progress = parseFloat(checkpoint.progress) || 0;
                
                return (
                  <Card key={checkpoint.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Calendar className="h-5 w-5" />
                            <span>Período: {checkpoint.period}</span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            KR: {checkpoint.keyResult?.title || "Resultado-chave"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={statusBadge.variant}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusBadge.label}
                          </Badge>
                          {checkpoint.status === "pending" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUpdate(checkpoint)}
                                >
                                  Atualizar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Atualizar Checkpoint - {checkpoint.period}
                                  </DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                  <div>
                                    <Label htmlFor="actualValue">Valor Realizado</Label>
                                    <Input
                                      id="actualValue"
                                      type="number"
                                      step="0.01"
                                      value={updateForm.actualValue}
                                      onChange={(e) => setUpdateForm({
                                        ...updateForm,
                                        actualValue: e.target.value
                                      })}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="notes">Observações</Label>
                                    <Textarea
                                      id="notes"
                                      value={updateForm.notes}
                                      onChange={(e) => setUpdateForm({
                                        ...updateForm,
                                        notes: e.target.value
                                      })}
                                      placeholder="Adicione observações sobre este período..."
                                    />
                                  </div>
                                  <Button 
                                    type="submit" 
                                    className="w-full"
                                    disabled={updateMutation.isPending}
                                  >
                                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Meta:</span>
                          <p className="font-medium">{checkpoint.targetValue}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Realizado:</span>
                          <p className="font-medium">
                            {checkpoint.actualValue || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Progresso:</span>
                          <p className="font-medium">{progress.toFixed(1)}%</p>
                        </div>
                      </div>
                      
                      {checkpoint.notes && (
                        <div className="mt-4 pt-4 border-t">
                          <span className="text-sm text-muted-foreground">Observações:</span>
                          <p className="text-sm mt-1">{checkpoint.notes}</p>
                        </div>
                      )}
                      
                      {checkpoint.completedAt && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Concluído em: {new Date(checkpoint.completedAt).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              
              {checkpoints?.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nenhum checkpoint encontrado.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Os checkpoints são gerados automaticamente quando você cria resultados-chave.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
