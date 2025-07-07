import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  BarChart3,
  PieChart,
} from "lucide-react";
import { PieChart as RechartsChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ActionTimeline from "./action-timeline";
import CheckpointUpdater from "./checkpoint-updater";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function EnhancedDashboard() {
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard/kpis"],
  });

  const { data: objectives } = useQuery({
    queryKey: ["/api/objectives"],
  });

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results"],
  });

  const { data: actions } = useQuery({
    queryKey: ["/api/actions"],
  });

  const { data: checkpoints } = useQuery({
    queryKey: ["/api/checkpoints"],
  });

  // Calcular estatísticas de ações
  const actionStats = {
    total: actions?.length || 0,
    completed: actions?.filter((a: any) => a.status === "completed").length || 0,
    inProgress: actions?.filter((a: any) => a.status === "in_progress").length || 0,
    pending: actions?.filter((a: any) => a.status === "pending").length || 0,
    overdue: actions?.filter((a: any) => {
      if (!a.dueDate || a.status === "completed") return false;
      return new Date(a.dueDate) < new Date();
    }).length || 0,
  };

  // Calcular estatísticas de checkpoints
  const checkpointStats = {
    total: checkpoints?.length || 0,
    completed: checkpoints?.filter((c: any) => c.status === "completed").length || 0,
    pending: checkpoints?.filter((c: any) => c.status === "pending").length || 0,
    overdue: checkpoints?.filter((c: any) => {
      if (c.status === "completed") return false;
      const today = new Date();
      const checkpointDate = new Date(c.period);
      return today > checkpointDate;
    }).length || 0,
  };

  // Dados para gráfico de pizza - Status das Ações
  const actionPieData = [
    { name: "Concluídas", value: actionStats.completed },
    { name: "Em Progresso", value: actionStats.inProgress },
    { name: "Pendentes", value: actionStats.pending },
    { name: "Atrasadas", value: actionStats.overdue },
  ].filter(item => item.value > 0);

  // Dados para gráfico de barras - Progresso por Objetivo
  const objectiveProgressData = objectives?.map((obj: any) => {
    const objKeyResults = keyResults?.filter((kr: any) => kr.objectiveId === obj.id) || [];
    const avgProgress = objKeyResults.length > 0
      ? objKeyResults.reduce((sum: number, kr: any) => sum + parseFloat(kr.progress || "0"), 0) / objKeyResults.length
      : 0;
    
    return {
      name: obj.title.substring(0, 20) + (obj.title.length > 20 ? "..." : ""),
      progress: Math.round(avgProgress),
    };
  }) || [];

  if (dashboardLoading) {
    return <div className="text-center py-8">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.overallProgress || 0}%</div>
            <Progress value={dashboardData?.overallProgress || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.completed}/{actionStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {actionStats.inProgress} em progresso, {actionStats.overdue} atrasadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checkpoints</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {checkpointStats.completed}/{checkpointStats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {checkpointStats.overdue} checkpoints atrasados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionStats.total > 0 
                ? Math.round((actionStats.completed / actionStats.total) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">de ações concluídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com diferentes visualizações */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="actions">Acompanhamento de Ações</TabsTrigger>
          <TabsTrigger value="checkpoints">Atualização de Checkpoints</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de Pizza - Status das Ações */}
            <Card>
              <CardHeader>
                <CardTitle>Status das Ações</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                {actionPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsChart>
                      <Pie
                        data={actionPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {actionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma ação cadastrada
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Barras - Progresso por Objetivo */}
            <Card>
              <CardHeader>
                <CardTitle>Progresso por Objetivo</CardTitle>
                <CardDescription>Média de progresso dos KRs</CardDescription>
              </CardHeader>
              <CardContent>
                {objectiveProgressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={objectiveProgressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="progress" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum objetivo cadastrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline de Ações Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Prioritárias</CardTitle>
              <CardDescription>Ações de alta prioridade e próximas do vencimento</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionTimeline showAll={false} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acompanhamento de Ações</CardTitle>
              <CardDescription>
                Visualize e atualize o status de todas as ações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionTimeline showAll={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atualização de Checkpoints</CardTitle>
              <CardDescription>
                Registre o progresso dos checkpoints pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CheckpointUpdater />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4">
            {/* Análise de Desempenho por Período */}
            <Card>
              <CardHeader>
                <CardTitle>Análise de Desempenho</CardTitle>
                <CardDescription>Métricas detalhadas de performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Taxa de Conclusão no Prazo</p>
                      <p className="text-sm text-gray-500">Ações concluídas dentro do prazo</p>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {actionStats.total > 0
                        ? Math.round(((actionStats.completed - actionStats.overdue) / actionStats.total) * 100)
                        : 0}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Velocidade de Execução</p>
                      <p className="text-sm text-gray-500">Média de ações concluídas por semana</p>
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(actionStats.completed / 4)} / semana
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Precisão de Checkpoints</p>
                      <p className="text-sm text-gray-500">Checkpoints atualizados no prazo</p>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {checkpointStats.total > 0
                        ? Math.round(((checkpointStats.completed) / checkpointStats.total) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}