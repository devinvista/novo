import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import {
  Network,
  Goal,
  Key,
  CheckSquare,
  Flag,
  Activity,
  Users,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import logoImage from "@assets/ChatGPT Image 31 de jul. de 2025, 14_21_03_1753982548631.png";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { isOpen } = useSidebarToggle();

  /** Pendências de check-in semanal — usadas para destacar KRs sem reporte. */
  const pendingCheckInsQuery = useQuery<{ count: number; items: Array<{ id: number; title?: string }> }>({
    queryKey: ["/api/kr-check-ins/pending"],
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
  });

  const pendingCount = pendingCheckInsQuery.data?.count ?? 0;

  const navigationItems = [
    { href: "/", icon: Network, label: "Alinhamento" },
    { href: "/objectives", icon: Goal, label: "Objetivos" },
    { href: "/key-results", icon: Key, label: "Resultados-Chave", badge: pendingCount },
    { href: "/actions", icon: CheckSquare, label: "Ações" },
    { href: "/checkpoints", icon: Flag, label: "Checkpoints" },
    { href: "/reports", icon: Activity, label: "Relatórios" },
  ];

  const adminGestorItems = [
    { href: "/users", icon: Users, label: "Usuários" },
  ];

  const superAdminItems = [
    { href: "/settings", icon: Settings, label: "Configurações" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "gestor": return "Gestor";
      case "operacional": return "Operacional";
      default: return role;
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-sidebar-border flex justify-center">
        <img 
          src={logoImage} 
          alt="OKRs Logo" 
          className="w-32 h-auto"
        />
      </div>



      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const badge = "badge" in item ? (item as { badge?: number }).badge ?? 0 : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive(item.href)
                  ? "text-sidebar-primary bg-sidebar-primary/10"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="mr-3 h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 ? (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold"
                  data-testid={`badge-pending-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  title={`${badge} check-in${badge > 1 ? "s" : ""} pendente${badge > 1 ? "s" : ""} esta semana`}
                >
                  {badge > 99 ? "99+" : badge}
                </Badge>
              ) : null}
            </Link>
          );
        })}

        {(user?.role === "admin" || user?.role === "gestor") && (
          <div className="pt-4 border-t border-sidebar-border mt-4">
            {adminGestorItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-sidebar-primary bg-sidebar-primary/10"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {user?.role === "admin" && superAdminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-sidebar-primary bg-sidebar-primary/10"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm">
              {user ? getUserInitials(user.name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || "Usuário"}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {user ? getRoleLabel(user.role) : "Carregando..."}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
