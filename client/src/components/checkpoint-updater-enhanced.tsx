import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Target, TrendingUp, RefreshCw, AlertCircle, Grid3X3, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CheckpointProgressGrid from "./checkpoint-progress-grid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Status mapping utilities
const statusMapping = {
  // English to Portuguese
  pending: "pendente",
  on_track: "no_prazo", 
  at_risk: "em_risco",
  behind: "atrasado",
  completed: "concluido",
  // Portuguese values (already correct)
  pendente: "pendente",
  no_prazo: "no_prazo",
  em_risco: "em_risco", 
  atrasado: "atrasado",
  concluido: "concluido"
} as const;

const statusLabels = {
  pendente: "Pendente",
  no_prazo: "No Prazo",
  em_risco: "Em Risco", 
  atrasado: "Atrasado",
  concluido: "Concluído"
} as const;

const getStatusLabel = (status: string) => {
  const mappedStatus = statusMapping[status as keyof typeof statusMapping] || status;
  return statusLabels[mappedStatus as keyof typeof statusLabels] || status;
};

const getStatusColor = (status: string) => {
  const mappedStatus = statusMapping[status as keyof typeof statusMapping] || status;
  switch (mappedStatus) {
    case "pendente": return "bg-gray-100 text-gray-800";
    case "no_prazo": return "bg-blue-100 text-blue-800";
    case "em_risco": return "bg-yellow-100 text-yellow-800";
    case "atrasado": return "bg-red-100 text-red-800";
    case "concluido": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

interface CheckpointUpdaterProps {
  keyResultId?: number;
}

export default function CheckpointUpdaterEnhanced({ keyResultId }: CheckpointUpdaterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  const completedCheckpoints = checkpoints.filter((cp: any) => {
    const mappedStatus = statusMapping[cp.status as keyof typeof statusMapping] || cp.status;
    return mappedStatus === "concluido";
  }).length;
  const atRiskCheckpoints = checkpoints.filter((cp: any) => {
    const mappedStatus = statusMapping[cp.status as keyof typeof statusMapping] || cp.status;
    return ["em_risco", "atrasado"].includes(mappedStatus);
  }).length;

  const handleCheckpointClick = (checkpoint: any) => {
    setSelectedCheckpoint(checkpoint);
    setIsEditDialogOpen(true);
  };

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results"],
    queryFn: async () => {
      const response = await fetch("/api/key-results");
      if (!response.ok) throw new Error("Erro ao carregar resultados-chave");
      return response.json();
    },
  });

  const keyResultTitle = keyResults?.find((kr: any) => kr.id === keyResultId)?.title;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Checkpoints</h3>
          <Badge variant="outline">{checkpoints.length} períodos</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
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

      {/* Checkpoints Display */}
      {viewMode === "grid" ? (
        <CheckpointProgressGrid
          checkpoints={checkpoints}
          onCheckpointClick={handleCheckpointClick}
          onRegenerateCheckpoints={keyResultId ? () => regenerateMutation.mutate() : undefined}
          keyResultTitle={keyResultTitle}
        />
      ) : (
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
      )}

      {/* Edit Checkpoint Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Checkpoint</DialogTitle>
            <DialogDescription>
              Atualize o progresso e status do checkpoint {selectedCheckpoint?.period}
            </DialogDescription>
          </DialogHeader>
          {selectedCheckpoint && (
            <CheckpointEditForm
              checkpoint={selectedCheckpoint}
              onClose={() => setIsEditDialogOpen(false)}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
                setIsEditDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckpointCard({ checkpoint, onUpdate }: { checkpoint: any; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [actualValue, setActualValue] = useState(checkpoint.actualValue || "0");
  const [status, setStatus] = useState(checkpoint.status || "pendente");
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

  const mappedStatus = statusMapping[status as keyof typeof statusMapping] || status;
  const isAtRisk = ["em_risco", "atrasado"].includes(mappedStatus);

  return (
    <Card className={isAtRisk ? "border-red-200 bg-red-50/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <CardTitle className="text-base">{checkpoint.period}</CardTitle>
            {isAtRisk && <AlertCircle className="h-4 w-4 text-red-500" />}
          </div>
          <Badge className={getStatusColor(mappedStatus)}>
            {getStatusLabel(mappedStatus)}
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
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="no_prazo">No Prazo</SelectItem>
                  <SelectItem value="em_risco">Em Risco</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
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

function CheckpointEditForm({ checkpoint, onClose, onUpdate }: { 
  checkpoint: any; 
  onClose: () => void; 
  onUpdate: () => void; 
}) {
  const [actualValue, setActualValue] = useState(checkpoint.actualValue || "0");
  const [status, setStatus] = useState(checkpoint.status || "pendente");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ actualValue, status });
  };

  const targetValue = parseFloat(checkpoint.targetValue);
  const currentValue = parseFloat(actualValue);
  const progressPercentage = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Período</Label>
        <div className="text-sm font-medium">{checkpoint.period}</div>
      </div>

      <div className="space-y-2">
        <Label>Progresso Atual</Label>
        <Progress value={progressPercentage} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Atual: {currentValue.toFixed(2)}</span>
          <span>Meta: {targetValue.toFixed(2)}</span>
          <span>{progressPercentage.toFixed(1)}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="actualValue">Valor Atual</Label>
        <Input
          id="actualValue"
          type="number"
          step="0.01"
          value={actualValue}
          onChange={(e) => setActualValue(e.target.value)}
          placeholder="Digite o valor atual"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="no_prazo">No Prazo</SelectItem>
            <SelectItem value="em_risco">Em Risco</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}