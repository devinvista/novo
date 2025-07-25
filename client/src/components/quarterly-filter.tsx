import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";

interface QuarterlyFilterProps {
  variant?: "header" | "card" | "compact" | "sidebar";
  className?: string;
}

export default function QuarterlyFilter({ variant = "header", className = "" }: QuarterlyFilterProps) {
  const { selectedQuarter, setSelectedQuarter } = useQuarterlyFilter();

  const { data: availableQuarters } = useQuery({
    queryKey: ["/api/quarters"],
    queryFn: async () => {
      const response = await fetch("/api/quarters", { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao carregar trimestres");
      return response.json();
    }
  });

  // Different styles based on variant
  const getStyles = () => {
    switch (variant) {
      case "header":
        return {
          trigger: "w-64 bg-white/10 border-white/20 text-white backdrop-blur-sm",
          placeholder: "🗓️ Todos os períodos"
        };
      case "card":
        return {
          trigger: "w-full",
          placeholder: "📅 Filtrar por período"
        };
      case "compact":
        return {
          trigger: "w-48",
          placeholder: "Período"
        };
      case "sidebar":
        return {
          trigger: "w-full bg-sidebar-background border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent",
          placeholder: "Todos os períodos"
        };
      default:
        return {
          trigger: "w-64",
          placeholder: "🗓️ Todos os períodos"
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {variant === "card" && <Calendar className="h-4 w-4 text-muted-foreground" />}
      <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
        <SelectTrigger className={styles.trigger}>
          <SelectValue placeholder={styles.placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os períodos</SelectItem>
          {availableQuarters?.map((quarter: any) => {
            // Handle both string and object formats
            const quarterValue = typeof quarter === 'string' ? quarter : quarter.id;
            const quarterDisplay = typeof quarter === 'string' && quarter.includes('-Q')
              ? (() => {
                  const [year, q] = quarter.split('-Q');
                  return `${q}T ${year}`;
                })()
              : (quarter?.name || quarterValue || quarter);
            
            return (
              <SelectItem key={quarterValue} value={quarterValue}>
                {quarterDisplay}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}