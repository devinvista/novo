import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { parseDecimalBR, formatDateBR } from "@/lib/formatters";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KrProgressChartProps {
  keyResultId: number;
  unit?: string;
  targetValue?: number | string;
  /** "mini" = always-visible tiny sparkline only (used in alignment tree) */
  mode?: "default" | "mini";
}

interface ChartPoint {
  period: string;
  actualValue: number;
  targetValue: number;
  progress: number;
  completed: boolean;
  status: string;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const progressColor = (pct: number) =>
  pct >= 80 ? "#10b981" : pct >= 50 ? "#3b82f6" : pct >= 25 ? "#f59e0b" : "#ef4444";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const FullTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p: any) => p.dataKey === "actualValue");
  const target = payload.find((p: any) => p.dataKey === "targetValue");
  const prog = payload.find((p: any) => p.dataKey === "progress");
  const pct = prog?.value ?? 0;
  const color = progressColor(pct);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-xl min-w-[150px]">
      <p className="font-semibold text-gray-700 mb-2 border-b pb-1">{label}</p>
      {actual && (
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-gray-500">Realizado</span>
          <span className="font-semibold text-blue-600">
            {Number(actual.value).toLocaleString("pt-BR")} {unit || ""}
          </span>
        </div>
      )}
      {target && (
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-gray-500">Meta período</span>
          <span className="font-semibold text-gray-500">
            {Number(target.value).toLocaleString("pt-BR")} {unit || ""}
          </span>
        </div>
      )}
      {prog && (
        <div className="flex justify-between gap-4 mt-2 pt-1 border-t">
          <span className="text-gray-500">Progresso</span>
          <span className="font-bold" style={{ color }}>
            {pct.toFixed(1).replace(".", ",")}%
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Mini Sparkline (always-visible, no toggle) ───────────────────────────────

function MiniSparkline({ data, color }: { data: ChartPoint[]; color: string }) {
  // eslint-disable-next-line react-hooks/purity
  const gradId = `spark-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 2" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="progress"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Full Expanded Chart ──────────────────────────────────────────────────────

function FullChart({
  data,
  unit,
  color,
  krId,
}: {
  data: ChartPoint[];
  unit?: string;
  color: string;
  krId: number;
}) {
  const gradId = `kr-grad-${krId}`;

  return (
    <div className="space-y-1">
      {/* Dual-axis: Actual vs Target values */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium px-1 mb-1">
          Valor realizado vs. Meta
        </p>
        <div className="rounded-lg bg-gray-50 border px-2 pt-3 pb-1">
          <ResponsiveContainer width="100%" height={130}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                }
                width={34}
              />
              <Tooltip content={<FullTooltip unit={unit} />} />
              {/* Target line */}
              <Line
                type="monotone"
                dataKey="targetValue"
                stroke="#d1d5db"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                name="Meta"
              />
              {/* Actual area + line */}
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="actualValue"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                name="Realizado"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      key={`dot-actual-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={payload.completed ? 4 : 3}
                      fill={payload.completed ? color : "#fff"}
                      stroke={color}
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center mt-1 pb-1">
            <div className="flex items-center gap-1">
              <div className="w-4 h-px" style={{ backgroundColor: color, borderTop: `2px solid ${color}` }} />
              <span className="text-[9px] text-gray-500">Realizado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0 border-t-2 border-dashed border-gray-400" />
              <span className="text-[9px] text-gray-500">Meta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress % line */}
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium px-1 mb-1 mt-2">
          % de conclusão por checkpoint
        </p>
        <div className="rounded-lg bg-gray-50 border px-2 pt-3 pb-1">
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`pct-${krId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={34}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const pct = payload[0].value as number;
                  return (
                    <div className="bg-white border border-gray-200 rounded p-2 text-xs shadow-sm">
                      <p className="font-medium text-gray-700">{label}</p>
                      <p className="font-bold" style={{ color: progressColor(pct) }}>
                        {pct.toFixed(1).replace(".", ",")}%
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={100}
                stroke="#10b981"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: "100%", position: "right", fontSize: 9, fill: "#10b981" }}
              />
              <Area
                type="monotone"
                dataKey="progress"
                stroke={color}
                strokeWidth={2}
                fill={`url(#pct-${krId})`}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      key={`dot-pct-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={payload.completed ? 3.5 : 2.5}
                      fill={payload.completed ? color : "#fff"}
                      stroke={color}
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-center text-[10px] text-gray-400 mt-0.5">
            {data.length} checkpoint{data.length !== 1 ? "s" : ""} com dados registrados
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KrProgressChart({
  keyResultId,
  unit,
  targetValue,
  mode = "default",
}: KrProgressChartProps) {
  const [expanded, setExpanded] = useState(false);

  // Busca todos os checkpoints de uma vez (compartilhado entre todos os KrProgressChart)
  // e filtra client-side pelo keyResultId — evita N+1 requests
  const { data: allCheckpoints, isLoading } = useQuery({
    queryKey: ["/api/checkpoints"],
    queryFn: async () => {
      const r = await fetch("/api/checkpoints", { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const checkpoints = useMemo(
    () => (allCheckpoints || []).filter((cp: any) => cp.keyResultId === keyResultId),
    [allCheckpoints, keyResultId]
  );

  const chartData: ChartPoint[] = useMemo(() => {
    return checkpoints
      .filter((cp: any) => {
        const actual = parseDecimalBR(cp.actualValue || "0");
        return cp.status === "completed" || actual > 0;
      })
      .map((cp: any) => {
        const actual = parseDecimalBR(cp.actualValue || "0");
        const target = parseDecimalBR(cp.targetValue || "0");
        const progress = target > 0 ? Math.min((actual / target) * 100, 150) : 0;
        return {
          period: cp.period ? formatDateBR(cp.period) : (cp.title || "—"),
          actualValue: actual,
          targetValue: target,
          progress: parseFloat(progress.toFixed(1)),
          completed: cp.status === "completed",
          status: cp.status,
        } as ChartPoint;
      });
  }, [checkpoints]);

  const hasData = chartData.length > 0;

  // Trend
  const firstPct = chartData.length > 0 ? chartData[0].progress : null;
  const lastPct = chartData.length > 0 ? chartData[chartData.length - 1].progress : null;
  const trend =
    firstPct === null || lastPct === null
      ? "neutral"
      : lastPct > firstPct
      ? "up"
      : lastPct < firstPct
      ? "down"
      : "neutral";
  const color = lastPct !== null ? progressColor(lastPct) : "#6b7280";

  // ── Mini mode (alignment tree) ──────────────────────────────────────────────
  if (mode === "mini") {
    if (isLoading) return <Skeleton className="h-12 w-full rounded" />;
    if (!hasData) return null;
    return (
      <div className="mt-1">
        <MiniSparkline data={chartData} color={color} />
      </div>
    );
  }

  // ── Default mode (key-results page) ────────────────────────────────────────
  return (
    <div className="border-t pt-3 mt-1">
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`btn-history-${keyResultId}`}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          <span className="text-xs font-semibold text-gray-700">Histórico de progresso</span>
          {hasData && lastPct !== null && (
            <span className="text-xs font-bold" style={{ color }}>
              {lastPct.toFixed(0)}%
            </span>
          )}
          {hasData && trend !== "neutral" && (
            <span className="flex items-center">
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </span>
          )}
          {!hasData && !isLoading && (
            <span className="text-[10px] text-gray-400 italic">sem dados</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hasData && (
            <span className="text-[10px] text-gray-400">{chartData.length} checkpoints</span>
          )}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Mini sparkline — always visible when there's data */}
      {isLoading ? (
        <Skeleton className="h-12 w-full rounded mt-2" />
      ) : hasData ? (
        <div className="mt-2">
          <MiniSparkline data={chartData} color={color} />
        </div>
      ) : (
        <div className="h-12 mt-2 flex items-center justify-center bg-gray-50 rounded border border-dashed">
          <span className="text-[10px] text-gray-400">
            Nenhum checkpoint com dados ainda
          </span>
        </div>
      )}

      {/* Checkpoint status pills */}
      {hasData && (
        <div className="flex flex-wrap gap-1 mt-2">
          {chartData.map((pt, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${
                pt.completed
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              {pt.completed ? (
                <CheckCircle className="h-2.5 w-2.5" />
              ) : (
                <Circle className="h-2.5 w-2.5" />
              )}
              {pt.period}
              <span
                className="font-bold ml-0.5"
                style={{ color: progressColor(pt.progress) }}
              >
                {pt.progress.toFixed(0)}%
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Expanded full chart */}
      {expanded && hasData && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <FullChart data={chartData} unit={unit} color={color} krId={keyResultId} />
        </div>
      )}
    </div>
  );
}
