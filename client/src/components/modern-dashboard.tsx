import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { formatNumberBR, formatDecimalBR } from "@/lib/formatters";
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

interface ModernDashboardProps {
  filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  };
}

export default function ModernDashboard({ filters }: ModernDashboardProps) {
  const { selectedQuarter } = useQuarterlyFilter();
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard/kpis", selectedQuarter, JSON.stringify(filters)],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedQuarter && selectedQuarter !== 'all') params.append('quarter', selectedQuarter);
      if (filters?.regionId) params.append('regionId', filters.regionId.toString());
      if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
      if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
      
      const url = `/api/dashboard/kpis${params.toString() ? `?${params}` : ''}`;
      return fetch(url, { credentials: "include" }).then(r => r.json());
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ["/api/objectives", selectedQuarter, JSON.stringify(filters)],
    queryFn: () => {
      if (selectedQuarter && selectedQuarter !== 'all') {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ''}`;
        return fetch(url, { credentials: "include" }).then(r => r.json()).then(data => {
          return Array.isArray(data.objectives) ? data.objectives : [];
        }).catch(() => []);
      } else {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/objectives${params.toString() ? `?${params}` : ''}`;
        return fetch(url, { credentials: "include" }).then(r => r.json()).then(data => {
          return Array.isArray(data) ? data : [];
        }).catch(() => []);
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results", selectedQuarter, JSON.stringify(filters)],
    queryFn: () => {
      if (selectedQuarter && selectedQuarter !== 'all') {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ''}`;
        return fetch(url, { credentials: "include" }).then(r => r.json()).then(data => {
          return Array.isArray(data.keyResults) ? data.keyResults : [];
        }).catch(() => []);
      } else {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/key-results${params.toString() ? `?${params}` : ''}`;
        return fetch(url, { credentials: "include" }).then(r => r.json()).then(data => {
          return Array.isArray(data) ? data : [];
        }).catch(() => []);
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["/api/actions", selectedQuarter, JSON.stringify(filters)],
    queryFn: () => {
      if (selectedQuarter && selectedQuarter !== 'all') {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ''}`;
        return fetch(url, { credentials: "include" }).then(r => r.json()).then(data => {
          return Array.isArray(data.actions) ? data.actions : [];
        }).catch(() => []);
      } else {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append('regionId', filters.regionId.toString());
        if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const url = `/api/actions${params.toString() ? `?${params}` : ''}`;
        return fetch(url, { credentials: "include" }).then(r => r.json()).then(data => {
          return Array.isArray(data) ? data : [];
        }).catch(() => []);
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const { data: checkpoints = [] } = useQuery({
    queryKey: ["/api/checkpoints"],
    queryFn: () => {
      return fetch("/api/checkpoints", { credentials: "include" }).then(r => r.json()).then(data => 
        Array.isArray(data) ? data : []
      ).catch(() => []);
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: subRegions = [] } = useQuery({
    queryKey: ["/api/sub-regions"],
    queryFn: () => {
      return fetch("/api/sub-regions", { credentials: "include" }).then(r => r.json()).then(data => 
        Array.isArray(data) ? data : []
      ).catch(() => []);
    }
  });

  const { data: strategicIndicators = [] } = useQuery({
    queryKey: ["/api/strategic-indicators"],
    queryFn: () => {
      return fetch("/api/strategic-indicators", { credentials: "include" }).then(r => r.json()).then(data => 
        Array.isArray(data) ? data : []
      ).catch(() => []);
    }
  });

  const { data: availableQuarters = [] } = useQuery({
    queryKey: ["/api/quarters"],
    queryFn: () => {
      return fetch("/api/quarters", { credentials: "include" }).then(r => r.json()).then(data => 
        Array.isArray(data) ? data : []
      ).catch(() => []);
    }
  });

  const { data: quarterlyStats = {} } = useQuery({
    queryKey: ["/api/quarters/stats"],
    queryFn: () => {
      return fetch("/api/quarters/stats", { credentials: "include" }).then(r => r.json()).then(data => 
        data || {}
      ).catch(() => ({}));
    }
  });

  // Force invalidation when filters change
  useEffect(() => {
    console.log('🔄 ModernDashboard: Filters changed, invalidating queries:', filters);
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
    queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
    queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
    queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
  }, [filters, queryClient]);

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
  const actionsBySubRegion = (subRegions || []).map((subRegion: any) => {
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
  const indicatorStats = (strategicIndicators || []).map((indicator: any) => {
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

  // Dados trimestrais para o gráfico
  const quarterlyData = availableQuarters?.map((quarter: any) => {
    const quarterValue = typeof quarter === 'string' ? quarter : quarter.id;
    const stats = quarterlyStats?.[quarterValue];
    
    let quarterName;
    if (typeof quarter === 'string' && quarter.includes('-Q')) {
      const [year, q] = quarter.split('-Q');
      const quarterNames = ['1º Tri', '2º Tri', '3º Tri', '4º Tri'];
      quarterName = `${quarterNames[parseInt(q) - 1]} ${year}`;
    } else {
      quarterName = quarter?.name || quarterValue || quarter;
    }
    
    return {
      name: quarterName,
      quarter: quarterValue,
      objetivos: stats?.objectives || 0,
      keyResults: stats?.keyResults || 0,
      acoes: stats?.actions || 0,
      checkpoints: stats?.checkpoints || 0
    };
  }) || [];

  return (
    <div className="space-y-8">
      {/* Header com gradiente FIERGS */}
      <div className="bg-gradient-to-r from-[#1a4b9f] to-[#0091d6] rounded-xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Executivo</h1>
            <p className="text-blue-100">Visão estratégica dos OKRs organizacionais</p>
            {selectedQuarter && (
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  Período: {(() => {
                    if (typeof selectedQuarter === 'string' && selectedQuarter.includes('-Q')) {
                      const [year, q] = selectedQuarter.split('-Q');
                      const quarterNames = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];
                      return `${quarterNames[parseInt(q) - 1]} ${year}`;
                    }
                    return selectedQuarter;
                  })()}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="hidden sm:flex items-center space-x-4">
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

      {/* Resumo Trimestral */}
      {quarterlyStats && Object.keys(quarterlyStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Período Trimestral</CardTitle>
            <CardDescription>Visão detalhada da distribuição de OKRs nos trimestres</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableQuarters?.slice(0, 6).map((quarter: any) => {
                const quarterValue = typeof quarter === 'string' ? quarter : quarter.id;
                const stats = quarterlyStats[quarterValue];
                
                let quarterName;
                if (typeof quarter === 'string' && quarter.includes('-Q')) {
                  const [year, q] = quarter.split('-Q');
                  const quarterNames = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];
                  quarterName = `${quarterNames[parseInt(q) - 1]} ${year}`;
                } else {
                  quarterName = quarter?.name || quarterValue || quarter;
                }
                
                return (
                  <div key={quarterValue} className="p-4 border rounded-lg bg-gray-50">
                    <div className="font-semibold text-sm text-[#1a4b9f] mb-2">
                      {quarterName}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Objetivos:</span>
                        <Badge variant="secondary" className="bg-[#1a4b9f]/10 text-[#1a4b9f]">
                          {stats?.objectives || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Key Results:</span>
                        <Badge variant="secondary" className="bg-[#00b39c]/10 text-[#00b39c]">
                          {stats?.keyResults || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Ações:</span>
                        <Badge variant="secondary" className="bg-[#4db74f]/10 text-[#4db74f]">
                          {stats?.actions || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Checkpoints:</span>
                        <Badge variant="secondary" className="bg-[#ef5e31]/10 text-[#ef5e31]">
                          {stats?.checkpoints || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                  label={({ name, percent }) => `${name} ${formatDecimalBR(percent * 100, 0)}%`}
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
            {krAchievement.slice(0, 8).map((kr: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm truncate max-w-md">{kr.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatNumberBR(kr.current)} / {formatNumberBR(kr.target)} ({formatDecimalBR(kr.percentage, 1)}%)
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
                    variant={kr.status === 'completed' ? 'success' : kr.status === 'active' ? 'info' : 'warning'}
                  >
                    {formatDecimalBR(kr.percentage, 1)}%
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

      {/* Distribuição Trimestral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-[#0091d6]" />
            Distribuição Trimestral
          </CardTitle>
          <CardDescription>Evolução dos OKRs ao longo dos trimestres</CardDescription>
        </CardHeader>
        <CardContent>
          {quarterlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="objetivos" fill={FIERGS_COLORS.primary} name="Objetivos" />
                <Bar dataKey="keyResults" fill={FIERGS_COLORS.tertiary} name="Key Results" />
                <Bar dataKey="acoes" fill={FIERGS_COLORS.secondary} name="Ações" />
                <Bar dataKey="checkpoints" fill={FIERGS_COLORS.quaternary} name="Checkpoints" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Carregando dados trimestrais...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}