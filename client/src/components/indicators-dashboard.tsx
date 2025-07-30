import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, DollarSign, GraduationCap, Building2, 
  Users, Clock, Calculator, BarChart3, Target 
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

export default function IndicatorsDashboard({ selectedQuarter, filters }: IndicatorsDashboardProps) {
  const { data: indicators, isLoading: indicatorsLoading } = useQuery({
    queryKey: ["/api/strategic-indicators"],
  });

  const { data: keyResults, isLoading: keyResultsLoading } = useQuery({
    queryKey: ["/api/key-results", selectedQuarter, filters],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const response = await fetch(`/api/quarters/${selectedQuarter}/data`, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar resultados-chave trimestrais");
        const data = await response.json();
        return data.keyResults || [];
      } else {
        const params = new URLSearchParams();
        if (filters?.serviceLineId) params.append('serviceLineId', filters.serviceLineId.toString());
        
        const response = await fetch(`/api/key-results?${params}`, { credentials: "include" });
        if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
        return response.json();
      }
    },
  });

  const getIndicatorIcon = (name: string) => {
    switch (name) {
      case "Sustentabilidade Operacional":
        return <TrendingUp className="h-5 w-5" />;
      case "Receita de Serviços":
        return <DollarSign className="h-5 w-5" />;
      case "Matrículas em Educação":
        return <GraduationCap className="h-5 w-5" />;
      case "Indústrias Atendidas em Saúde":
        return <Building2 className="h-5 w-5" />;
      case "Trabalhadores da Indústria Atendidos em Saúde":
        return <Users className="h-5 w-5" />;
      case "Matrículas Presenciais com Mais de 4 Horas":
        return <Clock className="h-5 w-5" />;
      case "Custo Hora Aluno":
        return <Calculator className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getIndicatorColor = (name: string) => {
    switch (name) {
      case "Sustentabilidade Operacional":
        return "text-green-600 bg-green-100";
      case "Receita de Serviços":
        return "text-blue-600 bg-blue-100";
      case "Matrículas em Educação":
        return "text-purple-600 bg-purple-100";
      case "Indústrias Atendidas em Saúde":
        return "text-orange-600 bg-orange-100";
      case "Trabalhadores da Indústria Atendidos em Saúde":
        return "text-indigo-600 bg-indigo-100";
      case "Matrículas Presenciais com Mais de 4 Horas":
        return "text-pink-600 bg-pink-100";
      case "Custo Hora Aluno":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getIndicatorStats = (indicatorId: number) => {
    if (!keyResults) return { count: 0, avgProgress: 0, inProgress: 0, completed: 0 };
    
    const relatedKRs = keyResults.filter((kr: any) => kr.strategicIndicatorId === indicatorId);
    const avgProgress = relatedKRs.length > 0 
      ? relatedKRs.reduce((sum: number, kr: any) => sum + parseFloat(kr.progress || "0"), 0) / relatedKRs.length
      : 0;
    
    const inProgress = relatedKRs.filter((kr: any) => kr.status === "active").length;
    const completed = relatedKRs.filter((kr: any) => kr.status === "completed").length;
    
    return {
      count: relatedKRs.length,
      avgProgress: avgProgress,
      inProgress,
      completed
    };
  };

  const getIndicatorChartData = () => {
    if (!indicators || !keyResults) return [];
    
    return indicators.map((indicator: any, index: number) => {
      const stats = getIndicatorStats(indicator.id);
      return {
        name: indicator.name.length > 20 ? indicator.name.substring(0, 20) + "..." : indicator.name,
        fullName: indicator.name,
        value: stats.count,
        progress: stats.avgProgress,
        color: COLORS[index % COLORS.length]
      };
    });
  };

  const isLoading = indicatorsLoading || keyResultsLoading;
  const chartData = getIndicatorChartData();
  const totalKRs = keyResults?.length || 0;

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
            <div className="text-2xl font-bold">{indicators?.length || 0}</div>
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
            <div className="text-2xl font-bold">
              {keyResults && keyResults.length > 0
                ? (keyResults.reduce((sum: number, kr: any) => sum + parseFloat(kr.progress || "0"), 0) / keyResults.length).toFixed(1)
                : "0"}%
            </div>
            <p className="text-xs text-muted-foreground">Entre todos os KRs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keyResults && keyResults.length > 0
                ? ((keyResults.filter((kr: any) => kr.status === "completed").length / keyResults.length) * 100).toFixed(0)
                : "0"}%
            </div>
            <p className="text-xs text-muted-foreground">KRs concluídos</p>
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
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ value }) => value > 0 ? value : ""}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progresso por Indicador</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value, name, props) => [`${value}%`, props.payload.fullName]} />
                  <Bar dataKey="progress" fill="#0088FE" />
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
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : (
          indicators?.map((indicator: any) => {
            const stats = getIndicatorStats(indicator.id);
            const colorClass = getIndicatorColor(indicator.name);
            
            return (
              <Card key={indicator.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        {getIndicatorIcon(indicator.name)}
                      </div>
                      <div>
                        <CardTitle className="text-base line-clamp-2">{indicator.name}</CardTitle>
                        {indicator.unit && (
                          <p className="text-xs text-muted-foreground mt-1">Unidade: {indicator.unit}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">KRs Associados:</span>
                      <span className="font-medium">{stats.count}</span>
                    </div>
                    
                    {stats.count > 0 && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progresso:</span>
                            <span className="font-medium">{stats.avgProgress.toFixed(1)}%</span>
                          </div>
                          <Progress value={stats.avgProgress} className="h-2" />
                        </div>
                        
                        <div className="flex gap-2 text-xs">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            {stats.inProgress} em progresso
                          </Badge>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {stats.completed} concluídos
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}