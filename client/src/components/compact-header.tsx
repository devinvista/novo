import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Filter, 
  ChevronDown,
  User,
  Settings,
  LogOut
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
import logoImage from "@assets/ChatGPT Image 31 de jul. de 2025, 14_21_03_1753982548631.png";
import darkLogoImage from "@assets/e03da512-3870-4e22-a75b-b15313a7ad9b_1754514316144.png";

interface CompactHeaderProps {
  showFilters?: boolean;
  onFilterChange?: (filters: any) => void;
}

export default function CompactHeader({ showFilters = true, onFilterChange }: CompactHeaderProps) {
  const { selectedQuarter, setSelectedQuarter } = useQuarterlyFilter();
  const { isOpen, toggle } = useSidebarToggle();
  
  const [filters, setFilters] = useState({
    regionId: undefined as number | undefined,
    subRegionId: undefined as number | undefined,
    serviceLineId: undefined as number | undefined,
  });

  const { data: user }: { data: any } = useQuery({
    queryKey: ["/api/user"],
    staleTime: 0,
    gcTime: 0,
  });

  const { data: availableQuarters = [] } = useQuery({
    queryKey: ["/api/quarters"],
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["/api/regions"],
  });

  const { data: subRegions = [] } = useQuery({
    queryKey: ["/api/sub-regions"],
  });

  const { data: serviceLines = [] } = useQuery({
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
    <header className={`bg-gradient-to-r from-[#1a4b9f] to-[#0091d6] text-white shadow-md border-b-2 border-[#4db74f] fixed top-0 z-50 transition-all duration-300 ${
      isOpen ? 'left-64 right-0' : 'left-0 right-0'
    }`}>
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
              <div className="flex items-center space-x-2 bg-white/10 rounded-md px-3 py-1 backdrop-blur-sm">
                <Filter className="h-3 w-3" />
                
                {/* Filtro de Trimestre */}
                <Select value={selectedQuarter || "all"} onValueChange={setSelectedQuarter}>
                  <SelectTrigger className="w-28 h-7 bg-white/20 border-white/30 text-white text-xs placeholder:text-white/70">
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
                  <SelectTrigger className="w-32 h-7 bg-white/20 border-white/30 text-white text-xs placeholder:text-white/70">
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

                {/* Filtro de Sub-região */}
                <Select 
                  value={filters.subRegionId?.toString() || "all"} 
                  onValueChange={(value) => handleFilterChange('subRegionId', value)}
                  disabled={!filters.regionId}
                >
                  <SelectTrigger className="w-32 h-7 bg-white/20 border-white/30 text-white text-xs placeholder:text-white/70 disabled:opacity-50">
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

                {/* Filtro de Linha de Serviço */}
                <Select 
                  value={filters.serviceLineId?.toString() || "all"} 
                  onValueChange={(value) => handleFilterChange('serviceLineId', value)}
                >
                  <SelectTrigger className="w-36 h-7 bg-white/20 border-white/30 text-white text-xs placeholder:text-white/70">
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