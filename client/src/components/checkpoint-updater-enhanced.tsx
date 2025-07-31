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
import { NumberInputBR } from "@/components/ui/number-input-br";
import { parseDecimalBR, formatDecimalBR } from "@/lib/formatters";
import { getProgressBadgeVariant, getProgressBadgeText } from "@/lib/checkpoint-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CheckpointUpdaterProps {
  keyResultId?: number;
}

function CheckpointEditFormInline({ checkpoint, onClose, onUpdate }: {
  checkpoint: any;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [actualValue, setActualValue] = useState(formatDecimalBR(checkpoint.actualValue));
  const [notes, setNotes] = useState(checkpoint.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest("PUT", `/api/checkpoints/${checkpoint.id}`, {
        actualValue: parseDecimalBR(actualValue),
        notes,
      });

      toast({
        title: "Checkpoint atualizado",
        description: "O checkpoint foi atualizado com sucesso.",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar checkpoint.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="actualValue">Valor Atual</Label>
        <NumberInputBR
          id="actualValue"
          value={actualValue}
          onChange={setActualValue}
          placeholder="0,00"
        />
        <p className="text-sm text-muted-foreground">
          Meta: {formatDecimalBR(checkpoint.targetValue)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione observações (opcional)"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

export default function CheckpointUpdaterEnhanced({ keyResultId }: CheckpointUpdaterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [recreateProgress, setRecreateProgress] = useState(0);
  const [isRecreating, setIsRecreating] = useState(false);

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ["/api/checkpoints", keyResultId],
    queryFn: async () => {
      const url = keyResultId ? `/api/checkpoints?keyResultId=${keyResultId}` : "/api/checkpoints";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar checkpoints");
      return response.json();
    },
    enabled: !!keyResultId,
  });

  const handleRecreateWithAnimation = async () => {
    if (!keyResultId) return;
    
    setIsRecreating(true);
    setRecreateProgress(0);
    
    // Simular progresso da animação
    const progressInterval = setInterval(() => {
      setRecreateProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);
    
    try {
      await apiRequest("POST", `/api/key-results/${keyResultId}/recreate-checkpoints`, {});
      
      // Completar progresso
      setRecreateProgress(100);
      
      setTimeout(() => {
        toast({
          title: "Checkpoints recriados",
          description: "Os checkpoints foram recriados com sucesso.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
        setIsRecreating(false);
        setRecreateProgress(0);
      }, 800);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao recriar checkpoints.",
        variant: "destructive",
      });
      setIsRecreating(false);
      setRecreateProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const recreateMutation = useMutation({
    mutationFn: async () => {
      if (!keyResultId) throw new Error("Key Result ID é necessário");
      await apiRequest("POST", `/api/key-results/${keyResultId}/recreate-checkpoints`, {});
    },
    onSuccess: () => {
      toast({
        title: "Checkpoints recriados",
        description: "Os checkpoints foram recriados com base na frequência do resultado-chave.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao recriar checkpoints.",
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
            <AlertCircle className="h-5 w-5" />
            Nenhum checkpoint encontrado
          </CardTitle>
          <CardDescription>
            {keyResultId 
              ? "Este resultado-chave ainda não possui checkpoints configurados."
              : "Nenhum checkpoint encontrado para os resultados-chave acessíveis."
            }
          </CardDescription>
        </CardHeader>
        {keyResultId && (
          <CardContent>
            <Button 
              onClick={() => setShowConfirmDialog(true)}
              disabled={isRecreating}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecreating ? 'animate-spin' : ''}`} />
              {isRecreating ? "Criando..." : "Gerar Checkpoints"}
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        
        {keyResultId && (
          <Button 
            onClick={() => setShowConfirmDialog(true)}
            disabled={isRecreating}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecreating ? 'animate-spin' : ''}`} />
            {isRecreating ? "Recriando..." : "Recriar"}
          </Button>
        )}
      </div>
      
      {viewMode === "grid" && keyResultId && (
        <CheckpointProgressGrid 
          checkpoints={checkpoints} 
          onCheckpointClick={(checkpoint) => {
            console.log('Checkpoint clicked, opening dialog:', checkpoint);
            setSelectedCheckpoint(checkpoint);
            setIsEditDialogOpen(true);
          }}
        />
      )}
      
      {viewMode === "list" && (
        <div className="space-y-4">
          {checkpoints.map((checkpoint: any) => {
            const targetValue = parseFloat(checkpoint.targetValue);
            const actualValue = parseFloat(checkpoint.actualValue);
            const progress = targetValue > 0 ? (actualValue / targetValue) * 100 : 0;
            const badgeVariant = getProgressBadgeVariant(progress);
            const badgeText = getProgressBadgeText(progress);
            
            return (
              <Card key={checkpoint.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{checkpoint.period}</h4>
                    <p className="text-sm text-muted-foreground">
                      Meta: {checkpoint.targetValue} | Atual: {checkpoint.actualValue || '0'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Progresso: {progress.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={badgeVariant}>
                      {badgeText}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {checkpoint.status === 'completed' ? 'Concluído' : 
                       checkpoint.status === 'active' ? 'Ativo' : 'Pendente'}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Checkpoint</DialogTitle>
            <DialogDescription>
              {selectedCheckpoint && `Período: ${selectedCheckpoint.period}`}
            </DialogDescription>
          </DialogHeader>
          {selectedCheckpoint && (
            <CheckpointEditFormInline 
              checkpoint={selectedCheckpoint}
              onClose={() => setIsEditDialogOpen(false)}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
                queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
                setIsEditDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Confirmar Recriação de Checkpoints
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>
                <div className="mb-2">Esta ação irá:</div>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Excluir todos os checkpoints existentes</li>
                  <li>Recriar novos checkpoints com base na frequência do resultado-chave</li>
                  <li>Resetar todo o progresso atual</li>
                </ul>
                <div className="font-semibold text-orange-600 mt-3">
                  ⚠️ Esta ação não pode ser desfeita!
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDialog(false);
                handleRecreateWithAnimation();
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sim, Recriar Checkpoints
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog */}
      <Dialog open={isRecreating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Recriando Checkpoints
            </DialogTitle>
            <DialogDescription>
              Aguarde enquanto os checkpoints são recriados...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={recreateProgress} className="w-full" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {recreateProgress < 100 ? `${Math.round(recreateProgress)}% concluído` : 'Finalizando...'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}