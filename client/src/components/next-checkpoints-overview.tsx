import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Target, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KeyResult {
  id: number;
  title: string;
  targetValue: string;
  currentValue: string;
  unit?: string;
  status: string;
  nextCheckpoint?: {
    id: number;
    title: string;
    dueDate: string;
    targetValue: string;
    actualValue: string;
    status: string;
  };
  objective: {
    id: number;
    title: string;
  };
}

export function NextCheckpointsOverview() {
  const { data: keyResults, isLoading } = useQuery<KeyResult[]>({
    queryKey: ['/api/key-results'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Próximos Checkpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter key results that have next checkpoints
  const keyResultsWithNextCheckpoints = keyResults?.filter(kr => kr.nextCheckpoint) || [];

  if (keyResultsWithNextCheckpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Próximos Checkpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum checkpoint pendente encontrado nos resultados-chave acessíveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by due date
  const sortedKeyResults = keyResultsWithNextCheckpoints.sort((a, b) => {
    const dateA = new Date(a.nextCheckpoint!.dueDate);
    const dateB = new Date(b.nextCheckpoint!.dueDate);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Próximos Checkpoints
          <Badge variant="outline">{sortedKeyResults.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedKeyResults.slice(0, 5).map((keyResult) => {
            const checkpoint = keyResult.nextCheckpoint!;
            const dueDate = new Date(checkpoint.dueDate);
            const isOverdue = dueDate < new Date();
            const currentValue = parseFloat(keyResult.currentValue) || 0;
            const targetValue = parseFloat(keyResult.targetValue) || 1;
            const progress = Math.min((currentValue / targetValue) * 100, 100);

            return (
              <div key={keyResult.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{keyResult.title}</h4>
                    <p className="text-xs text-muted-foreground">{keyResult.objective.title}</p>
                  </div>
                  <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs">
                    {checkpoint.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(dueDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {checkpoint.targetValue} {keyResult.unit}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progresso</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}