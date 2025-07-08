import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Target, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CheckpointUpdaterProps {
  keyResultId?: number;
}

export default function CheckpointUpdaterEnhanced({ keyResultId }: CheckpointUpdaterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ["/api/checkpoints", keyResultId],
    queryFn: async () => {
      const url = keyResultId ? `/api/checkpoints?keyResultId=${keyResultId}` : "/api/checkpoints";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar checkpoints");
      return response.json();
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!keyResultId) throw new Error("Key Result ID é necessário");
      await apiRequest("POST", `/api/key-results/${keyResultId}/regenerate-checkpoints`, {});
    },
    onSuccess: () => {
      toast({
        title: "Checkpoints regenerados",
        description: "Os checkpoints foram regenerados com base na frequência do resultado-chave.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao regenerar checkpoints.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="flex items-center gap-2">
      <RefreshCw className="h-4 w-4 animate-spin" />
      Carregando checkpoints...
    </div>;
  }

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Checkpoints
          </CardTitle>
          <CardDescription>
            Nenhum checkpoint encontrado para este resultado-chave
          </CardDescription>
        </CardHeader>
        {keyResultId && (
          <CardContent>
            <Button 
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              {regenerateMutation.isPending ? "Gerando..." : "Gerar Checkpoints"}
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // Calculate overall progress
  const totalTarget = checkpoints.reduce((sum: number, cp: any) => sum + parseFloat(cp.targetValue), 0);
  const totalActual = checkpoints.reduce((sum: number, cp: any) => sum + parseFloat(cp.actualValue), 0);
  const overallProgress = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  const completedCheckpoints = checkpoints.filter((cp: any) => cp.status === "completed").length;
  const atRiskCheckpoints = checkpoints.filter((cp: any) => ["at_risk", "behind"].includes(cp.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Checkpoints</h3>
          <Badge variant="outline">{checkpoints.length} períodos</Badge>
        </div>
        
        {keyResultId && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
            Regenerar
          </Button>
        )}
      </div>

      {/* Progress Summary */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Resumo do Progresso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso Geral</span>
              <span>{overallProgress.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(overallProgress, 100)} className="h-3" />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{completedCheckpoints}</div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{checkpoints.length - completedCheckpoints - atRiskCheckpoints}</div>
              <div className="text-xs text-muted-foreground">No Prazo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{atRiskCheckpoints}</div>
              <div className="text-xs text-muted-foreground">Em Risco</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Checkpoints */}
      <div className="grid gap-4">
        {checkpoints.map((checkpoint: any) => (
          <CheckpointCard
            key={checkpoint.id}
            checkpoint={checkpoint}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CheckpointCard({ checkpoint, onUpdate }: { checkpoint: any; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [actualValue, setActualValue] = useState(checkpoint.actualValue || "0");
  const [status, setStatus] = useState(checkpoint.status || "pending");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { actualValue: string; status: string }) => {
      await apiRequest("POST", `/api/checkpoints/${checkpoint.id}/update`, data);
    },
    onSuccess: () => {
      toast({
        title: "Checkpoint atualizado",
        description: "O checkpoint foi atualizado com sucesso.",
      });
      setIsEditing(false);
      onUpdate();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar checkpoint.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    mutation.mutate({ actualValue, status });
  };

  const targetValue = parseFloat(checkpoint.targetValue);
  const currentValue = parseFloat(actualValue);
  const progressPercentage = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500 text-white";
      case "on_track": return "bg-blue-500 text-white";
      case "at_risk": return "bg-yellow-500 text-black";
      case "behind": return "bg-red-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Concluído";
      case "on_track": return "No Prazo";
      case "at_risk": return "Em Risco";
      case "behind": return "Atrasado";
      default: return "Pendente";
    }
  };

  const isAtRisk = ["at_risk", "behind"].includes(status);

  return (
    <Card className={isAtRisk ? "border-red-200 bg-red-50/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <CardTitle className="text-base">{checkpoint.period}</CardTitle>
            {isAtRisk && <AlertCircle className="h-4 w-4 text-red-500" />}
          </div>
          <Badge className={getStatusColor(status)}>
            {getStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className={progressPercentage >= 90 ? "text-green-600 font-semibold" : 
                           progressPercentage >= 70 ? "text-blue-600" : 
                           progressPercentage >= 50 ? "text-yellow-600" : "text-red-600"}>
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className={`h-3 ${isAtRisk ? "bg-red-100" : ""}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Atual: {currentValue.toFixed(2)}</span>
            <span>Meta: {targetValue.toFixed(2)}</span>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor={`actual-${checkpoint.id}`}>Valor Atual</Label>
              <Input
                id={`actual-${checkpoint.id}`}
                type="number"
                step="0.01"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder="Digite o valor atual"
              />
            </div>
            
            <div>
              <Label htmlFor={`status-${checkpoint.id}`}>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="on_track">No prazo</SelectItem>
                  <SelectItem value="at_risk">Em risco</SelectItem>
                  <SelectItem value="behind">Atrasado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full">
            <TrendingUp className="h-4 w-4 mr-2" />
            Atualizar Progresso
          </Button>
        )}
      </CardContent>
    </Card>
  );
}