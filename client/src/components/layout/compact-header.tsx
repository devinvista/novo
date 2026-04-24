import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Filter, 
  ChevronDown,
  User,
  Users,
  Settings,
  LogOut,
  X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuarterlyFilter } from "@/hooks/use-quarterly-filter";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { useFilters } from "@/hooks/use-filters";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import logoImage from "@assets/ChatGPT Image 31 de jul. de 2025, 14_21_03_1753982548631.png";
import darkLogoImage from "@assets/e03da512-3870-4e22-a75b-b15313a7ad9b_1754514316144.png";

interface Region {
  id: number;
  name: string;
  code: string;
}

interface SubRegion {
  id: number;
  name: string;
  code: string;
  regionId: number;
}

interface ServiceLine {
  id: number;
  name: string;
  description?: string;
}

interface Quarter {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface CompactHeaderProps {
  showFilters?: boolean;
}

export default function CompactHeader({ showFilters = true }: CompactHeaderProps) {
  const { selectedQuarter, setSelectedQuarter } = useQuarterlyFilter();
  const { isOpen, toggle } = useSidebarToggle();
  const { filters, setFilters, clearFilters } = useFilters();
  const { user, logoutMutation } = useAuth();

  const { data: availableQuarters = [] } = useQuery<Quarter[]>({
    queryKey: ["/api/quarters"],
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: subRegions = [] } = useQuery<SubRegion[]>({
    queryKey: ["/api/sub-regions"],
  });

  const { data: serviceLines = [] } = useQuery<ServiceLine[]>({
    queryKey: ["/api/service-lines"],
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value && value !== 'all' ? parseInt(value) : undefined
    };
    
    if (key === 'regionId') {
      newFilters.subRegionId = undefined;
    }
    
    setFilters(newFilters);
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

  const filteredSubRegions = subRegions.filter((sr: SubRegion) => 
    !filters.regionId || sr.regionId === filters.regionId
  );

  const hasActiveFilters = filters.regionId || filters.subRegionId || filters.serviceLineId;

  return (
    <header className="bg-linear-to-r from-[#1a4b9f] to-[#0091d6] text-white shadow-md border-b border-[#4db74f]/40 shrink-0">
      <div className="px-4 py-1.5">
        <div className="flex items-center justify-between">
          {/* Logo e Toggle quando sidebar está oculta */}
          {!isOpen && (
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className="text-white hover:bg-white/10 p-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              <img 
                src={darkLogoImage} 
                alt="OKRs Logo" 
                className="h-8 w-auto"
              />
            </div>
          )}

          {/* Toggle quando sidebar está visível */}
          {isOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="text-white hover:bg-white/10 p-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}

          {/* Filtros e Usuário */}
          <div className="flex items-center space-x-3">
            {showFilters && (
              <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1 backdrop-blur-xs border border-white/15">
                {/* Ícone de filtro */}
                <div className="flex items-center gap-1 pr-2 border-r border-white/20 mr-1">
                  <Filter className="h-3 w-3 text-white/70" />
                  <span className="text-[10px] text-white/60 font-medium uppercase tracking-wide hidden lg:block">Filtros</span>
                </div>

                {/* Filtro de Trimestre */}
                <Select
                  value={selectedQuarter && selectedQuarter !== 'all' ? selectedQuarter : ''}
                  onValueChange={(v) => setSelectedQuarter(v || 'all')}
                >
                  <SelectTrigger className={`w-24 h-7 border-white/20 text-white text-xs transition-colors focus:ring-0 focus:ring-offset-0 focus:border-white/40 data-placeholder:text-white/60! ${selectedQuarter && selectedQuarter !== 'all' ? 'bg-white/25! border-white/35' : 'bg-white/15! hover:bg-white/25!'}`}>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableQuarters.map((quarter: any) => {
                      const quarterValue = typeof quarter === 'string' ? quarter : quarter.id;
                      const quarterDisplay = typeof quarter === 'string' && quarter.includes('-T')
                        ? (() => {
                            const [year, q] = quarter.split('-T');
                            const quarterNames = ['1º Tri', '2º Tri', '3º Tri', '4º Tri'];
                            return `${quarterNames[parseInt(q) - 1]} ${year}`;
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

                <div className="w-px h-5 bg-white/15" />

                {/* Filtro de Região */}
                <Select
                  value={filters.regionId?.toString() || ''}
                  onValueChange={(value) => handleFilterChange('regionId', value || 'all')}
                >
                  <SelectTrigger className={`w-24 h-7 border-white/20 text-white text-xs transition-colors focus:ring-0 focus:ring-offset-0 focus:border-white/40 data-placeholder:text-white/60! ${filters.regionId ? 'bg-white/25! border-white/35' : 'bg-white/15! hover:bg-white/25!'}`}>
                    <SelectValue placeholder="Região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {regions.map((region: any) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-px h-5 bg-white/15" />

                {/* Filtro de Sub-região */}
                <Select
                  value={filters.subRegionId?.toString() || ''}
                  onValueChange={(value) => handleFilterChange('subRegionId', value || 'all')}
                  disabled={!filters.regionId}
                >
                  <SelectTrigger className={`w-24 h-7 border-white/20 text-white text-xs transition-colors focus:ring-0 focus:ring-offset-0 focus:border-white/40 data-placeholder:text-white/60! disabled:opacity-40 disabled:cursor-not-allowed ${filters.subRegionId ? 'bg-white/25! border-white/35' : 'bg-white/15! hover:bg-white/25!'}`}>
                    <SelectValue placeholder="Sub-região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filteredSubRegions.map((subRegion: any) => (
                      <SelectItem key={subRegion.id} value={subRegion.id.toString()}>
                        {subRegion.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-px h-5 bg-white/15" />

                {/* Filtro de Linha de Serviço */}
                <Select
                  value={filters.serviceLineId?.toString() || ''}
                  onValueChange={(value) => handleFilterChange('serviceLineId', value || 'all')}
                >
                  <SelectTrigger className={`w-28 h-7 border-white/20 text-white text-xs transition-colors focus:ring-0 focus:ring-offset-0 focus:border-white/40 data-placeholder:text-white/60! ${filters.serviceLineId ? 'bg-white/25! border-white/35' : 'bg-white/15! hover:bg-white/25!'}`}>
                    <SelectValue placeholder="Linha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {serviceLines.map((line: any) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Botão limpar filtros */}
                {hasActiveFilters && (
                  <>
                    <div className="w-px h-6 bg-white/15 mx-0.5" />
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-[10px] text-white/60 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/10"
                      title="Limpar filtros"
                    >
                      <X className="h-3 w-3" />
                      <span className="hidden lg:block">Limpar</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Menu do Usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10 text-white h-8 px-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-white text-[#1a4b9f] text-xs font-semibold">
                      {getUserInitials(user?.name, user?.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-medium">{getUserDisplayName()}</div>
                    <div className="text-xs text-blue-100 capitalize">{user?.role || "usuário"}</div>
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                {(user?.role === "admin" || user?.role === "gestor") && (
                  <DropdownMenuItem asChild>
                    <Link href="/users" className="flex items-center w-full">
                      <Users className="mr-2 h-4 w-4" />
                      Meu Time
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-red-600"
                >
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