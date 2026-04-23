import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  startOfMonth, endOfMonth, addMonths, subMonths,
  differenceInDays, isBefore, isAfter, startOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatSP, parseISOSP, nowSP } from "@/lib/timezone";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock, Circle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
const MIN_DAY_PX = 5; // minimum pixels per day to ensure readability

export default function GanttTimeline({ keyResultId, selectedQuarter, filters, onCreateAction }: GanttTimelineProps) {
  const [viewStart, setViewStart] = useState(() => startOfMonth(subMonths(nowSP(), 1)));
  const [viewMonths, setViewMonths] = useState(5);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const outerRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  // Measure chart area width and keep it in sync on resize
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

  // Auto-fit view to cover all action dates
  useEffect(() => {
    if (!actions || actions.length === 0) return;
    const dates: Date[] = [];
    (actions as Action[]).forEach((a) => {
      if (a.createdAt) dates.push(parseISOSP(a.createdAt));
      if (a.dueDate) dates.push(parseISOSP(a.dueDate));
    });
    if (dates.length === 0) return;
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    const start = startOfMonth(earliest);
    const end = endOfMonth(latest);
    const monthCount = Math.max(3, Math.round(differenceInDays(end, start) / 30) + 1);
    setViewStart(start);
    setViewMonths(Math.min(monthCount, 12));
  }, [actions]);

  // Close tooltip on outside click
  useEffect(() => {
    const handler = () => setTooltip(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const viewEnd = endOfMonth(addMonths(viewStart, viewMonths - 1));
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  // Effective chart pixel width: at least MIN_DAY_PX * totalDays
  const minChartPx = totalDays * MIN_DAY_PX;
  const effectiveChartPx = Math.max(chartWidth, minChartPx);

  // px per day — fixed, independent of screen width
  const dayPx = chartWidth > 0 ? effectiveChartPx / totalDays : 0;

  // Build months array
  const months: Date[] = [];
  let m = startOfMonth(viewStart);
  while (!isAfter(m, viewEnd)) {
    months.push(m);
    m = addMonths(m, 1);
  }

  // Group actions by KR
  const grouped: Record<string, { krTitle: string; actions: Action[] }> = {};
  const allActions: Action[] = Array.isArray(actions) ? actions : [];

  allActions.forEach((action) => {
    const krKey = action.keyResult?.id?.toString() || "no-kr";
    const krTitle = action.keyResult?.title || action.keyResultTitle || "Sem Resultado-Chave";
    if (!grouped[krKey]) grouped[krKey] = { krTitle, actions: [] };
    grouped[krKey].actions.push(action);
  });

  interface Row { type: "header" | "action"; krTitle?: string; action?: Action; }
  const rows: Row[] = [];
  Object.values(grouped).forEach(({ krTitle, actions: krActions }) => {
    rows.push({ type: "header", krTitle });
    krActions
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      })
      .forEach((action) => rows.push({ type: "action", action }));
  });

  // Convert a date to pixel offset from viewStart
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
        <div className="flex items-center gap-2">
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
      </div>

      {/* Gantt Chart */}
      <div className="relative border rounded-lg overflow-hidden bg-white" ref={outerRef}>
        {/* Scrollable wrapper so chart doesn't collapse on small screens */}
        <div className="overflow-x-auto">
          {/* Inner fixed-layout container */}
          <div style={{ minWidth: LABEL_WIDTH + effectiveChartPx }}>

            {/* ── HEADER ── */}
            <div className="flex border-b bg-gray-50 sticky top-0 z-10">
              {/* Label placeholder — exactly same width as the label column */}
              <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />

              {/* Month cells — each uses pixel width derived from dayPx */}
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

            {/* ── ROWS ── */}
            {rows.map((row, rowIdx) => {
              if (row.type === "header") {
                return (
                  <div key={`header-${rowIdx}`} className="flex items-center bg-gray-50 border-b" style={{ minHeight: 32 }}>
                    {/* KR title label */}
                    <div
                      className="shrink-0 px-3 text-xs font-semibold text-blue-800 truncate"
                      style={{ width: LABEL_WIDTH }}
                      title={row.krTitle}
                    >
                      📌 {row.krTitle}
                    </div>
                    {/* Grid area */}
                    <div className="relative shrink-0" style={{ width: effectiveChartPx, minHeight: 32 }}>
                      {months.map((month, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-l border-gray-200"
                          style={{ left: dateToPx(month) }}
                        />
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

              return (
                <div
                  key={`action-${action.id}`}
                  className="flex items-center border-b hover:bg-gray-50 transition-colors group"
                  style={{ minHeight: ROW_HEIGHT }}
                >
                  {/* Action label */}
                  <div
                    className="shrink-0 px-3 flex items-center gap-2 cursor-pointer"
                    style={{ width: LABEL_WIDTH }}
                    onClick={() => { setEditingAction(action); setShowForm(true); }}
                    title={action.title}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.bg}`} />
                    <span className="text-xs text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </span>
                    {bar?.isOverdue && <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />}
                  </div>

                  {/* Bar area — exact same pixel width as header chart area */}
                  <div className="relative shrink-0" style={{ width: effectiveChartPx, height: ROW_HEIGHT }}>
                    {/* Month dividers */}
                    {months.map((month, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-gray-100"
                        style={{ left: dateToPx(month) }}
                      />
                    ))}

                    {/* Today line */}
                    {showToday && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10" style={{ left: todayPx }} />
                    )}

                    {/* Bar */}
                    {bar && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 rounded cursor-pointer transition-opacity hover:opacity-80
                          ${bar.isPoint ? "w-3 h-3 rounded-full border-2" : "h-6"}
                          ${bar.isOverdue ? "bg-red-200 border border-red-400" : `${cfg.bg} border ${cfg.border}`}
                        `}
                        style={{
                          left: bar.leftPx,
                          width: bar.isPoint ? undefined : bar.widthPx,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setTooltip({ action, x: rect.left, y: rect.top });
                        }}
                      >
                        {!bar.isPoint && bar.widthPx > 30 && (
                          <span className="absolute inset-0 flex items-center px-1.5 text-white text-[10px] font-medium truncate leading-none">
                            {action.title}
                          </span>
                        )}
                      </div>
                    )}

                    {/* No date indicator */}
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
          {tooltip.action.createdAt && (
            <p className="text-xs text-gray-500">
              <span className="font-medium">Criada:</span>{" "}
              {formatSP(tooltip.action.createdAt, "dd 'de' MMMM yyyy", { locale: ptBR })}
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
    </>
  );
}
