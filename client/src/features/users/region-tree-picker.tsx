import { memo, useMemo, useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Region {
  id: number;
  name: string;
}

export interface SubRegion {
  id: number;
  name: string;
  regionId: number;
}

export interface RegionTreeValue {
  regionIds: number[];
  subRegionIds: number[];
}

interface Props {
  regions: Region[];
  subRegions: SubRegion[];
  value: RegionTreeValue;
  onChange: (next: RegionTreeValue) => void;
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
  level: 0 | 1;
  count?: { selected: number; total: number };
  expanded?: boolean;
  onExpand?: () => void;
  testId: string;
}) {
  const padLeft = level === 0 ? "pl-0" : "pl-6";
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
          level === 0 ? "font-semibold" : "font-normal"
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

export function RegionTreePicker({
  regions,
  subRegions,
  value,
  onChange,
  disabled,
  helperText,
}: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const selRegions = useMemo(() => toSet(value.regionIds), [value.regionIds]);
  const selSubs = useMemo(() => toSet(value.subRegionIds), [value.subRegionIds]);

  const subsByRegion = useMemo(() => {
    const m = new Map<number, SubRegion[]>();
    for (const sr of subRegions) {
      if (!m.has(sr.regionId)) m.set(sr.regionId, []);
      m.get(sr.regionId)!.push(sr);
    }
    return m;
  }, [subRegions]);

  const q = query.trim().toLowerCase();
  const filteredTree = useMemo(() => {
    return regions
      .map((r) => {
        const subs = subsByRegion.get(r.id) ?? [];
        const matchedSubs = subs.filter(
          (s) => !q || s.name.toLowerCase().includes(q)
        );
        const regionMatches = !q || r.name.toLowerCase().includes(q);
        if (!q || regionMatches || matchedSubs.length > 0) {
          return {
            region: r,
            subs: regionMatches && !q ? subs : matchedSubs,
          };
        }
        return null;
      })
      .filter(Boolean) as { region: Region; subs: SubRegion[] }[];
  }, [regions, subsByRegion, q]);

  const regionCounts = useMemo(() => {
    const m = new Map<number, { selected: number; total: number }>();
    for (const r of regions) {
      const subs = subsByRegion.get(r.id) ?? [];
      let selected = 0;
      for (const s of subs) if (selSubs.has(s.id)) selected += 1;
      m.set(r.id, { selected, total: subs.length });
    }
    return m;
  }, [regions, subsByRegion, selSubs]);

  const emit = useCallback(
    (next: { reg?: Set<number>; sub?: Set<number> }) => {
      onChange({
        regionIds: Array.from(next.reg ?? selRegions),
        subRegionIds: Array.from(next.sub ?? selSubs),
      });
    },
    [onChange, selRegions, selSubs]
  );

  const toggleRegion = useCallback(
    (region: Region, on: boolean) => {
      const regs = new Set(selRegions);
      const subs = new Set(selSubs);
      const childSubs = subsByRegion.get(region.id) ?? [];
      if (on) {
        regs.add(region.id);
        for (const s of childSubs) subs.add(s.id);
      } else {
        regs.delete(region.id);
        for (const s of childSubs) subs.delete(s.id);
      }
      emit({ reg: regs, sub: subs });
    },
    [selRegions, selSubs, subsByRegion, emit]
  );

  const toggleSub = useCallback(
    (sub: SubRegion, on: boolean) => {
      const regs = new Set(selRegions);
      const subs = new Set(selSubs);
      if (on) {
        subs.add(sub.id);
        regs.add(sub.regionId);
      } else {
        subs.delete(sub.id);
        const siblings = subsByRegion.get(sub.regionId) ?? [];
        const anyLeft = siblings.some(
          (s) => s.id !== sub.id && subs.has(s.id)
        );
        if (!anyLeft) regs.delete(sub.regionId);
      }
      emit({ reg: regs, sub: subs });
    },
    [selRegions, selSubs, subsByRegion, emit]
  );

  const selectAll = useCallback(() => {
    emit({
      reg: new Set(regions.map((r) => r.id)),
      sub: new Set(subRegions.map((s) => s.id)),
    });
  }, [regions, subRegions, emit]);

  const clearAll = useCallback(() => {
    emit({ reg: new Set(), sub: new Set() });
  }, [emit]);

  const totalSelected = selRegions.size + selSubs.size;

  return (
    <div className="space-y-2 border rounded-md p-3" data-testid="region-tree-picker">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar região ou sub-região…"
            className="pl-8 h-8 text-sm"
            disabled={disabled}
            data-testid="input-region-search"
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
          data-testid="button-select-all-regions"
        >
          Selecionar tudo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearAll}
          disabled={disabled || totalSelected === 0}
          data-testid="button-clear-all-regions"
        >
          Limpar
        </Button>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      <div className="text-xs text-muted-foreground flex gap-3">
        <span>Regiões: <strong>{selRegions.size}</strong></span>
        <span>Sub-regiões: <strong>{selSubs.size}</strong></span>
      </div>

      <div
        className="max-h-72 overflow-y-auto pr-1 -mr-1 divide-y divide-border/50"
        role="tree"
      >
        {filteredTree.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Nenhum item encontrado
          </div>
        ) : (
          filteredTree.map(({ region, subs }) => {
            const rCount = regionCounts.get(region.id) ?? { selected: 0, total: 0 };
            const allSelected = rCount.total > 0 && rCount.selected === rCount.total;
            const someSelected = rCount.selected > 0 && !allSelected;
            const isExpanded = expanded[region.id] ?? Boolean(q);
            return (
              <div key={region.id} className="py-1">
                <Row
                  level={0}
                  id={`region-${region.id}`}
                  testId={`checkbox-region-${region.id}`}
                  label={region.name}
                  checked={allSelected || (rCount.total === 0 && selRegions.has(region.id))}
                  indeterminate={someSelected}
                  onToggle={(on) => toggleRegion(region, on)}
                  count={rCount.total > 0 ? rCount : undefined}
                  expanded={isExpanded}
                  onExpand={
                    subs.length > 0
                      ? () =>
                          setExpanded((p) => ({ ...p, [region.id]: !isExpanded }))
                      : undefined
                  }
                />
                {isExpanded &&
                  subs.map((sub) => (
                    <Row
                      key={sub.id}
                      level={1}
                      id={`sub-${sub.id}`}
                      testId={`checkbox-subregion-${sub.id}`}
                      label={sub.name}
                      checked={selSubs.has(sub.id)}
                      onToggle={(on) => toggleSub(sub, on)}
                    />
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
