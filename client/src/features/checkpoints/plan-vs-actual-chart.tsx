import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { parseDecimalBR, formatDateBR } from "@/lib/formatters";

interface PlanVsActualChartProps {
  checkpoints: any[];
  unit?: string | null;
}

/**
 * Gráfico comparando a curva PLANEJADA (somatório dos targetValue por
 * checkpoint, em ordem cronológica) com o REALIZADO (último valor reportado
 * por check-in até a data do checkpoint).
 *
 * Pontos futuros mostram apenas o plano — o realizado fica nulo.
 */
export default function PlanVsActualChart({ checkpoints, unit }: PlanVsActualChartProps) {
  const data = useMemo(() => {
    if (!checkpoints || checkpoints.length === 0) return [];
    const sorted = [...checkpoints].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    const now = new Date();
    return sorted.map((cp) => {
      const target = parseDecimalBR(cp.targetValue || "0");
      const reported = cp.reportedValue ?? cp.actualValue ?? "0";
      const actual = parseDecimalBR(reported);
      const isFuture = new Date(cp.dueDate) > now;
      return {
        label: formatDateBR(cp.dueDate),
        plano: Number(target.toFixed(2)),
        realizado: isFuture && actual === 0 ? null : Number(actual.toFixed(2)),
      };
    });
  }, [checkpoints]);

  const summary = useMemo(() => {
    const last = [...data].reverse().find((d) => d.realizado !== null);
    if (!last) return { variance: null, label: "Sem dados de realizado" };
    const variance = last.plano > 0 ? ((last.realizado! - last.plano) / last.plano) * 100 : 0;
    const label =
      variance > 5
        ? "Acima do plano"
        : variance < -5
          ? "Abaixo do plano"
          : "Dentro do plano";
    return { variance, label };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <Card data-testid="card-plan-vs-actual">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4" />
              Plano vs. Realizado
            </CardTitle>
            <CardDescription>
              Curva planejada (checkpoints) comparada com o reporte semanal (check-ins).
            </CardDescription>
          </div>
          {summary.variance !== null ? (
            <Badge
              variant="outline"
              className={
                summary.variance > 5
                  ? "border-green-300 bg-green-50 text-green-800"
                  : summary.variance < -5
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-amber-300 bg-amber-50 text-amber-800"
              }
              data-testid="badge-plan-variance"
            >
              {summary.variance > 5 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : summary.variance < -5 ? (
                <TrendingDown className="mr-1 h-3 w-3" />
              ) : (
                <Minus className="mr-1 h-3 w-3" />
              )}
              {summary.variance >= 0 ? "+" : ""}
              {summary.variance.toFixed(1)}% — {summary.label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit={unit ? ` ${unit}` : ""} />
              <Tooltip
                contentStyle={{ fontSize: "12px" }}
                formatter={(value, name) => [
                  value === null || value === undefined
                    ? "—"
                    : `${value} ${unit ?? ""}`.trim(),
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="plano"
                name="Plano"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="hsl(var(--primary))"
                fillOpacity={0.08}
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="realizado"
                name="Realizado (check-in)"
                stroke="hsl(var(--chart-2, 173 58% 39%))"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
