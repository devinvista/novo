import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { 
  Target, 
  TrendingUp, 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  BarChart3
} from "lucide-react";

interface SimpleDashboardProps {
  filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  };
}

export default function SimpleDashboard({ filters }: SimpleDashboardProps) {
  const { selectedQuarter } = useQuarterlyFilter();
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard/kpis", selectedQuarter, JSON.stringify(filters)],
    queryFn: () => {
      console.log('📡 Dashboard: Fetching KPIs with filters:', { selectedQuarter, filters });
      
      const params = new URLSearchParams();
      if (selectedQuarter && selectedQuarter !== 'all') params.append('quarter', selectedQuarter);
      if (filters?.regionId) params.append('regionId', filters.regionId.toString());
      if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
      if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
      
      const url = `/api/dashboard/kpis${params.toString() ? `?${params}` : ''}`;
      console.log('📡 Dashboard KPI URL:', url);
      return fetch(url, { credentials: "include" }).then(r => r.json());
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Force invalidation when filters change
  useEffect(() => {
    console.log('🔄 SimpleDashboard: Filters changed, invalidating queries:', filters);
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
  }, [filters, queryClient]);

  if (dashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-20" />
                </CardTitle>
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const data = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.objectives || 0}</div>
            <p className="text-xs text-muted-foreground">
              Objetivos estratégicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultados-Chave</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.keyResults || 0}</div>
            <p className="text-xs text-muted-foreground">
              KRs monitorados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.actions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ações em execução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checkpoints</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.checkpoints || 0}</div>
            <p className="text-xs text-muted-foreground">
              Marcos de progresso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Objetivos</CardTitle>
            <CardDescription>
              Distribuição do status dos objetivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.objectives > 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {data.objectives} objetivo(s) ativo(s)
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Nenhum objetivo encontrado
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progresso Geral</CardTitle>
            <CardDescription>
              Acompanhamento geral do progresso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>KRs Ativos</span>
                <span>{data.keyResults || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Ações em Andamento</span>
                <span>{data.actions || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Checkpoints</span>
                <span>{data.checkpoints || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}