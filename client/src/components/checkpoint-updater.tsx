import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

export default function CheckpointUpdater({ keyResultId }: CheckpointUpdaterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [actualValue, setActualValue] = useState("");
  const [notes, setNotes] = useState("");

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ["/api/checkpoints", keyResultId],
    queryFn: async () => {
      const params = keyResultId ? `?keyResultId=${keyResultId}` : "";
      const response = await fetch(`/api/checkpoints${params}`);
      if (!response.ok) throw new Error("Erro ao carregar checkpoints");
      return response.json();
    },
  });

  const { data: keyResults } = useQuery({
    queryKey: ["/api/key-results"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; actualValue: string; notes: string }) => {
      await apiRequest("PUT", `/api/checkpoints/${data.id}`, {
        actualValue: data.actualValue,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      toast({
        title: "Checkpoint atualizado",
        description: "O checkpoint foi atualizado com sucesso.",
      });
      setSelectedCheckpoint(null);
      setActualValue("");
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar checkpoint.",
        variant: "destructive",
      });
    },
  });

  const getCheckpointStatus = (checkpoint: any) => {
    if (checkpoint.status === "completed") return "completed";
    const today = new Date();
    const checkpointDate = new Date(checkpoint.period);
    if (today > checkpointDate) return "overdue";
    return "pending";
  };

  const getProgressIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const groupedCheckpoints = checkpoints?.reduce((acc: any, checkpoint: any) => {
    const kr = keyResults?.find((k: any) => k.id === checkpoint.keyResultId);
    if (!kr) return acc;

    if (!acc[checkpoint.keyResultId]) {
      acc[checkpoint.keyResultId] = {
        keyResult: kr,
        checkpoints: [],
      };
    }
    acc[checkpoint.keyResultId].checkpoints.push(checkpoint);
    return acc;
  }, {});

  const handleUpdate = () => {
    if (!selectedCheckpoint || !actualValue) return;
    
    updateMutation.mutate({
      id: selectedCheckpoint.id,
      actualValue,
      notes,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando checkpoints...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        {Object.values(groupedCheckpoints || {}).map((group: any) => {
          const pendingCheckpoints = group.checkpoints.filter(
            (cp: any) => getCheckpointStatus(cp) !== "completed"
          );
          const completedCheckpoints = group.checkpoints.filter(
            (cp: any) => getCheckpointStatus(cp) === "completed"
          );

          return (
            <Card key={group.keyResult.id}>
              <CardHeader>
                <CardTitle className="text-lg">{group.keyResult.title}</CardTitle>
                <CardDescription>
                  Meta: {group.keyResult.targetValue} {group.keyResult.unit} | 
                  Progresso Atual: {group.keyResult.progress}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Progress value={parseFloat(group.keyResult.progress)} className="h-2" />
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-gray-700">
                      Checkpoints Pendentes ({pendingCheckpoints.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingCheckpoints.map((checkpoint: any, index: number) => {
                        const status = getCheckpointStatus(checkpoint);
                        const previousCheckpoint = group.checkpoints[index - 1];

                        return (
                          <div
                            key={checkpoint.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              status === "overdue"
                                ? "border-red-200 bg-red-50 hover:bg-red-100"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                            onClick={() => {
                              setSelectedCheckpoint(checkpoint);
                              setActualValue(checkpoint.actualValue || "");
                              setNotes(checkpoint.notes || "");
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Calendar className={`h-4 w-4 ${
                                  status === "overdue" ? "text-red-600" : "text-gray-400"
                                }`} />
                                <div>
                                  <p className="font-medium text-sm">{checkpoint.period}</p>
                                  <p className="text-xs text-gray-500">
                                    Meta: {checkpoint.targetValue} {group.keyResult.unit}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {checkpoint.actualValue ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {checkpoint.actualValue}
                                    </span>
                                    {previousCheckpoint?.actualValue &&
                                      getProgressIcon(
                                        parseFloat(checkpoint.actualValue),
                                        parseFloat(previousCheckpoint.actualValue)
                                      )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {status === "overdue" ? "Atrasado" : "Aguardando"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {completedCheckpoints.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-sm text-gray-700">
                        Checkpoints Concluídos ({completedCheckpoints.length})
                      </h4>
                      <div className="space-y-2">
                        {completedCheckpoints.map((checkpoint: any) => (
                          <div
                            key={checkpoint.id}
                            className="p-3 rounded-lg border border-green-200 bg-green-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <div>
                                  <p className="font-medium text-sm">{checkpoint.period}</p>
                                  <p className="text-xs text-gray-500">
                                    Concluído em {format(new Date(checkpoint.completedAt), "dd/MM/yyyy")}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {checkpoint.actualValue} / {checkpoint.targetValue}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {checkpoint.progress}% da meta
                                </p>
                              </div>
                            </div>
                            {checkpoint.notes && (
                              <p className="text-xs text-gray-600 mt-2">{checkpoint.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={!!selectedCheckpoint}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCheckpoint(null);
            setActualValue("");
            setNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Checkpoint</DialogTitle>
            <DialogDescription>
              Registre o progresso para o período {selectedCheckpoint?.period}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="actualValue">Valor Atual *</Label>
              <Input
                id="actualValue"
                type="number"
                step="0.01"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder="Digite o valor alcançado"
              />
              <p className="text-sm text-gray-500 mt-1">
                Meta: {selectedCheckpoint?.targetValue} {selectedCheckpoint?.keyResult?.unit}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre o progresso..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCheckpoint(null);
                  setActualValue("");
                  setNotes("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!actualValue || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}