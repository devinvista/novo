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
  MapPin,
  Zap,
  Award,
  Gauge
} from "lucide-react";
import { 
  PieChart as RechartsChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar
} from "recharts";

// Cores corporativas FIERGS
const FIERGS_COLORS = {
  primary: '#1a4b9f',     // Azul FIERGS
  secondary: '#4db74f',   // Verde SESI
  tertiary: '#00b39c',    // Verde IEL
  quaternary: '#ef5e31',  // Laranja SENAI
  accent: '#0091d6',      // Azul CIERGS
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#64748b'
};

const CHART_COLORS = [
  FIERGS_COLORS.primary,
  FIERGS_COLORS.secondary, 
  FIERGS_COLORS.tertiary,
  FIERGS_COLORS.quaternary,
  FIERGS_COLORS.accent,
  FIERGS_COLORS.warning,
  FIERGS_COLORS.danger
];

export default function ModernDashboard() {
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

  const { data: subRegions } = useQuery({
    queryKey: ["/api/sub-regions"],
  });

  const { data: strategicIndicators } = useQuery({
    queryKey: ["/api/strategic-indicators"],
  });

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calcular métricas de KRs
  const krStats = {
    total: keyResults?.length || 0,
    completed: keyResults?.filter((kr: any) => kr.status === 'completed').length || 0,
    active: keyResults?.filter((kr: any) => kr.status === 'active').length || 0,
    pending: keyResults?.filter((kr: any) => kr.status === 'pending').length || 0,
    delayed: keyResults?.filter((kr: any) => kr.status === 'delayed').length || 0,
  };

  // Calcular atingimento de KRs
  const krAchievement = keyResults?.map((kr: any) => {
    if (!kr?.title) return null;
    
    const currentValue = parseFloat(kr.currentValue || 0);
    const targetValue = parseFloat(kr.targetValue || 1);
    const percentage = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
    
    return {
      title: kr.title,
      percentage: isNaN(percentage) ? 0 : Math.round(percentage),
      current: isNaN(currentValue) ? 0 : currentValue,
      target: isNaN(targetValue) ? 1 : targetValue,
      status: kr.status || 'pending'
    };
  }).filter((kr: any) => kr !== null) || [];

  // Ações por sub-região
  const actionsBySubRegion = subRegions?.map((subRegion: any) => {
    const subRegionActions = actions?.filter((action: any) => {
      if (!action?.keyResultId) return false;
      // Buscar objective da ação via keyResult
      const keyResult = keyResults?.find((kr: any) => kr.id === action.keyResultId);
      if (!keyResult?.objectiveId) return false;
      const objective = objectives?.find((obj: any) => obj.id === keyResult.objectiveId);
      return objective?.subRegionId === subRegion.id;
    }) || [];

    return {
      name: subRegion.name || 'Sem nome',
      total: subRegionActions.length || 0,
      completed: subRegionActions.filter((a: any) => a.status === 'completed').length || 0,
      pending: subRegionActions.filter((a: any) => a.status === 'pending').length || 0,
      inProgress: subRegionActions.filter((a: any) => a.status === 'in_progress').length || 0,
    };
  }).filter((item: any) => item && item.total > 0) || [];

  // Status de ações para gráfico de pizza
  const actionStatusData = [
    { name: 'Concluídas', value: actions?.filter((a: any) => a.status === 'completed').length || 0, color: FIERGS_COLORS.success },
    { name: 'Em Progresso', value: actions?.filter((a: any) => a.status === 'in_progress').length || 0, color: FIERGS_COLORS.secondary },
    { name: 'Pendentes', value: actions?.filter((a: any) => a.status === 'pending').length || 0, color: FIERGS_COLORS.warning },
    { name: 'Atrasadas', value: actions?.filter((a: any) => {
      if (a.status === 'completed') return false;
      return a.dueDate && new Date(a.dueDate) < new Date();
    }).length || 0, color: FIERGS_COLORS.danger }
  ];

  // Indicadores estratégicos com KRs associados
  const indicatorStats = strategicIndicators?.map((indicator: any) => {
    if (!indicator?.id || !indicator?.name) return null;
    
    const relatedKRs = keyResults?.filter((kr: any) => 
      Array.isArray(kr.strategicIndicatorIds) && kr.strategicIndicatorIds.includes(indicator.id)
    ) || [];
    
    const completedKRs = relatedKRs.filter((kr: any) => kr.status === 'completed').length || 0;
    const totalKRs = relatedKRs.length || 0;
    const completionRate = totalKRs > 0 ? Math.round((completedKRs / totalKRs) * 100) : 0;

    return {
      name: indicator.name,
      totalKRs,
      completedKRs,
      completionRate: isNaN(completionRate) ? 0 : completionRate,
      color: CHART_COLORS[indicator.id % CHART_COLORS.length]
    };
  }).filter((item: any) => item && item.totalKRs > 0) || [];

  return (
    <div className="space-y-8">
      {/* Header com gradiente FIERGS */}
      <div className="bg-gradient-to-r from-[#1a4b9f] to-[#0091d6] rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Executivo</h1>
            <p className="text-blue-100">Visão estratégica dos OKRs organizacionais</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold">{dashboardData?.totalObjectives || 0}</div>
              <div className="text-sm text-blue-100">Objetivos</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{dashboardData?.totalKeyResults || 0}</div>
              <div className="text-sm text-blue-100">Key Results</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{dashboardData?.totalActions || 0}</div>
              <div className="text-sm text-blue-100">Ações</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-[#1a4b9f]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão KRs</CardTitle>
            <Target className="h-4 w-4 text-[#1a4b9f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a4b9f]">
              {krStats.total > 0 ? Math.round((krStats.completed / krStats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {krStats.completed} de {krStats.total} concluídos
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#1a4b9f] h-2 rounded-full transition-all duration-500"
                style={{ width: `${krStats.total > 0 ? (krStats.completed / krStats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#4db74f]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações Ativas</CardTitle>
            <Activity className="h-4 w-4 text-[#4db74f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#4db74f]">
              {actions?.filter((a: any) => a.status === 'in_progress').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Em progresso atualmente
            </p>
            <Badge variant="secondary" className="mt-2 bg-[#4db74f]/10 text-[#4db74f]">
              +{actions?.filter((a: any) => a.status === 'pending').length || 0} pendentes
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#00b39c]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checkpoints</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-[#00b39c]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#00b39c]">
              {checkpoints?.filter((c: any) => c.status === 'completed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Concluídos este período
            </p>
            <div className="flex items-center mt-2 text-xs">
              <Clock className="h-3 w-3 mr-1 text-orange-500" />
              {checkpoints?.filter((c: any) => c.status === 'pending').length || 0} pendentes
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#ef5e31]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Geral</CardTitle>
            <Gauge className="h-4 w-4 text-[#ef5e31]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#ef5e31]">
              {dashboardData?.overallProgress || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Progresso médio dos OKRs
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#ef5e31] h-2 rounded-full transition-all duration-500"
                style={{ width: `${dashboardData?.overallProgress || 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ações por Sub-região */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-[#1a4b9f]" />
              Ações por Sub-região
            </CardTitle>
            <CardDescription>Distribuição das ações por área geográfica</CardDescription>
          </CardHeader>
          <CardContent>
            {actionsBySubRegion.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actionsBySubRegion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill={FIERGS_COLORS.success} name="Concluídas" />
                  <Bar dataKey="inProgress" stackId="a" fill={FIERGS_COLORS.secondary} name="Em Progresso" />
                  <Bar dataKey="pending" stackId="a" fill={FIERGS_COLORS.warning} name="Pendentes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma ação encontrada por sub-região</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status das Ações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-[#4db74f]" />
              Status das Ações
            </CardTitle>
            <CardDescription>Distribuição atual do status das ações</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsChart>
                <Pie
                  data={actionStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {actionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Atingimento de Key Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2 text-[#00b39c]" />
            Atingimento de Key Results
          </CardTitle>
          <CardDescription>Performance individual dos principais Key Results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {krAchievement.slice(0, 8).map((kr, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm truncate max-w-md">{kr.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {kr.current} / {kr.target} ({kr.percentage}%)
                  </div>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <div className="w-32">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#00b39c] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(kr.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <Badge 
                    variant={kr.status === 'completed' ? 'default' : kr.status === 'active' ? 'secondary' : 'outline'}
                    className={
                      kr.status === 'completed' ? 'bg-green-500' : 
                      kr.status === 'active' ? 'bg-blue-500' : 
                      'border-yellow-500 text-yellow-600'
                    }
                  >
                    {kr.percentage}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Estratégicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-[#ef5e31]" />
            Indicadores Estratégicos
          </CardTitle>
          <CardDescription>Performance dos indicadores por Key Results associados</CardDescription>
        </CardHeader>
        <CardContent>
          {indicatorStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={indicatorStats} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    `${value}%`, 
                    name === 'completionRate' ? 'Taxa de Conclusão' : name
                  ]}
                />
                <Bar 
                  dataKey="completionRate" 
                  fill={FIERGS_COLORS.tertiary}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum indicador estratégico com Key Results</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}