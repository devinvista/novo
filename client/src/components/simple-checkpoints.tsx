import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Target, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SimpleCheckpointsProps {
  keyResultId?: number;
}

export default function SimpleCheckpoints({ keyResultId }: SimpleCheckpointsProps) {
  const [selectedKeyResultId, setSelectedKeyResultId] = useState(keyResultId);

  const { data: keyResults, isLoading: keyResultsLoading } = useQuery({
    queryKey: ["/api/key-results"],
    queryFn: () => {
      return fetch("/api/key-results", { credentials: "include" }).then(r => r.json()).then(data =>
        Array.isArray(data) ? data : []
      ).catch(() => []);
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: checkpoints, isLoading: checkpointsLoading } = useQuery({
    queryKey: ["/api/checkpoints", selectedKeyResultId],
    queryFn: () => {
      const url = selectedKeyResultId 
        ? `/api/checkpoints?keyResultId=${selectedKeyResultId}` 
        : "/api/checkpoints";
      return fetch(url, { credentials: "include" }).then(r => r.json()).then(data =>
        Array.isArray(data) ? data : []
      ).catch(() => []);
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  if (keyResultsLoading || checkpointsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-3/4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedKeyResult = keyResults?.find((kr: any) => kr.id === selectedKeyResultId);
  const filteredCheckpoints = checkpoints || [];
  const totalCheckpoints = filteredCheckpoints.length;
  const completedCheckpoints = filteredCheckpoints.filter((cp: any) => cp.status === "completed").length;
  const progressPercentage = totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Checkpoints de Progresso
          </CardTitle>
          <CardDescription>
            Acompanhe e atualize o progresso dos resultados-chave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Select 
              value={selectedKeyResultId?.toString() || "all"} 
              onValueChange={(value) => setSelectedKeyResultId(value === "all" ? undefined : parseInt(value))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por resultado-chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os resultados-chave</SelectItem>
                {keyResults?.map((kr: any) => (
                  <SelectItem key={kr.id} value={kr.id.toString()}>
                    {kr.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Badge variant="outline">
                {totalCheckpoints} checkpoint{totalCheckpoints !== 1 ? 's' : ''}
              </Badge>
              {completedCheckpoints > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  {completedCheckpoints} concluído{completedCheckpoints !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      {selectedKeyResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedKeyResult.title}</CardTitle>
            <CardDescription>
              Objetivo: {selectedKeyResult.objective?.title || 'Não especificado'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso dos Checkpoints</span>
                <span className="text-sm text-muted-foreground">
                  {completedCheckpoints}/{totalCheckpoints} concluídos
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkpoints List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Checkpoints</CardTitle>
          <CardDescription>
            {selectedKeyResult 
              ? `Checkpoints para: ${selectedKeyResult.title}`
              : 'Todos os checkpoints'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCheckpoints.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                Nenhum checkpoint encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedKeyResult 
                  ? 'Este resultado-chave ainda não possui checkpoints configurados.'
                  : 'Não há checkpoints disponíveis no momento.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCheckpoints.map((checkpoint: any) => (
                <div key={checkpoint.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{checkpoint.title || `Checkpoint ${checkpoint.id}`}</h4>
                      <p className="text-sm text-muted-foreground">
                        {checkpoint.keyResult?.title || 'Resultado-chave não especificado'}
                      </p>
                    </div>
                    <Badge variant={checkpoint.status === 'completed' ? 'default' : 'secondary'}>
                      {checkpoint.status === 'completed' ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {checkpoint.dueDate && (
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        <span>
                          {format(new Date(checkpoint.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    
                    {checkpoint.targetValue && (
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>Meta: {checkpoint.targetValue}</span>
                      </div>
                    )}
                    
                    {checkpoint.actualValue && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>Atual: {checkpoint.actualValue}</span>
                      </div>
                    )}
                  </div>
                  
                  {checkpoint.notes && (
                    <p className="text-sm bg-muted p-2 rounded">
                      {checkpoint.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}