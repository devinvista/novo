import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FiltersProps {
  filters: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
    period?: string;
  };
  onFiltersChange: (filters: any) => void;
}

export default function Filters({ filters, onFiltersChange }: FiltersProps) {
  const { data: regions } = useQuery({
    queryKey: ["/api/regions"],
    queryFn: async () => {
      const response = await fetch("/api/regions");
      if (!response.ok) throw new Error("Erro ao carregar regiões");
      return response.json();
    },
  });

  const { data: subRegions } = useQuery({
    queryKey: ["/api/sub-regions", filters.regionId],
    queryFn: async () => {
      const params = filters.regionId ? `?regionId=${filters.regionId}` : "";
      const response = await fetch(`/api/sub-regions${params}`);
      if (!response.ok) throw new Error("Erro ao carregar sub-regiões");
      return response.json();
    },
  });

  const { data: serviceLines } = useQuery({
    queryKey: ["/api/service-lines"],
    queryFn: async () => {
      const response = await fetch("/api/service-lines");
      if (!response.ok) throw new Error("Erro ao carregar linhas de serviço");
      return response.json();
    },
  });

  // Generate period options based on current date
  const generatePeriods = () => {
    const periods = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Add quarters for current and previous year
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        periods.push({
          value: `${year}-Q${quarter}`,
          label: `${quarter}º Trimestre ${year}`
        });
      }
    }
    
    return periods.reverse(); // Most recent first
  };

  const periods = generatePeriods();

  const handleFilterChange = (key: string, value: string | undefined) => {
    const newFilters = { ...filters };
    
    if (value === undefined || value === "all") {
      delete newFilters[key as keyof typeof newFilters];
    } else {
      (newFilters as any)[key] = key.includes("Id") ? parseInt(value) : value;
    }

    // Clear sub-region when region changes
    if (key === "regionId") {
      delete newFilters.subRegionId;
    }

    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-48">
          <Label className="block text-sm font-medium text-foreground mb-1">Região</Label>
          <Select 
            value={filters.regionId?.toString() || ""} 
            onValueChange={(value) => handleFilterChange("regionId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas as regiões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regiões</SelectItem>
              {regions?.map((region: any) => (
                <SelectItem key={region.id} value={region.id.toString()}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-48">
          <Label className="block text-sm font-medium text-foreground mb-1">Sub-Região</Label>
          <Select 
            value={filters.subRegionId?.toString() || ""} 
            onValueChange={(value) => handleFilterChange("subRegionId", value)}
            disabled={!filters.regionId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas as sub-regiões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as sub-regiões</SelectItem>
              {subRegions?.map((subRegion: any) => (
                <SelectItem key={subRegion.id} value={subRegion.id.toString()}>
                  {subRegion.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-48">
          <Label className="block text-sm font-medium text-foreground mb-1">Linha de Serviço</Label>
          <Select 
            value={filters.serviceLineId?.toString() || ""} 
            onValueChange={(value) => handleFilterChange("serviceLineId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas as linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as linhas</SelectItem>
              {serviceLines?.map((serviceLine: any) => (
                <SelectItem key={serviceLine.id} value={serviceLine.id.toString()}>
                  {serviceLine.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-48">
          <Label className="block text-sm font-medium text-foreground mb-1">Período</Label>
          <Select 
            value={filters.period || ""} 
            onValueChange={(value) => handleFilterChange("period", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos os períodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={clearFilters}
            disabled={Object.keys(filters).length === 0}
          >
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
