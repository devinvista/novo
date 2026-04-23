import { memo, useMemo, useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Solution {
  id: number;
  name: string;
}
export interface ServiceLine {
  id: number;
  name: string;
  solutionId: number;
}
export interface Service {
  id: number;
  name: string;
  serviceLineId: number;
}

export interface PermissionTreeValue {
  solutionIds: number[];
  serviceLineIds: number[];
  serviceIds: number[];
}

interface Props {
  solutions: Solution[];
  serviceLines: ServiceLine[];
  services: Service[];
  value: PermissionTreeValue;
  onChange: (next: PermissionTreeValue) => void;
  disabled?: boolean;
  helperText?: string;
}

function toSet(arr: number[] | undefined) {
  return new Set<number>(arr ?? []);
}

const Row = memo(function Row({
  id,
  label,
  checked,
  indeterminate,
  onToggle,
  level,
  count,
  expanded,
  onExpand,
  testId,
}: {
  id: string;
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onToggle: (next: boolean) => void;
  level: 0 | 1 | 2;
  count?: { selected: number; total: number };
  expanded?: boolean;
  onExpand?: () => void;
  testId: string;
}) {
  const padLeft = level === 0 ? "pl-0" : level === 1 ? "pl-6" : "pl-12";
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors",
        padLeft
      )}
    >
      {onExpand ? (
        <button
          type="button"
          onClick={onExpand}
          className="h-5 w-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Recolher" : "Expandir"}
          data-testid={`${testId}-expand`}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        <span className="h-5 w-5 inline-block" aria-hidden />
      )}
      <Checkbox
        id={id}
        checked={indeterminate ? "indeterminate" : checked}
        onCheckedChange={(v) => onToggle(Boolean(v))}
        data-testid={testId}
      />
      <label
        htmlFor={id}
        className={cn(
          "text-sm leading-none cursor-pointer flex-1 select-none",
          level === 0 ? "font-semibold" : level === 1 ? "font-medium" : "font-normal"
        )}
      >
        {label}
      </label>
      {count && (
        <Badge
          variant={count.selected > 0 ? "default" : "outline"}
          className="text-[10px] px-1.5 py-0 h-4"
        >
          {count.selected}/{count.total}
        </Badge>
      )}
    </div>
  );
});

export function PermissionTreePicker({
  solutions,
  serviceLines,
  services,
  value,
  onChange,
  disabled,
  helperText,
}: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [expandedLines, setExpandedLines] = useState<Record<number, boolean>>({});

  // O(1) selection lookups
  const selSolutions = useMemo(() => toSet(value.solutionIds), [value.solutionIds]);
  const selLines = useMemo(() => toSet(value.serviceLineIds), [value.serviceLineIds]);
  const selServices = useMemo(() => toSet(value.serviceIds), [value.serviceIds]);

  // Pre-build hierarchy maps once per data change
  const linesBySolution = useMemo(() => {
    const m = new Map<number, ServiceLine[]>();
    for (const sl of serviceLines) {
      if (!m.has(sl.solutionId)) m.set(sl.solutionId, []);
      m.get(sl.solutionId)!.push(sl);
    }
    return m;
  }, [serviceLines]);

  const servicesByLine = useMemo(() => {
    const m = new Map<number, Service[]>();
    for (const s of services) {
      if (!m.has(s.serviceLineId)) m.set(s.serviceLineId, []);
      m.get(s.serviceLineId)!.push(s);
    }
    return m;
  }, [services]);

  // Filter by search query (case-insensitive). Keep parents whose descendants match.
  const q = query.trim().toLowerCase();
  const filteredTree = useMemo(() => {
    return solutions
      .map((sol) => {
        const lines = (linesBySolution.get(sol.id) ?? []).map((sl) => {
          const svcs = (servicesByLine.get(sl.id) ?? []).filter(
            (s) => !q || s.name.toLowerCase().includes(q)
          );
          const lineMatches = !q || sl.name.toLowerCase().includes(q);
          if (!q || lineMatches || svcs.length > 0) {
            return { line: sl, services: lineMatches && !q ? servicesByLine.get(sl.id) ?? [] : svcs };
          }
          return null;
        }).filter(Boolean) as { line: ServiceLine; services: Service[] }[];
        const solMatches = !q || sol.name.toLowerCase().includes(q);
        if (!q || solMatches || lines.length > 0) {
          if (solMatches && !q) {
            return {
              solution: sol,
              lines: (linesBySolution.get(sol.id) ?? []).map((sl) => ({
                line: sl,
                services: servicesByLine.get(sl.id) ?? [],
              })),
            };
          }
          return { solution: sol, lines };
        }
        return null;
      })
      .filter(Boolean) as {
      solution: Solution;
      lines: { line: ServiceLine; services: Service[] }[];
    }[];
  }, [solutions, linesBySolution, servicesByLine, q]);

  // Counts (selected / total) per solution and per line, considering full data (not filter)
  const solutionCounts = useMemo(() => {
    const m = new Map<number, { selected: number; total: number }>();
    for (const sol of solutions) {
      const lines = linesBySolution.get(sol.id) ?? [];
      let total = 0;
      let selected = 0;
      for (const sl of lines) {
        const svcs = servicesByLine.get(sl.id) ?? [];
        total += svcs.length;
        for (const s of svcs) if (selServices.has(s.id)) selected += 1;
      }
      m.set(sol.id, { selected, total });
    }
    return m;
  }, [solutions, linesBySolution, servicesByLine, selServices]);

  const lineCounts = useMemo(() => {
    const m = new Map<number, { selected: number; total: number }>();
    for (const sl of serviceLines) {
      const svcs = servicesByLine.get(sl.id) ?? [];
      let selected = 0;
      for (const s of svcs) if (selServices.has(s.id)) selected += 1;
      m.set(sl.id, { selected, total: svcs.length });
    }
    return m;
  }, [serviceLines, servicesByLine, selServices]);

  const emit = useCallback(
    (next: { sol?: Set<number>; line?: Set<number>; svc?: Set<number> }) => {
      onChange({
        solutionIds: Array.from(next.sol ?? selSolutions),
        serviceLineIds: Array.from(next.line ?? selLines),
        serviceIds: Array.from(next.svc ?? selServices),
      });
    },
    [onChange, selSolutions, selLines, selServices]
  );

  // Toggle a single solution: cascade to its lines and services
  const toggleSolution = useCallback(
    (sol: Solution, on: boolean) => {
      const sols = new Set(selSolutions);
      const lines = new Set(selLines);
      const svcs = new Set(selServices);
      const childLines = linesBySolution.get(sol.id) ?? [];
      if (on) {
        sols.add(sol.id);
        for (const sl of childLines) {
          lines.add(sl.id);
          for (const s of servicesByLine.get(sl.id) ?? []) svcs.add(s.id);
        }
      } else {
        sols.delete(sol.id);
        for (const sl of childLines) {
          lines.delete(sl.id);
          for (const s of servicesByLine.get(sl.id) ?? []) svcs.delete(s.id);
        }
      }
      emit({ sol: sols, line: lines, svc: svcs });
    },
    [selSolutions, selLines, selServices, linesBySolution, servicesByLine, emit]
  );

  const toggleLine = useCallback(
    (sl: ServiceLine, on: boolean) => {
      const lines = new Set(selLines);
      const svcs = new Set(selServices);
      const sols = new Set(selSolutions);
      const childSvcs = servicesByLine.get(sl.id) ?? [];
      if (on) {
        lines.add(sl.id);
        for (const s of childSvcs) svcs.add(s.id);
        sols.add(sl.solutionId);
      } else {
        lines.delete(sl.id);
        for (const s of childSvcs) svcs.delete(s.id);
        // Se nenhum line/svc remanescente da solução, remove a solução
        const siblings = linesBySolution.get(sl.solutionId) ?? [];
        const anyLeft = siblings.some(
          (s) => s.id !== sl.id && (lines.has(s.id) || (servicesByLine.get(s.id) ?? []).some((sv) => svcs.has(sv.id)))
        );
        if (!anyLeft) sols.delete(sl.solutionId);
      }
      emit({ sol: sols, line: lines, svc: svcs });
    },
    [selLines, selServices, selSolutions, servicesByLine, linesBySolution, emit]
  );

  const toggleService = useCallback(
    (svc: Service, on: boolean) => {
      const svcs = new Set(selServices);
      const lines = new Set(selLines);
      const sols = new Set(selSolutions);
      const parentLine = serviceLines.find((sl) => sl.id === svc.serviceLineId);
      if (on) {
        svcs.add(svc.id);
        if (parentLine) {
          lines.add(parentLine.id);
          sols.add(parentLine.solutionId);
        }
      } else {
        svcs.delete(svc.id);
        if (parentLine) {
          const lineSvcs = servicesByLine.get(parentLine.id) ?? [];
          const lineHasAny = lineSvcs.some((s) => s.id !== svc.id && svcs.has(s.id));
          if (!lineHasAny) lines.delete(parentLine.id);

          const solLines = linesBySolution.get(parentLine.solutionId) ?? [];
          const solHasAny = solLines.some(
            (sl) =>
              lines.has(sl.id) || (servicesByLine.get(sl.id) ?? []).some((s) => svcs.has(s.id))
          );
          if (!solHasAny) sols.delete(parentLine.solutionId);
        }
      }
      emit({ sol: sols, line: lines, svc: svcs });
    },
    [selServices, selLines, selSolutions, serviceLines, servicesByLine, linesBySolution, emit]
  );

  const selectAll = useCallback(() => {
    emit({
      sol: new Set(solutions.map((s) => s.id)),
      line: new Set(serviceLines.map((s) => s.id)),
      svc: new Set(services.map((s) => s.id)),
    });
  }, [solutions, serviceLines, services, emit]);

  const clearAll = useCallback(() => {
    emit({ sol: new Set(), line: new Set(), svc: new Set() });
  }, [emit]);

  const totalSelected = selSolutions.size + selLines.size + selServices.size;

  return (
    <div className="space-y-2 border rounded-md p-3" data-testid="permission-tree-picker">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar solução, linha ou serviço…"
            className="pl-8 h-8 text-sm"
            disabled={disabled}
            data-testid="input-permission-search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAll}
          disabled={disabled}
          data-testid="button-select-all-permissions"
        >
          Selecionar tudo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearAll}
          disabled={disabled || totalSelected === 0}
          data-testid="button-clear-all-permissions"
        >
          Limpar
        </Button>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      <div className="text-xs text-muted-foreground flex gap-3">
        <span>Soluções: <strong>{selSolutions.size}</strong></span>
        <span>Linhas: <strong>{selLines.size}</strong></span>
        <span>Serviços: <strong>{selServices.size}</strong></span>
      </div>

      <div
        className="max-h-80 overflow-y-auto pr-1 -mr-1 divide-y divide-border/50"
        role="tree"
      >
        {filteredTree.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Nenhum item encontrado
          </div>
        ) : (
          filteredTree.map(({ solution, lines }) => {
            const sCount = solutionCounts.get(solution.id) ?? { selected: 0, total: 0 };
            const allSelected = sCount.total > 0 && sCount.selected === sCount.total;
            const someSelected = sCount.selected > 0 && !allSelected;
            const isExpanded = expanded[solution.id] ?? Boolean(q);
            return (
              <div key={solution.id} className="py-1">
                <Row
                  level={0}
                  id={`sol-${solution.id}`}
                  testId={`checkbox-solution-${solution.id}`}
                  label={solution.name}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onToggle={(on) => toggleSolution(solution, on)}
                  count={sCount}
                  expanded={isExpanded}
                  onExpand={() =>
                    setExpanded((p) => ({ ...p, [solution.id]: !isExpanded }))
                  }
                />
                {isExpanded &&
                  lines.map(({ line, services: svcs }) => {
                    const lCount = lineCounts.get(line.id) ?? { selected: 0, total: 0 };
                    const lAll = lCount.total > 0 && lCount.selected === lCount.total;
                    const lSome = lCount.selected > 0 && !lAll;
                    const lExpanded = expandedLines[line.id] ?? Boolean(q);
                    return (
                      <div key={line.id}>
                        <Row
                          level={1}
                          id={`line-${line.id}`}
                          testId={`checkbox-service-line-${line.id}`}
                          label={line.name}
                          checked={lAll || selLines.has(line.id)}
                          indeterminate={lSome}
                          onToggle={(on) => toggleLine(line, on)}
                          count={lCount}
                          expanded={lExpanded}
                          onExpand={
                            svcs.length > 0
                              ? () =>
                                  setExpandedLines((p) => ({
                                    ...p,
                                    [line.id]: !lExpanded,
                                  }))
                              : undefined
                          }
                        />
                        {lExpanded &&
                          svcs.map((svc) => (
                            <Row
                              key={svc.id}
                              level={2}
                              id={`svc-${svc.id}`}
                              testId={`checkbox-service-${svc.id}`}
                              label={svc.name}
                              checked={selServices.has(svc.id)}
                              onToggle={(on) => toggleService(svc, on)}
                            />
                          ))}
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
