import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Settings, ChevronDown, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";

interface FiergsHeaderProps {
  user?: {
    id: number;
    username: string;
    name?: string;
    role?: string;
  } | null;
  onFilterChange?: (filters: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
  }) => void;
  showFilters?: boolean;
}

export function FiergsHeader({ user, onFilterChange, showFilters = true }: FiergsHeaderProps) {
  const { selectedQuarter, setSelectedQuarter } = useQuarterlyFilter();
  
  const { data: availableQuarters = [] } = useQuery({
    queryKey: ["/api/quarters"],
    queryFn: () => fetch("/api/quarters", { credentials: "include" }).then(r => r.json()).catch(() => [])
  });
  const [filters, setFilters] = useState({
    regionId: undefined as number | undefined,
    subRegionId: undefined as number | undefined,
    serviceLineId: undefined as number | undefined,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["/api/regions"],
    queryFn: () => fetch("/api/regions", { credentials: "include" }).then(r => r.json()).catch(() => [])
  });

  const { data: subRegions = [] } = useQuery({
    queryKey: ["/api/sub-regions"],
    queryFn: () => fetch("/api/sub-regions", { credentials: "include" }).then(r => r.json()).catch(() => [])
  });

  const { data: serviceLines = [] } = useQuery({
    queryKey: ["/api/service-lines"],
    queryFn: () => fetch("/api/service-lines", { credentials: "include" }).then(r => r.json()).catch(() => [])
  });

  const handleFilterChange = (key: string, value: string | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value && value !== 'all' ? parseInt(value) : undefined
    };
    
    // Limpar sub-região se região mudou
    if (key === 'regionId') {
      newFilters.subRegionId = undefined;
    }
    
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { 
        method: "POST", 
        credentials: "include" 
      });
      window.location.href = "/login";
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const getUserInitials = (name?: string, username?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username?.slice(0, 2).toUpperCase() || "U";
  };

  const getUserDisplayName = () => {
    return user?.name || user?.username || "Usuário";
  };

  const filteredSubRegions = subRegions.filter((sr: any) => 
    !filters.regionId || sr.regionId === filters.regionId
  );

  return (
    <header className="bg-gradient-to-r from-[#1a4b9f] to-[#0091d6] text-white shadow-lg border-b-4 border-[#4db74f]">
      <div className="px-6 py-3">
        <div className="flex items-center justify-end">
          {/* Filtros e Usuário */}
          <div className="flex items-center space-x-4">
            {showFilters && (
              <div className="flex items-center space-x-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                <Filter className="h-4 w-4" />
                
                {/* Filtro de Trimestre */}
                <Select value={selectedQuarter || "all"} onValueChange={setSelectedQuarter}>
                  <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white placeholder:text-white/70">
                    <SelectValue placeholder="Trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableQuarters.map((quarter: any) => (
                      <SelectItem key={quarter.id || quarter} value={quarter.id || quarter}>
                        {quarter.name || quarter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro de Região */}
                <Select 
                  value={filters.regionId?.toString() || "all"} 
                  onValueChange={(value) => handleFilterChange('regionId', value)}
                >
                  <SelectTrigger className="w-40 bg-white/20 border-white/30 text-white placeholder:text-white/70">
                    <SelectValue placeholder="Região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Regiões</SelectItem>
                    {regions.map((region: any) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro de Sub-região */}
                <Select 
                  value={filters.subRegionId?.toString() || "all"} 
                  onValueChange={(value) => handleFilterChange('subRegionId', value)}
                  disabled={!filters.regionId}
                >
                  <SelectTrigger className="w-40 bg-white/20 border-white/30 text-white placeholder:text-white/70 disabled:opacity-50">
                    <SelectValue placeholder="Sub-região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Sub-regiões</SelectItem>
                    {filteredSubRegions.map((subRegion: any) => (
                      <SelectItem key={subRegion.id} value={subRegion.id.toString()}>
                        {subRegion.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro de Linha de Serviço */}
                <Select 
                  value={filters.serviceLineId?.toString() || "all"} 
                  onValueChange={(value) => handleFilterChange('serviceLineId', value)}
                >
                  <SelectTrigger className="w-44 bg-white/20 border-white/30 text-white placeholder:text-white/70">
                    <SelectValue placeholder="Linha de Serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Linhas</SelectItem>
                    {serviceLines.map((line: any) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Menu do Usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10 text-white">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-white text-[#1a4b9f] text-sm font-semibold">
                      {getUserInitials(user?.name, user?.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <div className="text-sm font-medium">{getUserDisplayName()}</div>
                    <div className="text-xs text-blue-100 capitalize">{user?.role || "usuário"}</div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}