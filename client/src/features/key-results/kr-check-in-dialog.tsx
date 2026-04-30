import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  MessageSquareText,
  Target as TargetIcon,
  XCircle,
  History,
  Loader2,
  PencilLine,
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import NumberInputBR from "@/components/ui/number-input-br";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR, formatDateTimeBR, parseDecimalBR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { KrCheckIn } from "@shared/schema";

type CheckInStatus = "on_track" | "at_risk" | "off_track";

type CheckInWithAuthor = KrCheckIn & { authorName?: string | null };

interface KrCheckInDialogProps {
  keyResult: {
    id: number;
    title?: string;
    targetValue?: string | number | null;
    currentValue?: string | number | null;
    unit?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: Array<{
  value: CheckInStatus;
  label: string;
  description: string;
  Icon: typeof CheckCircle2;
  activeClass: string;
  iconClass: string;
  badgeClass: string;
}> = [
  {
    value: "on_track",
    label: "No prumo",
    description: "Caminhando conforme planejado",
    Icon: CheckCircle2,
    activeClass: "border-green-500 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100",
    iconClass: "text-green-600 dark:text-green-400",
    badgeClass: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200",
  },
  {
    value: "at_risk",
    label: "Em risco",
    description: "Sinais de alerta — precisa de atenção",
    Icon: AlertTriangle,
    activeClass: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200",
  },
  {
    value: "off_track",
    label: "Fora do prumo",
    description: "Em atraso — requer ação imediata",
    Icon: XCircle,
    activeClass: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100",
    iconClass: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200",
  },
];

function getStatusMeta(status: string) {
  return (
    STATUS_OPTIONS.find((s) => s.value === status) ?? {
      value: "on_track" as CheckInStatus,
      label: "—",
      description: "",
      Icon: CheckCircle2,
      activeClass: "",
      iconClass: "text-muted-foreground",
      badgeClass: "bg-muted text-muted-foreground",
    }
  );
}

function getConfidenceTone(confidence: number) {
  if (confidence >= 8) return "text-green-700 dark:text-green-400";
  if (confidence >= 5) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

export default function KrCheckInDialog({ keyResult, open, onOpenChange }: KrCheckInDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"new" | "history">("new");
  const [status, setStatus] = useState<CheckInStatus>("on_track");
  const [confidence, setConfidence] = useState<number>(7);
  const [currentValue, setCurrentValue] = useState<string>("");
  const [nextSteps, setNextSteps] = useState<string>("");
  const [blockers, setBlockers] = useState<string>("");

  // Reset form when dialog opens for a new KR
  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setTab("new");
      setStatus("on_track");
      setConfidence(7);
      setCurrentValue("");
      setNextSteps("");
      setBlockers("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, keyResult.id]);

  const checkInsQuery = useQuery<CheckInWithAuthor[]>({
    queryKey: ["/api/key-results", keyResult.id, "check-ins"],
    queryFn: async () => {
      const res = await fetch(`/api/key-results/${keyResult.id}/check-ins`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar check-ins");
      return res.json();
    },
    enabled: open,
  });

  /** Plano do KR — usado para mostrar o checkpoint da semana corrente como contexto. */
  const checkpointsQuery = useQuery<any[]>({
    queryKey: ["/api/checkpoints", { keyResultId: keyResult.id }],
    queryFn: async () => {
      const res = await fetch(`/api/checkpoints?keyResultId=${keyResult.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar plano");
      return res.json();
    },
    enabled: open,
  });

  /** Próximo checkpoint não-concluído ou o mais próximo da semana atual. */
  const currentPlannedCheckpoint = useMemo(() => {
    const list = checkpointsQuery.data ?? [];
    if (list.length === 0) return null;
    const now = new Date();
    const future = list.filter((c) => new Date(c.dueDate) >= now);
    return future[0] ?? list[list.length - 1] ?? null;
  }, [checkpointsQuery.data]);

  const planTarget = currentPlannedCheckpoint
    ? parseDecimalBR(String(currentPlannedCheckpoint.targetValue ?? "0"))
    : 0;
  const reportedNow = currentValue.trim() ? parseDecimalBR(currentValue) : null;
  const planVariance = reportedNow !== null && planTarget > 0
    ? ((reportedNow - planTarget) / planTarget) * 100
    : null;

  const createCheckIn = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        status,
        confidence,
        nextSteps: nextSteps.trim() || null,
        blockers: blockers.trim() || null,
      };
      if (currentValue.trim()) {
        payload.currentValue = parseDecimalBR(currentValue).toString();
      }
      const res = await apiRequest("POST", `/api/key-results/${keyResult.id}/check-ins`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-in registrado",
        description: "Seu check-in semanal foi salvo e o progresso foi atualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/key-results", keyResult.id, "check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/key-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/objectives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kr-check-ins"] });
      setTab("history");
      setNextSteps("");
      setBlockers("");
      setCurrentValue("");
    },
    onError: (err: Error) => {
      toast({
        title: "Não foi possível salvar",
        description: err.message ?? "Erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCheckIn.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        data-testid="dialog-kr-check-in"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-primary" />
            Check-in semanal
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {keyResult.title ?? "Resultado-chave"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "history")} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" data-testid="tab-checkin-new">
              <PencilLine className="mr-2 h-4 w-4" />
              Novo check-in
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-checkin-history">
              <History className="mr-2 h-4 w-4" />
              Histórico
              {checkInsQuery.data && checkInsQuery.data.length > 0 ? (
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                  {checkInsQuery.data.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-checkin">
              {currentPlannedCheckpoint ? (
                <div
                  className="rounded-md border bg-muted/30 p-3 text-xs"
                  data-testid="card-current-checkpoint"
                >
                  <div className="mb-2 flex items-center gap-1.5 font-semibold text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Plano vigente
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Período
                      </div>
                      <div className="font-medium">{currentPlannedCheckpoint.title}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Meta planejada
                      </div>
                      <div className="flex items-center gap-1 font-medium">
                        <TargetIcon className="h-3 w-3 text-muted-foreground" />
                        {currentPlannedCheckpoint.targetValue}
                        {keyResult.unit ? (
                          <span className="text-muted-foreground"> {keyResult.unit}</span>
                        ) : null}
                      </div>
                    </div>
                    {planVariance !== null ? (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Variação vs. plano
                        </div>
                        <div
                          className={cn(
                            "font-semibold tabular-nums",
                            planVariance >= 0
                              ? "text-green-700 dark:text-green-400"
                              : "text-red-700 dark:text-red-400"
                          )}
                          data-testid="text-plan-variance"
                        >
                          {planVariance >= 0 ? "+" : ""}
                          {planVariance.toFixed(1)}%
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Como está esse KR essa semana?</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = status === opt.value;
                    const Icon = opt.Icon;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        aria-pressed={isActive}
                        data-testid={`button-status-${opt.value}`}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-md border-2 border-transparent bg-muted/40 p-3 text-left transition hover-elevate active-elevate-2",
                          isActive && opt.activeClass
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <Icon className={cn("h-5 w-5", opt.iconClass)} />
                          {isActive && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              Selecionado
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="confidence-slider">Nível de confiança</Label>
                  <span
                    className={cn("text-sm font-semibold tabular-nums", getConfidenceTone(confidence))}
                    data-testid="text-confidence-value"
                  >
                    {confidence}/10
                  </span>
                </div>
                <Slider
                  id="confidence-slider"
                  min={1}
                  max={10}
                  step={1}
                  value={[confidence]}
                  onValueChange={(vals) => setConfidence(vals[0] ?? 5)}
                  data-testid="slider-confidence"
                  aria-label="Nível de confiança de 1 a 10"
                />
                <p className="text-xs text-muted-foreground">
                  Quão confiante você está de que vai bater a meta? 1 = muito baixa, 10 = muito alta.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-value">
                  Valor atual <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <NumberInputBR
                    id="current-value"
                    value={currentValue}
                    onChange={setCurrentValue}
                    placeholder={
                      keyResult.currentValue !== undefined && keyResult.currentValue !== null
                        ? `Atual: ${keyResult.currentValue}`
                        : "Ex.: 1.234,56"
                    }
                    data-testid="input-current-value"
                  />
                  {keyResult.unit ? (
                    <span className="text-sm text-muted-foreground">{keyResult.unit}</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Se preencher, o valor atual e o progresso do KR serão atualizados automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="next-steps" className="flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    Próximos passos
                  </Label>
                  <Textarea
                    id="next-steps"
                    placeholder="O que você fará nessa semana?"
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    data-testid="textarea-next-steps"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blockers" className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    Bloqueios
                  </Label>
                  <Textarea
                    id="blockers"
                    placeholder="O que está atrapalhando?"
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    data-testid="textarea-blockers"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-checkin"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCheckIn.isPending}
                  data-testid="button-submit-checkin"
                >
                  {createCheckIn.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando…
                    </>
                  ) : (
                    "Registrar check-in"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <CheckInTimeline query={checkInsQuery} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CheckInTimeline({
  query,
}: {
  query: ReturnType<typeof useQuery<CheckInWithAuthor[]>>;
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-3" data-testid="status-checkin-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-md border p-3">
            <Skeleton className="mb-2 h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (query.error) {
    return (
      <div
        className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        role="alert"
        data-testid="status-checkin-error"
      >
        {(query.error as Error).message ?? "Erro ao carregar check-ins."}
      </div>
    );
  }

  const items = query.data ?? [];

  if (items.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
        data-testid="status-checkin-empty"
      >
        <MessageSquareText className="mx-auto mb-2 h-8 w-8 opacity-60" />
        Ainda não há check-ins para esse KR.
        <br />
        Use a aba <span className="font-semibold">Novo check-in</span> para registrar o primeiro.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[420px] pr-3">
      <ol className="space-y-3" data-testid="list-checkins">
        {items.map((item) => {
          const meta = getStatusMeta(item.status);
          const Icon = meta.Icon;
          return (
            <li
              key={item.id}
              className="rounded-md border p-3"
              data-testid={`checkin-item-${item.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", meta.iconClass)} />
                  <div>
                    <div className="text-sm font-semibold">
                      Semana de {formatDateBR(item.weekStart)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.authorName ? `${item.authorName} · ` : ""}
                      {item.createdAt ? formatDateTimeBR(item.createdAt) : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className={cn("text-[10px]", meta.badgeClass)} variant="secondary">
                    {meta.label}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] tabular-nums", getConfidenceTone(item.confidence))}>
                    {item.confidence}/10
                  </Badge>
                </div>
              </div>
              {(item.nextSteps || item.blockers) && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {item.nextSteps && (
                    <div className="rounded bg-muted/50 p-2 text-xs">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" />
                        Próximos passos
                      </div>
                      <p className="whitespace-pre-line text-foreground">{item.nextSteps}</p>
                    </div>
                  )}
                  {item.blockers && (
                    <div className="rounded bg-muted/50 p-2 text-xs">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Bloqueios
                      </div>
                      <p className="whitespace-pre-line text-foreground">{item.blockers}</p>
                    </div>
                  )}
                </div>
              )}
              {item.currentValue ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Valor reportado: <span className="font-medium text-foreground">{item.currentValue}</span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </ScrollArea>
  );
}
