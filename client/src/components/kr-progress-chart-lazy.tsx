import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const KrProgressChart = lazy(() => import("./kr-progress-chart"));

interface KrProgressChartLazyProps {
  keyResultId: number;
  unit?: string;
  targetValue?: string | number;
  mode?: "default" | "mini";
}

/**
 * Lazy wrapper around `KrProgressChart` so the heavy `recharts` bundle is
 * fetched only when a chart actually renders. Each instance has its own
 * Suspense boundary so other parts of the page render immediately.
 */
export default function KrProgressChartLazy(props: KrProgressChartLazyProps) {
  const isMini = props.mode === "mini";
  return (
    <Suspense
      fallback={
        <Skeleton
          className={isMini ? "h-12 w-full" : "h-48 w-full"}
          data-testid="status-kr-chart-loading"
        />
      }
    >
      <KrProgressChart {...props} />
    </Suspense>
  );
}
