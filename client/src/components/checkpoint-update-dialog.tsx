import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Target, TrendingUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NumberInputBR } from "@/components/ui/number-input-br";

interface CheckpointUpdateDialogProps {
  checkpoint: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckpointUpdateDialog({ 
  checkpoint, 
  isOpen, 
  onClose 
}: CheckpointUpdateDialogProps) {
  const [actualValue, setActualValue] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (checkpoint) {
      setActualValue(checkpoint.actualValue || "");
      setStatus(checkpoint.status || "pending");
      setNotes(checkpoint.notes || "");
    }
  }, [checkpoint]);

  const updateCheckpointMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/checkpoints/${checkpoint.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Checkpoint atualizado",
        description: "As informações do checkpoint foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar checkpoint.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData = {
      actualValue: actualValue.replace(',', '.'), // Convert to database format
      status,
      notes: notes.trim() || null,
      completedDate: status === 'completed' ? new Date().toISOString() : null,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
    };

    updateCheckpointMutation.mutate(updateData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in_progress': return 'Em Progresso';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      default: return 'Pendente';
    }
  };

  const calculateProgress = () => {
    const target = parseFloat(checkpoint?.targetValue?.replace(',', '.') || '0');
    const actual = parseFloat(actualValue.replace(',', '.') || '0');
    if (target === 0) return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  };

  if (!checkpoint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Atualizar Checkpoint
          </DialogTitle>
          <DialogDescription>
            Atualize o progresso e status do checkpoint
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Checkpoint Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{checkpoint.title}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>Meta: {checkpoint.targetValue} {checkpoint.keyResult?.unit}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Prazo:</span>
              <Badge variant="outline">
                {format(new Date(checkpoint.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status Atual:</span>
              <Badge className={getStatusColor(checkpoint.status)}>
                {getStatusText(checkpoint.status)}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Update Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actualValue">Valor Atual</Label>
              <NumberInputBR
                id="actualValue"
                value={actualValue}
                onChange={setActualValue}
                placeholder="Digite o valor atual"
                required
              />
              <div className="text-xs text-gray-500">
                Progresso: {calculateProgress()}% da meta
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre o progresso..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateCheckpointMutation.isPending}
              className="flex-1"
            >
              {updateCheckpointMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}