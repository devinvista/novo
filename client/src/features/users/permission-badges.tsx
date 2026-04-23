import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type BadgeTone = "blue" | "green" | "purple" | "red" | "neutral";

const TONE: Record<BadgeTone, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  red: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-muted text-muted-foreground border-border",
};

interface Item {
  id: number;
  name: string;
}

interface Props {
  label: string;
  items: Item[];
  tone: BadgeTone;
  /** Quantos badges mostrar antes de colapsar em "+N mais". Padrão: 3. */
  maxVisible?: number;
  testIdPrefix?: string;
}

/**
 * Lista compacta de badges com colapso quando há muitos itens.
 * - Até `maxVisible` badges aparecem inline.
 * - Excedente vira um único chip "+N" clicável que abre um popover com a lista completa.
 * - Tooltip mostra contagem total ao passar o mouse no chip.
 */
export const PermissionBadgeList = memo(function PermissionBadgeList({
  label,
  items,
  tone,
  maxVisible = 3,
  testIdPrefix,
}: Props) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;

  const cls = TONE[tone];
  const visible = items.slice(0, maxVisible);
  const hidden = items.slice(maxVisible);

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      {visible.map((it) => (
        <Badge
          key={it.id}
          variant="outline"
          className={cn("text-xs px-1.5 py-0 max-w-[180px] truncate", cls)}
          title={it.name}
          data-testid={testIdPrefix ? `${testIdPrefix}-${it.id}` : undefined}
        >
          {it.name}
        </Badge>
      ))}

      {hidden.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center rounded-full border px-1.5 py-0 text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer",
                      cls
                    )}
                    aria-label={`Mostrar mais ${hidden.length} ${label.toLowerCase()}`}
                    data-testid={testIdPrefix ? `${testIdPrefix}-more` : undefined}
                  >
                    +{hidden.length}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {items.length} {label.toLowerCase()} no total — clique para ver tudo
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent
            align="start"
            className="w-80 max-h-72 overflow-y-auto p-2"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-popover py-1">
              {label} ({items.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {items.map((it) => (
                <Badge
                  key={it.id}
                  variant="outline"
                  className={cn("text-xs px-1.5 py-0", cls)}
                >
                  {it.name}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
});
