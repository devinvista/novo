import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  startOfMonth, endOfMonth, addMonths, subMonths,
  differenceInDays, isBefore, isAfter, startOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatSP, parseISOSP, nowSP } from "@/lib/timezone";
import {
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock,
  Circle, Calendar, Link2, Link2Off, Plus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ActionForm from "./action-form";

interface GanttTimelineProps {
  keyResultId?: number;
  selectedQuarter?: string;
  filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  };
  onCreateAction?: () => void;
}

interface Action {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt?: string;
  keyResult?: { id: number; title: string };
  keyResultTitle?: string;
  responsible?: { id: number; name: string };
  serviceLine?: { id: number; name: string };
}

interface ActionDependency {
  id: number;
  actionId: number;
  dependsOnId: number;
}

interface TooltipState {
  action: Action;
  x: number;
  y: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  completed: { label: "Concluída", color: "text-green-700", bg: "bg-green-500", border: "border-green-600", icon: CheckCircle },
  in_progress: { label: "Em Progresso", color: "text-blue-700", bg: "bg-blue-500", border: "border-blue-600", icon: Clock },
  cancelled: { label: "Cancelada", color: "text-gray-500", bg: "bg-gray-400", border: "border-gray-500", icon: AlertCircle },
  pending: { label: "Pendente", color: "text-orange-700", bg: "bg-orange-400", border: "border-orange-500", icon: Circle },
};

const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };
const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 220;
const MIN_DAY_PX = 5;

export default function GanttTimeline({ keyResultId, selectedQuarter, filters, onCreateAction }: GanttTimelineProps) {
  const { toast } = useToast();
  const [viewStart, setViewStart] = useState(() => startOfMonth(subMonths(nowSP(), 1)));
  const [viewMonths, setViewMonths] = useState(5);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);
  const [showDeps, setShowDeps] = useState(true);
  const [depDialogAction, setDepDialogAction] = useState<Action | null>(null);
  const [addDepTargetId, setAddDepTargetId] = useState<string>("");

  const outerRef = useRef<HTMLDivElement>(null);

  const measureWidth = useCallback(() => {
    if (outerRef.current) {
      const w = outerRef.current.getBoundingClientRect().width - LABEL_WIDTH;
      setChartWidth(Math.max(w, 0));
    }
  }, []);

  useEffect(() => {
    measureWidth();
    const ro = new ResizeObserver(measureWidth);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, [measureWidth]);

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
        let result: Action[] = Array.isArray(data.actions) ? data.actions : [];
        if (keyResultId) result = result.filter((a) => a.keyResult?.id === keyResultId);
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
        const result = await res.json();
        return Array.isArray(result) ? result : [];
      }
    },
  });

  const allActions: Action[] = Array.isArray(actions) ? actions : [];
  const actionIds = allActions.map((a) => a.id);

  const { data: dependencies } = useQuery<ActionDependency[]>({
    queryKey: ["/api/action-dependencies", actionIds.join(",")],
    enabled: actionIds.length > 0,
    queryFn: async () => {
      if (actionIds.length === 0) return [];
      const res = await fetch(
        `/api/action-dependencies?actionIds=${actionIds.join(",")}`,
        { credentials: "include" }
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addDepMutation = useMutation({
    mutationFn: async ({ actionId, dependsOnId }: { actionId: number; dependsOnId: number }) => {
      const res = await apiRequest("POST", "/api/action-dependencies", { actionId, dependsOnId });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erro ao adicionar dependência");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Dependência adicionada" });
      queryClient.invalidateQueries({ queryKey: ["/api/action-dependencies"] });
      setAddDepTargetId("");
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const removeDepMutation = useMutation({
    mutationFn: async ({ actionId, dependsOnId }: { actionId: number; dependsOnId: number }) => {
      const res = await apiRequest("DELETE", `/api/action-dependencies/${actionId}/${dependsOnId}`);
      if (!res.ok) throw new Error("Erro ao remover dependência");
    },
    onSuccess: () => {
      toast({ title: "Dependência removida" });
      queryClient.invalidateQueries({ queryKey: ["/api/action-dependencies"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!allActions.length) return;
    const dates: Date[] = [];
    allActions.forEach((a) => {
      if (a.createdAt) dates.push(parseISOSP(a.createdAt));
      if (a.dueDate) dates.push(parseISOSP(a.dueDate));
    });
    if (dates.length === 0) return;
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    const start = startOfMonth(earliest);
    const end = endOfMonth(latest);
    const monthCount = Math.max(3, Math.round(differenceInDays(end, start) / 30) + 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intencional: ajusta janela inicial do gantt aos dados; usuário pode sobrescrever via botões
    setViewStart(start);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewMonths(Math.min(monthCount, 12));
  }, [actions]);

  useEffect(() => {
    const handler = () => setTooltip(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const viewEnd = endOfMonth(addMonths(viewStart, viewMonths - 1));
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;
  const minChartPx = totalDays * MIN_DAY_PX;
  const effectiveChartPx = Math.max(chartWidth, minChartPx);
  const dayPx = chartWidth > 0 ? effectiveChartPx / totalDays : 0;

  const months: Date[] = [];
  let m = startOfMonth(viewStart);
  while (!isAfter(m, viewEnd)) {
    months.push(m);
    m = addMonths(m, 1);
  }

  const grouped: Record<string, { krTitle: string; actions: Action[] }> = {};
  allActions.forEach((action) => {
    const krKey = action.keyResult?.id?.toString() || "no-kr";
    const krTitle = action.keyResult?.title || action.keyResultTitle || "Sem Resultado-Chave";
    if (!grouped[krKey]) grouped[krKey] = { krTitle, actions: [] };
    grouped[krKey].actions.push(action);
  });

  interface Row { type: "header" | "action"; krTitle?: string; action?: Action; rowIndex?: number; }
  const rows: Row[] = [];
  let actionRowIndex = 0;
  Object.values(grouped).forEach(({ krTitle, actions: krActions }) => {
    rows.push({ type: "header", krTitle });
    krActions
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      })
      .forEach((action) => { rows.push({ type: "action", action, rowIndex: actionRowIndex++ }); });
  });

  const actionRowMap: Record<number, number> = {};
  let headerCount = 0;
  rows.forEach((row, i) => {
    if (row.type === "header") { headerCount++; return; }
    if (row.action) actionRowMap[row.action.id] = i - headerCount;
  });

  const dateToPx = (date: Date): number => {
    const offset = differenceInDays(date, viewStart);
    return Math.max(0, Math.min(effectiveChartPx, offset * dayPx));
  };

  const today = nowSP();
  const todayPx = dateToPx(today);
  const showToday = isAfter(today, viewStart) && isBefore(today, viewEnd);

  const barConfig = (action: Action) => {
    const start = action.createdAt ? startOfDay(parseISOSP(action.createdAt)) : null;
    const end = action.dueDate ? startOfDay(parseISOSP(action.dueDate)) : null;
    if (!start && !end) return null;
    const effectiveStart = start || end!;
    const effectiveEnd = end || start!;
    const leftPx = dateToPx(effectiveStart);
    const rightPx = Math.min(effectiveChartPx, dateToPx(effectiveEnd));
    const widthPx = Math.max(rightPx - leftPx, 4);
    const cfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.pending;
    const isOverdue = end && isBefore(end, today) && action.status !== "completed" && action.status !== "cancelled";
    const isPoint = !start || Math.abs(differenceInDays(effectiveEnd, effectiveStart)) < 1;
    return { leftPx, widthPx, cfg, isOverdue, isPoint, effectiveStart, effectiveEnd };
  };

  const barCenterX = (action: Action) => {
    const bc = barConfig(action);
    if (!bc) return null;
    const end = action.dueDate ? startOfDay(parseISOSP(action.dueDate)) : null;
    if (!end) return bc.leftPx + bc.widthPx / 2;
    return dateToPx(end);
  };

  const barStartX = (action: Action) => {
    const bc = barConfig(action);
    if (!bc) return null;
    return bc.leftPx;
  };

  const getRowPixelTop = (rowIndex: number): number => {
    let headersPassed = 0;
    let actionsPassed = 0;
    for (const row of rows) {
      if (row.type === "header") {
        if (actionsPassed >= rowIndex) break;
        headersPassed++;
      } else {
        if (actionsPassed === rowIndex) break;
        actionsPassed++;
      }
    }
    return (headersPassed * 32) + (rowIndex * ROW_HEIGHT) + ROW_HEIGHT / 2;
  };

  const deps = dependencies ?? [];
  const actionMap = new Map(allActions.map((a) => [a.id, a]));

  const depsForDialog = depDialogAction
    ? deps.filter((d) => d.actionId === depDialogAction.id)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
      </div>
    );
  }

  if (allActions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
        <Calendar className="h-12 w-12 text-gray-300" />
        <p className="text-base font-medium">Nenhuma ação para exibir no Gantt</p>
        <p className="text-sm">Crie ações com datas de vencimento para visualizá-las na linha do tempo</p>
        {onCreateAction && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onCreateAction}>
            Criar primeira ação
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewStart((v) => subMonths(v, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
            {formatSP(viewStart, "MMM yyyy", { locale: ptBR })} — {formatSP(viewEnd, "MMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setViewStart((v) => addMonths(v, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showDeps ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setShowDeps((v) => !v)}
            data-testid="button-toggle-dependencies"
          >
            <Link2 className="h-3.5 w-3.5" />
            {deps.length > 0 ? `Dependências (${deps.length})` : "Dependências"}
          </Button>
          <span className="text-xs text-gray-500">Zoom:</span>
          {[3, 5, 6, 9, 12].map((n) => (
            <Button key={n} variant={viewMonths === n ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMonths(n)}>
              {n}m
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className={`w-3 h-3 rounded-sm ${cfg.bg}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-3 h-3 rounded-sm bg-red-200 border border-red-400" />
          <span>Atrasada</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-0.5 h-3 bg-red-500" />
          <span>Hoje</span>
        </div>
        {showDeps && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-5 h-0.5 bg-violet-400" style={{ borderTop: "2px dashed" }} />
            <span>Dependência</span>
          </div>
        )}
      </div>

      {/* Gantt Chart */}
      <div className="relative border rounded-lg overflow-hidden bg-white" ref={outerRef}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_WIDTH + effectiveChartPx }}>

            {/* HEADER */}
            <div className="flex border-b bg-gray-50 sticky top-0 z-10">
              <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
              <div className="relative flex shrink-0" style={{ width: effectiveChartPx }}>
                {months.map((month, i) => {
                  const daysInMonth = differenceInDays(endOfMonth(month), month) + 1;
                  const monthPx = daysInMonth * dayPx;
                  return (
                    <div
                      key={i}
                      className="border-l first:border-l-0 flex items-center justify-center py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0"
                      style={{ width: monthPx }}
                    >
                      {formatSP(month, "MMM yyyy", { locale: ptBR })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SVG dependency arrows layer */}
            {showDeps && deps.length > 0 && dayPx > 0 && (
              <svg
                className="absolute pointer-events-none z-20"
                style={{ top: 32, left: LABEL_WIDTH, width: effectiveChartPx, height: rows.length * ROW_HEIGHT + 32 }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#7c3aed" opacity="0.7" />
                  </marker>
                </defs>
                {deps.map((dep) => {
                  const fromAction = actionMap.get(dep.dependsOnId);
                  const toAction = actionMap.get(dep.actionId);
                  if (!fromAction || !toAction) return null;

                  const fromRowIdx = actionRowMap[dep.dependsOnId];
                  const toRowIdx = actionRowMap[dep.actionId];
                  if (fromRowIdx === undefined || toRowIdx === undefined) return null;

                  const x1 = barCenterX(fromAction);
                  const x2 = barStartX(toAction);
                  if (x1 === null || x2 === null) return null;

                  const headersBefore = (idx: number) => {
                    let count = 0;
                    let actions = 0;
                    for (const row of rows) {
                      if (row.type === "header") { count++; continue; }
                      if (actions === idx) break;
                      actions++;
                    }
                    return count;
                  };

                  const y1 = (fromRowIdx * ROW_HEIGHT) + headersBefore(fromRowIdx) * 32 + ROW_HEIGHT / 2;
                  const y2 = (toRowIdx * ROW_HEIGHT) + headersBefore(toRowIdx) * 32 + ROW_HEIGHT / 2;

                  return (
                    <g key={`${dep.dependsOnId}-${dep.actionId}`}>
                      <path
                        d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        opacity="0.7"
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* ROWS */}
            {rows.map((row, rowIdx) => {
              if (row.type === "header") {
                return (
                  <div key={`header-${rowIdx}`} className="flex items-center bg-gray-50 border-b" style={{ minHeight: 32 }}>
                    <div className="shrink-0 px-3 text-xs font-semibold text-blue-800 truncate" style={{ width: LABEL_WIDTH }} title={row.krTitle}>
                      📌 {row.krTitle}
                    </div>
                    <div className="relative shrink-0" style={{ width: effectiveChartPx, minHeight: 32 }}>
                      {months.map((month, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: dateToPx(month) }} />
                      ))}
                      {showToday && (
                        <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-60 z-10" style={{ left: todayPx }} />
                      )}
                    </div>
                  </div>
                );
              }

              const action = row.action!;
              const bar = barConfig(action);
              const cfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.pending;
              const actionDeps = deps.filter((d) => d.actionId === action.id);

              return (
                <div
                  key={`action-${action.id}`}
                  className="flex items-center border-b hover:bg-gray-50 transition-colors group"
                  style={{ minHeight: ROW_HEIGHT }}
                >
                  <div
                    className="shrink-0 px-3 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                    style={{ width: LABEL_WIDTH }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Editar ação: ${action.title}`}
                    onClick={() => { setEditingAction(action); setShowForm(true); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditingAction(action);
                        setShowForm(true);
                      }
                    }}
                    title={action.title}
                    data-testid={`row-action-${action.id}`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.bg}`} />
                    <span className="text-xs text-gray-700 truncate group-hover:text-blue-600 transition-colors flex-1 min-w-0">
                      {action.title}
                    </span>
                    {bar?.isOverdue && <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />}
                    {actionDeps.length > 0 && (
                      <span title={`${actionDeps.length} dependência(s)`}>
                        <Link2 className="h-3 w-3 text-violet-400 shrink-0" />
                      </span>
                    )}
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Gerenciar dependências"
                      onClick={(e) => { e.stopPropagation(); setDepDialogAction(action); }}
                      data-testid={`button-dep-${action.id}`}
                    >
                      <Link2 className="h-3 w-3 text-gray-400 hover:text-violet-600" />
                    </button>
                  </div>

                  <div className="relative shrink-0" style={{ width: effectiveChartPx, height: ROW_HEIGHT }}>
                    {months.map((month, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: dateToPx(month) }} />
                    ))}
                    {showToday && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10" style={{ left: todayPx }} />
                    )}
                    {bar && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 rounded cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                          ${bar.isPoint ? "w-3 h-3 rounded-full border-2" : "h-6"}
                          ${bar.isOverdue ? "bg-red-200 border border-red-400" : `${cfg.bg} border ${cfg.border}`}
                        `}
                        style={{ left: bar.leftPx, width: bar.isPoint ? undefined : bar.widthPx }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Detalhes da ação: ${action.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTooltip({ action, x: rect.left, y: rect.top });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({ action, x: rect.left, y: rect.top });
                          }
                        }}
                        data-testid={`bar-action-${action.id}`}
                      >
                        {!bar.isPoint && bar.widthPx > 30 && (
                          <span className="absolute inset-0 flex items-center px-1.5 text-white text-[10px] font-medium truncate leading-none">
                            {action.title}
                          </span>
                        )}
                      </div>
                    )}
                    {!bar && (
                      <div className="absolute inset-0 flex items-center">
                        <span className="text-[10px] text-gray-400 italic pl-2">sem data</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = allActions.filter((a) => a.status === status).length;
          const Icon = cfg.icon;
          return (
            <div key={status} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
              <Icon className={`h-4 w-4 ${cfg.color}`} />
              <div>
                <p className={`text-sm font-semibold ${cfg.color}`}>{count}</p>
                <p className="text-xs text-gray-500">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 max-w-xs pointer-events-none"
          style={{
            top: Math.min(tooltip.y - 10, window.innerHeight - 200),
            left: Math.min(tooltip.x + 10, window.innerWidth - 280),
          }}
        >
          <p className="font-semibold text-gray-800 text-sm mb-2">{tooltip.action.title}</p>
          {tooltip.action.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{tooltip.action.description}</p>
          )}
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge className={`text-[10px] px-1.5 py-0 border ${PRIORITY_COLORS[tooltip.action.priority] || "bg-gray-100 text-gray-600"}`} variant="outline">
              {PRIORITY_LABELS[tooltip.action.priority] || tooltip.action.priority}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[tooltip.action.status]?.bg || "bg-gray-400"} text-white border-0`}>
              {STATUS_CONFIG[tooltip.action.status]?.label || tooltip.action.status}
            </Badge>
          </div>
          {tooltip.action.dueDate && (
            <p className="text-xs text-gray-500">
              <span className="font-medium">Prazo:</span>{" "}
              {formatSP(tooltip.action.dueDate, "dd 'de' MMMM yyyy", { locale: ptBR })}
            </p>
          )}
          {tooltip.action.responsible && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Responsável:</span> {tooltip.action.responsible.name}
            </p>
          )}
          {tooltip.action.keyResult?.title && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">KR:</span> {tooltip.action.keyResult.title}
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-2 italic">Clique na barra para editar</p>
        </div>
      )}

      {/* Edit form */}
      <ActionForm
        action={editingAction}
        onSuccess={() => { setShowForm(false); setEditingAction(null); }}
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditingAction(null); }}
      />

      {/* Dependency management dialog */}
      <Dialog open={!!depDialogAction} onOpenChange={(o) => { if (!o) { setDepDialogAction(null); setAddDepTargetId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-violet-500" />
              Dependências da Ação
            </DialogTitle>
            <DialogDescription className="text-xs truncate">
              {depDialogAction?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Esta ação depende de:
              </p>
              {depsForDialog.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nenhuma dependência configurada</p>
              ) : (
                <div className="space-y-1.5">
                  {depsForDialog.map((dep) => {
                    const depAction = actionMap.get(dep.dependsOnId);
                    return (
                      <div key={dep.id} className="flex items-center justify-between gap-2 p-2 bg-violet-50 rounded-lg border border-violet-100">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Link2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">
                            {depAction?.title ?? `Ação #${dep.dependsOnId}`}
                          </span>
                        </div>
                        <button
                          onClick={() => removeDepMutation.mutate({ actionId: dep.actionId, dependsOnId: dep.dependsOnId })}
                          disabled={removeDepMutation.isPending}
                          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover dependência"
                          data-testid={`button-remove-dep-${dep.dependsOnId}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Adicionar dependência
              </p>
              <div className="flex gap-2">
                <select
                  className="flex-1 text-sm border rounded-lg px-2 py-1.5 bg-white"
                  value={addDepTargetId}
                  onChange={(e) => setAddDepTargetId(e.target.value)}
                  data-testid="select-dep-target"
                >
                  <option value="">Selecione uma ação...</option>
                  {allActions
                    .filter((a) => {
                      if (!depDialogAction || a.id === depDialogAction.id) return false;
                      const alreadyDep = depsForDialog.some((d) => d.dependsOnId === a.id);
                      return !alreadyDep;
                    })
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={!addDepTargetId || addDepMutation.isPending}
                  onClick={() => {
                    if (!depDialogAction || !addDepTargetId) return;
                    addDepMutation.mutate({
                      actionId: depDialogAction.id,
                      dependsOnId: parseInt(addDepTargetId),
                    });
                  }}
                  data-testid="button-add-dep"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Esta ação começará após a ação selecionada ser concluída (finish-to-start).
                Ciclos são detectados e bloqueados automaticamente.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
