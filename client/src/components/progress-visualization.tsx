import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
import { parseDecimalBR } from "@/lib/formatters";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

interface ProgressVisualizationProps {
  filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  };
}

export default function ProgressVisualization({ filters }: ProgressVisualizationProps) {
  const [viewType, setViewType] = useState<"overview" | "objectives" | "krs" | "trends">("overview");
  const queryClient = useQueryClient();

  const { data: kpis } = useQuery({
    queryKey: ["/api/dashboard/kpis", JSON.stringify(filters)],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.regionId) params.append('regionId', filters.regionId.toString());
      if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
      
      const response = await fetch(`/api/dashboard/kpis?${params}`);
      if (!response.ok) throw new Error("Erro ao carregar KPIs");
      return response.json();
    },
  });

  const { data: objectives } = useQuery({
    queryKey: ["/api/objectives", JSON.stringify(filters)],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.regionId) params.append('regionId', filters.regionId.toString());
      if (filters?.subRegionId) params.append('subRegionId', filters.subRegionId.toString());
      
      const response = await fetch(`/api/objectives?${params}`);
      if (!response.ok) throw new Error("Erro ao carregar objetivos");
      return response.json();
    },
  });

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results", JSON.stringify(filters)],
    queryFn: async () => {
      const response = await fetch("/api/key-results");
      if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
      return response.json();
    },
    staleTime: 0,
  });

  // Force invalidation when filters change
  useEffect(() => {
    console.log('🔄 ProgressVisualization: Filters changed, invalidating queries:', filters);
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
    queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
    queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
  }, [filters, queryClient]);

  // Prepare data for charts
  const prepareOverviewData = () => {
    if (!kpis) return [];
    
    return [
      {
        name: "Objetivos",
        total: kpis.totalObjectives,
        completed: Math.round(kpis.totalObjectives * (kpis.averageProgress / 100)),
        progress: kpis.averageProgress,
      },
      {
        name: "Key Results",
        total: kpis.totalKeyResults,
        completed: Math.round(kpis.totalKeyResults * (kpis.averageProgress / 100)),
        progress: kpis.averageProgress,
      },
      {
        name: "Ações",
        total: kpis.totalActions,
        completed: kpis.completedActions,
        progress: kpis.totalActions > 0 ? (kpis.completedActions / kpis.totalActions) * 100 : 0,
      },
    ];
  };

  const prepareObjectivesData = () => {
    if (!objectives) return [];
    
    return objectives.map((obj: any, index: number) => ({
      name: obj.title.length > 20 ? obj.title.substring(0, 20) + "..." : obj.title,
      fullName: obj.title,
      progress: parseFloat(obj.progress || "0"),
      status: obj.status,
      color: COLORS[index % COLORS.length],
    }));
  };

  const prepareKeyResultsData = () => {
    if (!keyResults) return [];
    
    return keyResults.map((kr: any, index: number) => ({
      name: kr.title.length > 15 ? kr.title.substring(0, 15) + "..." : kr.title,
      fullName: kr.title,
      current: parseDecimalBR(kr.currentValue || "0"),
      target: parseDecimalBR(kr.targetValue || "0"),
      progress: parseDecimalBR(kr.progress || "0"),
      status: kr.status,
      color: COLORS[index % COLORS.length],
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "active": return "bg-blue-500";
      case "delayed": return "bg-yellow-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Concluído";
      case "active": return "Ativo";
      case "delayed": return "Atrasado";
      case "cancelled": return "Cancelado";
      default: return "Pendente";
    }
  };

  const overviewData = prepareOverviewData();
  const objectivesData = prepareObjectivesData();
  const keyResultsData = prepareKeyResultsData();

  return (
    <div className="space-y-6">
      {/* View Type Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Visualização de Progresso</h3>
        <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione a visualização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Visão Geral</SelectItem>
            <SelectItem value="objectives">Objetivos</SelectItem>
            <SelectItem value="krs">Resultados-Chave</SelectItem>
            <SelectItem value="trends">Tendências</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Charts */}
      {viewType === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Progresso Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overviewData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#0088FE" name="Concluído" />
                  <Bar dataKey="total" fill="#00C49F" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={overviewData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, progress }) => `${name}: ${progress.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="progress"
                  >
                    {overviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Objectives View */}
      {viewType === "objectives" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progresso por Objetivo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={objectivesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value}%`,
                      props.payload.fullName
                    ]}
                  />
                  <Bar dataKey="progress" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h4 className="text-md font-semibold">Detalhes dos Objetivos</h4>
            {objectivesData.map((obj: any, index: number) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{obj.fullName}</h5>
                    <Badge className={getStatusColor(obj.status)}>
                      {getStatusLabel(obj.status)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{obj.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={obj.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Key Results View */}
      {viewType === "krs" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progresso dos Resultados-Chave</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={keyResultsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => [
                      value,
                      name === "current" ? "Atual" : "Meta",
                      props.payload.fullName
                    ]}
                  />
                  <Bar dataKey="current" fill="#0088FE" name="Valor Atual" />
                  <Bar dataKey="target" fill="#00C49F" name="Valor Meta" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h4 className="text-md font-semibold">Detalhes dos Resultados-Chave</h4>
            {keyResultsData.map((kr: any, index: number) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{kr.fullName}</h5>
                    <Badge className={getStatusColor(kr.status)}>
                      {getStatusLabel(kr.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Atual:</span>
                      <p className="font-semibold">{kr.current}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Meta:</span>
                      <p className="font-semibold">{kr.target}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Progresso:</span>
                      <p className="font-semibold">{kr.progress.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={kr.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Trends View */}
      {viewType === "trends" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendências de Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={objectivesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                  dot={{ fill: "#0088FE", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}