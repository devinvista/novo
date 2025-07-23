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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
            <AlertCircle className="h-5 w-5" />
            Nenhum checkpoint encontrado
          </CardTitle>
          <CardDescription>
            {keyResultId 
              ? "Este resultado-chave ainda não possui checkpoints configurados."
              : "Selecione um resultado-chave para visualizar seus checkpoints."
            }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Checkpoints</h3>
          <Badge variant="outline">{checkpoints.length} períodos</Badge>
        </div>
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
          {keyResultId && (
            <Button 
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>
      
      {viewMode === "grid" && keyResultId && (
        <CheckpointProgressGrid 
          checkpoints={checkpoints} 
          keyResultId={keyResultId}
          onCheckpointClick={(checkpoint) => {
            console.log('Checkpoint clicked, opening dialog:', checkpoint);
            setSelectedCheckpoint(checkpoint);
            setIsEditDialogOpen(true);
          }}
          onRegenerateCheckpoints={() => regenerateMutation.mutate()}
        />
      )}
      
      {viewMode === "list" && (
        <div className="space-y-4">
          {checkpoints.map((checkpoint: any) => (
            <Card key={checkpoint.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{checkpoint.period}</h4>
                  <p className="text-sm text-muted-foreground">
                    Meta: {checkpoint.targetValue} | Atual: {checkpoint.actualValue}
                  </p>
                </div>
                <Badge variant={checkpoint.status === 'completed' ? 'default' : 'secondary'}>
                  {checkpoint.status}
                </Badge>
              </div>
            </Card>
          ))}
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
    </div>
  );
}