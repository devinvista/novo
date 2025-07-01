import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, User } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Actions() {
  const { data: actions, isLoading } = useQuery({
    queryKey: ["/api/actions"],
    queryFn: async () => {
      const response = await fetch("/api/actions");
      if (!response.ok) throw new Error("Erro ao carregar ações");
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Concluída", variant: "default" as const, color: "bg-secondary" };
      case "in_progress":
        return { label: "Em Andamento", variant: "secondary" as const, color: "bg-accent" };
      case "pending":
        return { label: "Pendente", variant: "outline" as const, color: "bg-gray-200" };
      case "cancelled":
        return { label: "Cancelada", variant: "destructive" as const, color: "bg-destructive" };
      default:
        return { label: status, variant: "outline" as const, color: "bg-gray-200" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return { label: "Alta", color: "text-red-600 bg-red-50" };
      case "medium":
        return { label: "Média", color: "text-yellow-600 bg-yellow-50" };
      case "low":
        return { label: "Baixa", color: "text-green-600 bg-green-50" };
      default:
        return { label: priority, color: "text-gray-600 bg-gray-50" };
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Ações" 
          description="Gerencie as ações vinculadas aos resultados-chave"
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Ação
            </Button>
          }
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {actions?.map((action: any) => {
                const statusBadge = getStatusBadge(action.status);
                const priorityBadge = getPriorityBadge(action.priority);
                
                return (
                  <Card key={action.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {action.number}. {action.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            KR: {action.keyResult.title}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={statusBadge.variant}
                            className={statusBadge.color}
                          >
                            {statusBadge.label}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={priorityBadge.color}
                          >
                            {priorityBadge.label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {action.description && (
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          {action.responsible && (
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {action.responsible.name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-muted-foreground">
                                {action.responsible.name}
                              </span>
                            </div>
                          )}
                          
                          {action.dueDate && (
                            <div className="flex items-center space-x-1 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(action.dueDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {action.strategicIndicator && (
                          <div className="text-sm text-muted-foreground">
                            <span>Indicador: {action.strategicIndicator.name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {actions?.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nenhuma ação encontrada.
                    </p>
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeira ação
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
