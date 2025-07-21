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
    </div>
  );
}