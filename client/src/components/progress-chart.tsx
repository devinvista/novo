import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useState } from "react";

interface ProgressChartProps {
  objectives?: any[];
}

export default function ProgressChart({ objectives }: ProgressChartProps) {
  const [chartType, setChartType] = useState("progress");

  if (!objectives || objectives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso dos Objetivos</CardTitle>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progress">Progresso por Objetivo</SelectItem>
                <SelectItem value="region">Progresso por Região</SelectItem>
                <SelectItem value="timeline">Linha do Tempo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
            <div className="text-center text-muted-foreground">
              <BarChart className="h-12 w-12 mx-auto mb-2" />
              <p>Nenhum dado disponível para exibir</p>
              <p className="text-sm">Crie objetivos para visualizar o progresso</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data based on chart type
  const getChartData = () => {
    switch (chartType) {
      case "progress":
        return objectives.map((obj, index) => ({
          name: `Obj ${index + 1}`,
          fullName: obj.title,
          progress: parseFloat(obj.progress || "0"),
          fill: parseFloat(obj.progress || "0") >= 70 ? "#388E3C" : 
                parseFloat(obj.progress || "0") >= 40 ? "#F57C00" : "#D32F2F"
        }));

      case "region":
        const regionData = objectives.reduce((acc: any, obj) => {
          const regionName = obj.region?.name || obj.subRegion?.name || "Sem região";
          if (!acc[regionName]) {
            acc[regionName] = { total: 0, sum: 0 };
          }
          acc[regionName].total += 1;
          acc[regionName].sum += parseFloat(obj.progress || "0");
          return acc;
        }, {});

        return Object.entries(regionData).map(([name, data]: [string, any]) => ({
          name: name.length > 15 ? name.substring(0, 15) + "..." : name,
          fullName: name,
          progress: data.sum / data.total,
          count: data.total,
          fill: "#1976D2"
        }));

      case "timeline":
        const monthlyData = objectives.reduce((acc: any, obj) => {
          const month = new Date(obj.createdAt).toISOString().substring(0, 7);
          if (!acc[month]) {
            acc[month] = { created: 0, avgProgress: 0, totalProgress: 0 };
          }
          acc[month].created += 1;
          acc[month].totalProgress += parseFloat(obj.progress || "0");
          acc[month].avgProgress = acc[month].totalProgress / acc[month].created;
          return acc;
        }, {});

        return Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6) // Last 6 months
          .map(([month, data]: [string, any]) => ({
            name: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
            created: data.created,
            progress: data.avgProgress
          }));

      default:
        return [];
    }
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{data.fullName || label}</p>
          {chartType === "progress" && (
            <p className="text-sm text-muted-foreground">
              Progresso: {payload[0].value.toFixed(1)}%
            </p>
          )}
          {chartType === "region" && (
            <>
              <p className="text-sm text-muted-foreground">
                Progresso médio: {payload[0].value.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                Objetivos: {data.count}
              </p>
            </>
          )}
          {chartType === "timeline" && (
            <>
              <p className="text-sm text-muted-foreground">
                Criados: {data.created}
              </p>
              <p className="text-sm text-muted-foreground">
                Progresso médio: {data.progress.toFixed(1)}%
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Progresso dos Objetivos</CardTitle>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="progress">Progresso por Objetivo</SelectItem>
              <SelectItem value="region">Progresso por Região</SelectItem>
              <SelectItem value="timeline">Linha do Tempo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "timeline" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="progress" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
