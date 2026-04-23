import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, DollarSign, GraduationCap, Building2, 
  Users, Clock, Calculator, BarChart3, Target, CheckCircle2, Circle, AlertCircle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface IndicatorsDashboardProps {
  selectedQuarter?: string;
  filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const INDICATOR_ICONS = [
  <TrendingUp className="h-5 w-5" />,
  <DollarSign className="h-5 w-5" />,
  <GraduationCap className="h-5 w-5" />,
  <Building2 className="h-5 w-5" />,
  <Users className="h-5 w-5" />,
  <Clock className="h-5 w-5" />,
  <Calculator className="h-5 w-5" />,
  <BarChart3 className="h-5 w-5" />,
  <Target className="h-5 w-5" />,
];

const INDICATOR_COLORS = [
  "text-green-600 bg-green-100",
  "text-blue-600 bg-blue-100",
  "text-purple-600 bg-purple-100",
  "text-orange-600 bg-orange-100",
  "text-indigo-600 bg-indigo-100",
  "text-pink-600 bg-pink-100",
  "text-red-600 bg-red-100",
  "text-teal-600 bg-teal-100",
  "text-yellow-600 bg-yellow-100",
];

export default function IndicatorsDashboard({ selectedQuarter, filters }: IndicatorsDashboardProps) {
  const { data: indicators, isLoading: indicatorsLoading } = useQuery({
    queryKey: ["/api/strategic-indicators"],
  });

  const { data: keyResults, isLoading: keyResultsLoading } = useQuery<any[]>({
    queryKey: ["/api/key-results", selectedQuarter, filters?.regionId, filters?.subRegionId, filters?.serviceLineId],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append("regionId", filters.regionId.toString());
        if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
        const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ""}`;
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar resultados-chave trimestrais");
        const data = await response.json();
        return data.keyResults || [];
      } else {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append("regionId", filters.regionId.toString());
        if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
        const url = `/api/key-results${params.toString() ? `?${params}` : ""}`;
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
        return response.json();
      }
    },
    refetchOnWindowFocus: false,
  });

  const { data: checkpoints, isLoading: checkpointsLoading } = useQuery<any[]>({
    queryKey: ["/api/checkpoints"],
    queryFn: async () => {
      const response = await fetch("/api/checkpoints", { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao carregar acompanhamentos");
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  const getIndicatorIcon = (_name: string, index: number) => INDICATOR_ICONS[index % INDICATOR_ICONS.length];
  const getIndicatorColor = (_name: string, index: number) => INDICATOR_COLORS[index % INDICATOR_COLORS.length];

  const getKRsForIndicator = (indicatorId: number): any[] => {
    if (!Array.isArray(keyResults)) return [];
    return keyResults.filter((kr: any) => {
      const ids = Array.isArray(kr.strategicIndicatorIds) ? kr.strategicIndicatorIds : [];
      return ids.includes(indicatorId);
    });
  };

  const getIndicatorStats = (indicatorId: number) => {
    const relatedKRs = getKRsForIndicator(indicatorId);
    if (relatedKRs.length === 0) return { count: 0, avgProgress: 0, inProgress: 0, completed: 0, delayed: 0 };

    const avgProgress = relatedKRs.reduce((sum: number, kr: any) => sum + parseFloat(kr.progress || "0"), 0) / relatedKRs.length;
    const inProgress = relatedKRs.filter((kr: any) => kr.status === "active").length;
    const completed = relatedKRs.filter((kr: any) => kr.status === "completed").length;
    const delayed = relatedKRs.filter((kr: any) => kr.status === "delayed").length;

    return { count: relatedKRs.length, avgProgress, inProgress, completed, delayed };
  };

  const getCheckpointsForIndicator = (indicatorId: number) => {
    const relatedKRs = getKRsForIndicator(indicatorId);
    const krIds = relatedKRs.map((kr: any) => kr.id);
    if (!Array.isArray(checkpoints)) return { total: 0, completed: 0, pending: 0, inProgress: 0 };

    const related = checkpoints.filter((cp: any) => krIds.includes(cp.keyResultId));
    return {
      total: related.length,
      completed: related.filter((cp: any) => cp.status === "completed").length,
      pending: related.filter((cp: any) => cp.status === "pending").length,
      inProgress: related.filter((cp: any) => cp.status === "in_progress").length,
    };
  };

  const getIndicatorChartData = () => {
    if (!Array.isArray(indicators) || !Array.isArray(keyResults)) return [];
    return indicators.map((indicator: any, index: number) => {
      const stats = getIndicatorStats(indicator.id);
      return {
        name: indicator.name.length > 20 ? indicator.name.substring(0, 20) + "..." : indicator.name,
        fullName: indicator.name,
        value: stats.count,
        progress: parseFloat(stats.avgProgress.toFixed(1)),
        color: COLORS[index % COLORS.length],
      };
    });
  };

  const isLoading = indicatorsLoading || keyResultsLoading || checkpointsLoading;
  const chartData = getIndicatorChartData();
  const totalKRs = Array.isArray(keyResults) ? keyResults.length : 0;
  const totalCheckpoints = Array.isArray(checkpoints) ? checkpoints.length : 0;
  const completedCheckpoints = Array.isArray(checkpoints)
    ? checkpoints.filter((cp: any) => cp.status === "completed").length
    : 0;
  const avgProgress =
    totalKRs > 0 && Array.isArray(keyResults)
      ? keyResults.reduce((sum: number, kr: any) => sum + parseFloat(kr.progress || "0"), 0) / totalKRs
      : 0;
  const completionRate =
    totalKRs > 0 && Array.isArray(keyResults)
      ? (keyResults.filter((kr: any) => kr.status === "completed").length / totalKRs) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Indicadores</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(indicators) ? indicators.length : 0}</div>
            <p className="text-xs text-muted-foreground">Indicadores estratégicos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KRs Vinculados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKRs}</div>
            <p className="text-xs text-muted-foreground">Resultados-chave associados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Entre todos os KRs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acompanhamentos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedCheckpoints}/{totalCheckpoints}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalCheckpoints > 0
                ? `${((completedCheckpoints / totalCheckpoints) * 100).toFixed(0)}% concluídos`
                : "Nenhum acompanhamento"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Indicador</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ value }) => (value > 0 ? value : "")}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.filter((d) => d.value > 0).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, _name, props) => [value, props.payload.fullName]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum KR vinculado a indicadores
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progresso por Indicador</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.filter((d) => d.value > 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value, _name, props) => [`${value}%`, props.payload.fullName]} />
                  <Bar dataKey="progress" fill="#0088FE" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicator Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          : Array.isArray(indicators) &&
            indicators.map((indicator: any, idx: number) => {
              const stats = getIndicatorStats(indicator.id);
              const cpStats = getCheckpointsForIndicator(indicator.id);
              const colorClass = getIndicatorColor(indicator.name, idx);

              return (
                <Card key={indicator.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                        {getIndicatorIcon(indicator.name, idx)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold line-clamp-2 leading-snug">
                          {indicator.name}
                        </CardTitle>
                        {indicator.unit && (
                          <p className="text-xs text-muted-foreground mt-0.5">Unidade: {indicator.unit}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* KR Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">KRs associados:</span>
                      <span className="font-semibold">{stats.count}</span>
                    </div>

                    {stats.count > 0 ? (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progresso médio:</span>
                            <span className="font-semibold">{stats.avgProgress.toFixed(1)}%</span>
                          </div>
                          <Progress value={stats.avgProgress} className="h-1.5" />
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {stats.inProgress > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0">
                              {stats.inProgress} em progresso
                            </Badge>
                          )}
                          {stats.completed > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-0">
                              {stats.completed} concluídos
                            </Badge>
                          )}
                          {stats.delayed > 0 && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 border-0">
                              {stats.delayed} atrasados
                            </Badge>
                          )}
                        </div>

                        {/* Checkpoints / Acompanhamentos */}
                        {cpStats.total > 0 && (
                          <div className="border-t pt-2 mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Acompanhamentos</p>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">
                                {cpStats.completed}/{cpStats.total} realizados
                              </span>
                              <span className="font-medium">
                                {cpStats.total > 0
                                  ? ((cpStats.completed / cpStats.total) * 100).toFixed(0)
                                  : 0}%
                              </span>
                            </div>
                            <Progress
                              value={cpStats.total > 0 ? (cpStats.completed / cpStats.total) * 100 : 0}
                              className="h-1 bg-gray-100"
                            />
                            <div className="flex gap-2 mt-1.5 flex-wrap">
                              {cpStats.completed > 0 && (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {cpStats.completed} ok
                                </span>
                              )}
                              {cpStats.inProgress > 0 && (
                                <span className="flex items-center gap-1 text-xs text-blue-600">
                                  <Circle className="h-3 w-3" />
                                  {cpStats.inProgress} em andamento
                                </span>
                              )}
                              {cpStats.pending > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <AlertCircle className="h-3 w-3" />
                                  {cpStats.pending} pendentes
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Nenhum KR vinculado a este indicador
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
