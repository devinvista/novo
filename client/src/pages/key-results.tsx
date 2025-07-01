import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Eye } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function KeyResults() {
  const { data: keyResults, isLoading } = useQuery({
    queryKey: ["/api/key-results"],
    queryFn: async () => {
      const response = await fetch("/api/key-results");
      if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
      return response.json();
    },
  });

  const getStatusColor = (progress: number) => {
    if (progress >= 70) return "bg-secondary";
    if (progress >= 40) return "bg-accent";
    return "bg-destructive";
  };

  const getStatusBadge = (progress: number) => {
    if (progress >= 70) return { label: "No prazo", variant: "default" as const };
    if (progress >= 40) return { label: "Atenção", variant: "secondary" as const };
    return { label: "Atrasado", variant: "destructive" as const };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Resultados-Chave" 
          description="Gerencie os KRs vinculados aos objetivos"
          action={
            <Button>
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
          ) : (
            <div className="grid gap-6">
              {keyResults?.map((kr: any) => {
                const progress = parseFloat(kr.progress) || 0;
                const statusBadge = getStatusBadge(progress);
                
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Valor Inicial:</span>
                            <p className="font-medium">{kr.initialValue} {kr.unit}</p>
                          </div>
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {keyResults?.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nenhum resultado-chave encontrado.
                    </p>
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeiro KR
                    </Button>
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
