import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Eye, Edit, Activity, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import KeyResultForm from "@/components/key-result-form-simple";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function KeyResults() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedKeyResult, setSelectedKeyResult] = useState<any>(null);
  const [, setLocation] = useLocation();
  
  const { data: keyResults, isLoading, error } = useQuery({
    queryKey: ["/api/key-results"],
    queryFn: async () => {
      const response = await fetch("/api/key-results");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao carregar resultados-chave");
      }
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const handleCreateKeyResult = () => {
    setSelectedKeyResult(null);
    setIsFormOpen(true);
  };

  const handleEditKeyResult = (keyResult: any) => {
    setSelectedKeyResult(keyResult);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedKeyResult(null);
  };

  const getStatusColor = (progress: number) => {
    if (progress >= 70) return "bg-secondary";
    if (progress >= 40) return "bg-accent";
    return "bg-destructive";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: "Pendente", variant: "secondary" as const };
      case 'active':
        return { label: "Em andamento", variant: "default" as const };
      case 'completed':
        return { label: "Concluído", variant: "default" as const };
      case 'delayed':
        return { label: "Atrasado", variant: "destructive" as const };
      case 'cancelled':
        return { label: "Cancelado", variant: "destructive" as const };
      default:
        return { label: "Em andamento", variant: "default" as const };
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Resultados-Chave" 
          description="Gerencie os KRs vinculados aos objetivos"
          action={
            <Button onClick={handleCreateKeyResult}>
              <Plus className="mr-2 h-4 w-4" />
              Novo KR
            </Button>
          }
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Erro ao carregar resultados-chave</p>
              <p className="text-sm text-red-500 mt-2">{error.message}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {keyResults && keyResults.length > 0 ? keyResults.map((kr: any) => {
                const progress = parseFloat(kr.progress) || 0;
                const statusBadge = getStatusBadge(kr.status || 'active');
                
                return (
                  <Card key={kr.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {kr.number}. {kr.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Objetivo: {kr.objective.title}
                          </p>
                          {kr.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {kr.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => handleEditKeyResult(kr)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Valor Atual:</span>
                            <p className="font-medium">{kr.currentValue} {kr.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Meta:</span>
                            <p className="font-medium">{kr.targetValue} {kr.unit}</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progresso</span>
                            <span className="font-medium">{progress.toFixed(1)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Frequência: {kr.frequency}</span>
                          {kr.strategicIndicator && (
                            <span>Indicador: {kr.strategicIndicator.name}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setLocation(`/actions?kr=${kr.id}`)}
                          >
                            <Activity className="h-4 w-4 mr-1" />
                            Ações
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setLocation(`/checkpoints?kr=${kr.id}`)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Checkpoints
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Período: {kr.startDate ? new Date(kr.startDate).toLocaleDateString('pt-BR') : 'N/A'} - {kr.endDate ? new Date(kr.endDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum resultado-chave encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crie objetivos primeiro e depois adicione resultados-chave a eles.
                  </p>
                  <Button className="mt-4" onClick={handleCreateKeyResult}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeiro KR
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <KeyResultForm 
        keyResult={selectedKeyResult}
        onSuccess={handleFormSuccess}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
