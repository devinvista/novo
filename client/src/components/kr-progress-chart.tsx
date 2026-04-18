import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseDecimalBR } from "@/lib/formatters";

interface KrProgressChartProps {
  keyResultId: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs shadow-lg">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        <p style={{ color }} className="font-medium">
          {value.toFixed(1).replace(".", ",")}% concluído
        </p>
      </div>
    );
  }
  return null;
};

export default function KrProgressChart({ keyResultId }: KrProgressChartProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ["/api/checkpoints", keyResultId, "chart"],
    queryFn: async () => {
      const r = await fetch(`/api/checkpoints?keyResultId=${keyResultId}`, {
        credentials: "include",
      });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const chartData = (checkpoints || [])
    .filter((cp: any) => {
      const actual = parseDecimalBR(cp.actualValue || "0");
      return cp.status === "completed" || actual > 0;
    })
    .map((cp: any) => {
      const actual = parseDecimalBR(cp.actualValue || "0");
      const target = parseDecimalBR(cp.targetValue || "0");
      const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
      return {
        period: cp.period || cp.title || "—",
        progress: parseFloat(progress.toFixed(1)),
        completed: cp.status === "completed",
      };
    });

  const hasData = chartData.length > 0;

  const latestProgress = chartData.length > 0
    ? chartData[chartData.length - 1].progress
    : null;

  const trendColor =
    latestProgress == null
      ? "#6b7280"
      : latestProgress >= 70
      ? "#10b981"
      : latestProgress >= 40
      ? "#f59e0b"
      : "#ef4444";

  const gradientId = `kr-gradient-${keyResultId}`;

  return (
    <div className="border-t pt-3 mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground h-8 px-0 hover:bg-transparent"
        onClick={() => setIsOpen(!isOpen)}
        data-testid={`btn-history-${keyResultId}`}
      >
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" style={{ color: trendColor }} />
          <span className="text-xs font-medium">Histórico de progresso</span>
          {!isOpen && hasData && latestProgress !== null && (
            <span
              className="text-xs font-semibold ml-1"
              style={{ color: trendColor }}
            >
              ({latestProgress.toFixed(0).replace(".", ",")}% último checkpoint)
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </Button>

      {isOpen && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : !hasData ? (
            <div className="h-32 flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed">
              <TrendingUp className="h-6 w-6 text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">
                Nenhum checkpoint com dados ainda
              </p>
              <p className="text-xs text-muted-foreground/70">
                Atualize um checkpoint para ver o histórico
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/10 border px-2 pt-3 pb-1">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={trendColor}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={trendColor}
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
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
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={100}
                    stroke="#10b981"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{
                      value: "Meta",
                      position: "right",
                      fontSize: 9,
                      fill: "#10b981",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="progress"
                    stroke={trendColor}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={payload.completed ? 3.5 : 2.5}
                          fill={payload.completed ? trendColor : "#fff"}
                          stroke={trendColor}
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 5, stroke: trendColor, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-center text-[10px] text-muted-foreground/60 mt-0.5">
                {chartData.length} checkpoint{chartData.length !== 1 ? "s" : ""} com dados registrados
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
