import { Target, Key, TrendingUp, CheckSquare, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KPICardsProps {
  data?: {
    totalObjectives: number;
    totalKeyResults: number;
    averageProgress: number;
    totalActions: number;
    completedActions: number;
    overallProgress: number;
  };
  isLoading: boolean;
}

export default function KPICards({ data, isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <Skeleton className="w-16 h-4" />
              </div>
              <Skeleton className="w-16 h-8 mb-1" />
              <Skeleton className="w-24 h-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>Erro ao carregar dados</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = [
    {
      title: "Objetivos Ativos",
      value: data.totalObjectives,
      icon: Target,
      color: "bg-blue-100",
      iconColor: "text-primary",
      growth: "+12%",
      isPositive: true,
    },
    {
      title: "Resultados-Chave",
      value: data.totalKeyResults,
      icon: Key,
      color: "bg-green-100",
      iconColor: "text-secondary",
      growth: "+8%",
      isPositive: true,
    },
    {
      title: "Taxa de Atingimento",
      value: `${data.averageProgress.toFixed(1)}%`,
      icon: TrendingUp,
      color: "bg-orange-100",
      iconColor: "text-accent",
      growth: data.averageProgress >= 70 ? "+5%" : "-3%",
      isPositive: data.averageProgress >= 70,
    },
    {
      title: "Ações em Andamento",
      value: data.totalActions - data.completedActions,
      icon: CheckSquare,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
      growth: "+15%",
      isPositive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const GrowthIcon = kpi.isPositive ? ArrowUp : ArrowDown;
        
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${kpi.color} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  kpi.isPositive ? "text-secondary" : "text-destructive"
                }`}>
                  <GrowthIcon className="mr-1 h-3 w-3" />
                  <span>{kpi.growth}</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-1">
                {kpi.value}
              </h3>
              <p className="text-muted-foreground text-sm">
                {kpi.title}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
