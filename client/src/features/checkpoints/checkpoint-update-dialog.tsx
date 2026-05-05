import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Target, TrendingUp } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { formatSP } from "@/lib/timezone";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseDecimalBR } from "@/lib/formatters";
import { cleanupOnDialogClose } from "@/lib/modal-cleanup";

interface CheckpointUpdateDialogProps {
  checkpoint: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckpointUpdateDialog({
  checkpoint,
  isOpen,
  onClose,
}: CheckpointUpdateDialogProps) {
  const [actualValue, setActualValue] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (checkpoint) {
      const currentValue = checkpoint.actualValue;
      setActualValue(
        currentValue && currentValue !== "0" && currentValue !== 0 ? currentValue : ""
      );
      setStatus(checkpoint.status || "pending");
      setNotes(checkpoint.notes || "");
    }
  }, [checkpoint]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/checkpoints/${checkpoint.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Marco atualizado",
        description: "O marco foi atualizado e o progresso do KR foi recalculado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quarters"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível atualizar o marco.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      actualValue: parseDecimalBR(actualValue).toString(),
      status,
      notes: notes.trim() || null,
      completedDate: status === "completed" ? new Date().toISOString() : null,
      completedAt: status === "completed" ? new Date().toISOString() : null,
    });
  };

  const calculateProgress = () => {
    const target = parseDecimalBR(checkpoint?.targetValue || "0");
    const actual = parseDecimalBR(actualValue || "0");
    if (target === 0 || !actualValue || actualValue === "") return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "delayed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (s: string) => {
    switch (s) {
      case "completed": return "Concluído";
      case "in_progress": return "Em andamento";
      case "delayed": return "Atrasado";
      default: return "Pendente";
    }
  };

  if (!checkpoint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { cleanupOnDialogClose(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Atualizar marco
          </DialogTitle>
          <DialogDescription>
            {checkpoint.title}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatSP(checkpoint.dueDate, "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span>Meta: <strong>{checkpoint.targetValue}</strong> {checkpoint.keyResult?.unit}</span>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <span className="text-gray-500 text-xs">Status atual:</span>
            <Badge className={`text-xs ${getStatusColor(checkpoint.status)}`}>
              {getStatusText(checkpoint.status)}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="actualValue">Valor realizado</Label>
            <Input
              id="actualValue"
              type="text"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              placeholder="Ex: 1.234 ou 1234,50"
              required
              data-testid="input-actual-value"
            />
            {actualValue && (
              <p className="text-xs text-gray-500">
                Progresso: <span className="font-medium text-gray-700">{calculateProgress()}%</span> da meta
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Novo status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="delayed">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto adicional sobre esse marco..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-update">
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="flex-1" data-testid="button-save-update">
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
