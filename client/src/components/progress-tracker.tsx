import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface ProgressItem {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "error";
}

interface ProgressTrackerProps {
  items: ProgressItem[];
  title?: string;
  description?: string;
}

export default function ProgressTracker({ 
  items, 
  title = "Progresso da Migração",
  description = "Acompanhe o status de cada etapa da migração"
}: ProgressTrackerProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">Em andamento</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const completedCount = items.filter(item => item.status === "completed").length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{completedCount}/{totalCount}</div>
            <div className="text-sm text-muted-foreground">{Math.round(progressPercentage)}% concluído</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border">
            {getStatusIcon(item.status)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{item.title}</h4>
                {getStatusBadge(item.status)}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}