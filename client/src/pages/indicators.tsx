import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingUp } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Indicators() {
  const { data: indicators, isLoading } = useQuery({
    queryKey: ["/api/strategic-indicators"],
    queryFn: async () => {
      const response = await fetch("/api/strategic-indicators");
      if (!response.ok) throw new Error("Erro ao carregar indicadores");
      return response.json();
    },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Indicadores Estratégicos" 
          description="Visualize os 7 indicadores estratégicos predefinidos"
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {indicators?.map((indicator: any) => (
                <Card key={indicator.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Activity className="h-5 w-5 text-primary" />
                          </div>
                          <span>{indicator.name}</span>
                        </CardTitle>
                      </div>
                      <Badge variant={indicator.active ? "default" : "secondary"}>
                        {indicator.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {indicator.description && (
                        <p className="text-sm text-muted-foreground">
                          {indicator.description}
                        </p>
                      )}
                      
                      {indicator.unit && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Unidade:</span>
                          <span className="font-medium">{indicator.unit}</span>
                        </div>
                      )}
                      
                      <div className="pt-4 border-t">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>Usado em KRs e Ações vinculadas</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {indicators?.length === 0 && (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="text-center py-12">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhum indicador estratégico encontrado.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Os indicadores estratégicos são predefinidos no sistema.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
          
          {!isLoading && indicators?.length > 0 && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Sobre os Indicadores Estratégicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      Os indicadores estratégicos são métricas predefinidas que representam as áreas-chave 
                      de performance da organização de saúde.
                    </p>
                    <p>
                      Eles podem ser vinculados aos resultados-chave (KRs) e ações para garantir 
                      alinhamento com os objetivos estratégicos da organização.
                    </p>
                    <p>
                      Cada indicador possui uma unidade de medida específica (%, unidades, valores monetários, etc.) 
                      que facilita a padronização das métricas organizacionais.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
