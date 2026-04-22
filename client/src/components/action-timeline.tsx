import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle, Circle, Clock, AlertCircle, Edit, Trash2,
  MoreHorizontal, Search, MessageSquare, ChevronDown, ChevronRight, X
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import { formatSP, parseISOSP, nowSP } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ActionForm from "./action-form";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cleanupOnDialogClose } from "@/lib/modal-cleanup";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQueryClient as useQC } from "@tanstack/react-query";

interface ActionTimelineProps {
  keyResultId?: number;
  showAll?: boolean;
  selectedQuarter?: string;
  filters?: { regionId?: number; subRegionId?: number; serviceLineId?: number };
  onCreateAction?: () => void;
}

const STATUS_CONFIG = {
  completed:   { label: "Concluída",    color: "text-green-700",  bg: "bg-green-100",  border: "border-green-300",  icon: CheckCircle },
  in_progress: { label: "Em Progresso", color: "text-blue-700",   bg: "bg-blue-100",   border: "border-blue-300",   icon: Clock },
  pending:     { label: "Pendente",      color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-300", icon: Circle },
  cancelled:   { label: "Cancelada",    color: "text-gray-500",   bg: "bg-gray-50",    border: "border-gray-300",   icon: AlertCircle },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const PRIORITY_CONFIG = {
  high:   { label: "Alta",  variant: "error"   as const },
  medium: { label: "Média", variant: "warning" as const },
  low:    { label: "Baixa", variant: "secondary" as const },
};

const TERMINAL_STATUSES: StatusKey[] = ["completed", "cancelled"];

export default function ActionTimeline({
  keyResultId, showAll = false, selectedQuarter, filters, onCreateAction,
}: ActionTimelineProps) {
  const [editingAction, setEditingAction] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteActionId, setDeleteActionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [collapsedKRs, setCollapsedKRs] = useState<Set<string>>(new Set());

  // Inline status change state
  const [pendingStatusChange, setPendingStatusChange] = useState<{ action: any; newStatus: StatusKey } | null>(null);
  const [completionComment, setCompletionComment] = useState("");

  const { toast } = useToast();
  const queryClient = useQC();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: actions, isLoading } = useQuery({
    queryKey: ["/api/actions", keyResultId, selectedQuarter, JSON.stringify(filters)],
    queryFn: async () => {
      if (selectedQuarter && selectedQuarter !== "all") {
        const params = new URLSearchParams();
        if (filters?.regionId) params.append("regionId", filters.regionId.toString());
        if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
        const url = `/api/quarters/${selectedQuarter}/data${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao carregar ações");
        const data = await res.json();
        let result = Array.isArray(data.actions) ? data.actions : [];
        if (keyResultId) result = result.filter((a: any) => a.keyResult?.id === keyResultId);
        return result;
      } else {
        const params = new URLSearchParams();
        if (keyResultId) params.append("keyResultId", keyResultId.toString());
        if (filters?.regionId) params.append("regionId", filters.regionId.toString());
        if (filters?.subRegionId) params.append("subRegionId", filters.subRegionId.toString());
        if (filters?.serviceLineId) params.append("serviceLineId", filters.serviceLineId.toString());
        const url = `/api/actions${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao carregar ações");
        return res.json();
      }
    },
  });

  const { data: commentCounts } = useQuery<Record<number, number>>({
    queryKey: ["/api/action-comment-counts"],
    staleTime: 60_000,
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
  }, [filters, queryClient]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteActionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/actions/${id}`),
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Ação deletada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      setDeleteActionId(null);
      setTimeout(cleanupOnDialogClose, 200);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message || "Erro ao deletar", variant: "destructive" });
      setDeleteActionId(null);
      setTimeout(cleanupOnDialogClose, 200);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: string; comment?: string }) =>
      apiRequest("PUT", `/api/actions/${id}`, {
        status,
        ...(comment ? { completionComment: comment } : {}),
      }),
    onSuccess: () => {
      toast({ title: "Status atualizado", description: "Ação atualizada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-comment-counts"] });
      setPendingStatusChange(null);
      setCompletionComment("");
      setTimeout(cleanupOnDialogClose, 200);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message || "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const handleStatusClick = (action: any, newStatus: StatusKey) => {
    if (action.status === newStatus) return;
    if (TERMINAL_STATUSES.includes(newStatus) && !TERMINAL_STATUSES.includes(action.status)) {
      setCompletionComment("");
      setPendingStatusChange({ action, newStatus });
    } else {
      updateStatusMutation.mutate({ id: action.id, status: newStatus });
    }
  };

  const confirmStatusChange = () => {
    if (!pendingStatusChange) return;
    updateStatusMutation.mutate({
      id: pendingStatusChange.action.id,
      status: pendingStatusChange.newStatus,
      comment: completionComment,
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDaysUntilDue = (dueDate: string) => {
    const diff = parseISOSP(dueDate).getTime() - nowSP().getTime();
    return Math.ceil(diff / 86_400_000);
  };

  const toggleKR = (key: string) =>
    setCollapsedKRs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Derived data ──────────────────────────────────────────────────────────
  const allActions: any[] = Array.isArray(actions) ? actions : [];

  const today = nowSP();
  const kpis = useMemo(() => ({
    total:       allActions.length,
    completed:   allActions.filter((a) => a.status === "completed").length,
    in_progress: allActions.filter((a) => a.status === "in_progress").length,
    pending:     allActions.filter((a) => a.status === "pending").length,
    cancelled:   allActions.filter((a) => a.status === "cancelled").length,
    overdue:     allActions.filter(
      (a) => a.dueDate && new Date(a.dueDate) < today && !["completed", "cancelled"].includes(a.status)
    ).length,
  }), [allActions]);

  const filtered = useMemo(() => {
    let list = allActions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }
    if (statusFilter === "overdue") {
      list = list.filter((a) => a.dueDate && new Date(a.dueDate) < today && !["completed", "cancelled"].includes(a.status));
    } else if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    return list;
  }, [allActions, searchQuery, statusFilter]);

  // Group by KR
  const grouped = useMemo(() => {
    const map: Record<string, { krTitle: string; krId: string; actions: any[] }> = {};
    filtered.forEach((action) => {
      const krId   = action.keyResult?.id?.toString() || action.keyResultId?.toString() || "no-kr";
      const krTitle = action.keyResult?.title || action.keyResultTitle || "Sem Resultado-Chave";
      if (!map[krId]) map[krId] = { krTitle, krId, actions: [] };
      map[krId].actions.push(action);
    });
    // Sort actions within each group
    Object.values(map).forEach((g) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      g.actions.sort((a, b) => {
        const pd = (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
        if (pd !== 0) return pd;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return 0;
      });
    });
    return Object.values(map);
  }, [filtered]);

  // ── Loading / empty ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!actions || allActions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma ação cadastrada</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onCreateAction ?? (() => setShowForm(true))}>
          Criar primeira ação
        </Button>
      </div>
    );
  }

  const kpiItems = [
    { key: "all",         label: "Total",        value: kpis.total,       color: "text-gray-700",  bg: "bg-gray-50",   border: "border-gray-200" },
    { key: "completed",   label: "Concluídas",   value: kpis.completed,   color: "text-green-700", bg: "bg-green-50",  border: "border-green-200" },
    { key: "in_progress", label: "Em Progresso", value: kpis.in_progress, color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-200" },
    { key: "pending",     label: "Pendentes",    value: kpis.pending,     color: "text-orange-700",bg: "bg-orange-50", border: "border-orange-200" },
    { key: "cancelled",   label: "Canceladas",   value: kpis.cancelled,   color: "text-gray-500",  bg: "bg-gray-50",   border: "border-gray-200" },
    { key: "overdue",     label: "Atrasadas",    value: kpis.overdue,     color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200" },
  ];

  return (
    <>
      {/* ── A: KPI Summary ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {kpiItems.map((kpi) => (
          <button
            key={kpi.key}
            onClick={() => setStatusFilter(kpi.key)}
            className={`rounded-lg border p-2 text-center transition-all hover:shadow-sm ${kpi.bg} ${kpi.border} ${
              statusFilter === kpi.key ? "ring-2 ring-offset-1 ring-blue-400 shadow-sm" : ""
            }`}
          >
            <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{kpi.label}</div>
          </button>
        ))}
      </div>

      {/* ── B+C: Filters + Search ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {kpiItems.map((kpi) => (
            <button
              key={kpi.key}
              onClick={() => setStatusFilter(kpi.key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === kpi.key
                  ? `${kpi.bg} ${kpi.color} ${kpi.border} font-semibold`
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {kpi.label} ({kpi.value})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <p>Nenhuma ação corresponde ao filtro selecionado</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
            Limpar filtros
          </Button>
        </div>
      )}

      {/* ── D: Grouped by KR ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        {grouped.map(({ krTitle, krId, actions: krActions }) => {
          const isCollapsed = collapsedKRs.has(krId);
          const krCompleted = krActions.filter((a) => a.status === "completed").length;
          const pct = krActions.length > 0 ? Math.round((krCompleted / krActions.length) * 100) : 0;

          return (
            <div key={krId} className="border rounded-lg overflow-hidden">
              {/* KR header */}
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100 hover:bg-blue-100 transition-colors text-left"
                onClick={() => toggleKR(krId)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-blue-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                  <span className="text-sm font-semibold text-blue-800 truncate">📌 {krTitle}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-xs text-blue-600">{krCompleted}/{krActions.length} concluídas</span>
                  <div className="w-20 bg-blue-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 w-8 text-right">{pct}%</span>
                </div>
              </button>

              {/* Actions */}
              {!isCollapsed && (
                <div className="divide-y divide-gray-100">
                  {krActions.map((action: any) => {
                    const daysUntilDue = action.dueDate ? getDaysUntilDue(action.dueDate) : null;
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && !["completed", "cancelled"].includes(action.status);
                    const cfg = STATUS_CONFIG[action.status as StatusKey] || STATUS_CONFIG.pending;
                    const StatusIcon = cfg.icon;
                    const commentCount = commentCounts?.[action.id] ?? 0;

                    return (
                      <div
                        key={action.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${isOverdue ? "bg-red-50" : ""}`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className={`font-medium text-sm leading-snug ${action.status === "cancelled" ? "line-through text-gray-400" : "text-gray-900"}`}>
                                {action.title}
                              </h4>
                              {action.description && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{action.description}</p>
                              )}

                              {/* Meta row */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                                {action.responsible && (
                                  <span className="text-xs text-gray-500">👤 {action.responsible.name}</span>
                                )}
                                {action.serviceLine && (
                                  <span className="text-xs text-blue-600">📋 {action.serviceLine.name}</span>
                                )}
                                {action.dueDate && (
                                  <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                    <Clock className="h-3 w-3" />
                                    {action.status === "completed" || action.status === "cancelled"
                                      ? `Prazo: ${formatSP(action.dueDate, "dd 'de' MMMM", { locale: ptBR })}`
                                      : isOverdue
                                      ? `Atrasada ${Math.abs(daysUntilDue!)} dias — ${formatSP(action.dueDate, "dd/MM", { locale: ptBR })}`
                                      : daysUntilDue === 0
                                      ? "Vence hoje"
                                      : daysUntilDue === 1
                                      ? "Vence amanhã"
                                      : `Vence em ${daysUntilDue} dias — ${formatSP(action.dueDate, "dd/MM")}`
                                    }
                                  </span>
                                )}
                                {/* H: Comment count indicator */}
                                {commentCount > 0 && (
                                  <span className="text-xs text-indigo-600 flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {commentCount} {commentCount === 1 ? "comentário" : "comentários"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: badges + actions */}
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                {/* Priority badge */}
                                <Badge variant={PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG]?.variant ?? "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                                  {PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG]?.label ?? action.priority}
                                </Badge>

                                {/* E: Inline status change dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className={`text-[10px] flex items-center gap-0.5 px-2 py-0.5 rounded-full border font-medium transition-colors ${cfg.bg} ${cfg.color} ${cfg.border} hover:opacity-80`}>
                                      {cfg.label}
                                      <ChevronDown className="h-2.5 w-2.5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <div className="px-2 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Alterar status</div>
                                    <DropdownMenuSeparator />
                                    {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, s]) => (
                                      <DropdownMenuItem
                                        key={key}
                                        className={`text-xs gap-2 ${action.status === key ? "font-semibold" : ""}`}
                                        onClick={() => handleStatusClick(action, key)}
                                      >
                                        <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                                        {s.label}
                                        {action.status === key && <span className="ml-auto text-[10px] text-gray-400">atual</span>}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      onClick={() => { setEditingAction(action); setShowForm(true); }}
                                    >
                                      <Edit className="h-3.5 w-3.5 text-gray-500" />
                                      Editar ação completa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-xs gap-2 text-red-600"
                                      onClick={() => setDeleteActionId(action.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Deletar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── E: Completion comment dialog ─────────────────────────────────── */}
      <Dialog open={!!pendingStatusChange} onOpenChange={(open) => { if (!open) { setPendingStatusChange(null); setCompletionComment(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingStatusChange?.newStatus === "completed" ? "Concluir ação" : "Cancelar ação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Ao marcar como <strong>{STATUS_CONFIG[pendingStatusChange?.newStatus ?? "completed"]?.label}</strong>, um comentário é necessário para registrar o desfecho.
            </p>
            <div className="space-y-1">
              <Label htmlFor="completion-comment" className="text-sm">Comentário de conclusão <span className="text-red-500">*</span></Label>
              <Textarea
                id="completion-comment"
                placeholder="Descreva o resultado ou motivo..."
                value={completionComment}
                onChange={(e) => setCompletionComment(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingStatusChange(null); setCompletionComment(""); }}>Cancelar</Button>
            <Button
              onClick={confirmStatusChange}
              disabled={!completionComment.trim() || updateStatusMutation.isPending}
              className={pendingStatusChange?.newStatus === "cancelled" ? "bg-gray-600 hover:bg-gray-700" : ""}
            >
              {updateStatusMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteActionId !== null} onOpenChange={() => setDeleteActionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja deletar esta ação? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteActionId && deleteActionMutation.mutate(deleteActionId)} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit form */}
      <ActionForm
        action={editingAction}
        onSuccess={() => { setShowForm(false); setEditingAction(null); }}
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingAction(null); }}
        defaultKeyResultId={keyResultId}
      />
    </>
  );
}
