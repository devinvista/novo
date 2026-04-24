import { Link, useLocation } from "wouter";
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
  LayoutDashboard,
  Trash2,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import logoImage from "@assets/ChatGPT Image 31 de jul. de 2025, 14_21_03_1753982548631.png";

type NavItem = { href: string; icon: LucideIcon; label: string };

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { isOpen } = useSidebarToggle();

  const navigationItems: NavItem[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Meu Painel" },
    { href: "/", icon: Network, label: "Alinhamento" },
    { href: "/objectives", icon: Goal, label: "Objetivos" },
    { href: "/key-results", icon: Key, label: "Resultados-Chave" },
    { href: "/actions", icon: CheckSquare, label: "Ações" },
    { href: "/checkpoints", icon: Flag, label: "Checkpoints" },
    { href: "/reports", icon: Activity, label: "Relatórios" },
  ];

  const adminGestorItems: NavItem[] = [
    { href: "/users", icon: Users, label: "Usuários" },
    { href: "/trash", icon: Trash2, label: "Lixeira" },
  ];

  const superAdminItems: NavItem[] = [
    { href: "/audit", icon: Shield, label: "Auditoria" },
    { href: "/settings", icon: Settings, label: "Configurações" },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const getUserInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "gestor":
        return "Gestor";
      case "operacional":
        return "Operacional";
      default:
        return role;
    }
  };

  const NavLinkItem = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          active
            ? "text-sidebar-primary bg-sidebar-primary/10"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        }`}
      >
        <Icon className="mr-3 h-4 w-4" aria-hidden="true" />
        {item.label}
      </Link>
    );
  };

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col">
      {/* Logo/Header */}
      <div className="h-16 border-b border-sidebar-border flex items-center px-5">
        <img
          src={logoImage}
          alt="OKRs"
          className="h-9 w-auto object-contain"
        />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2" aria-label="Navegação principal">
        {navigationItems.map((item) => (
          <NavLinkItem key={item.href} item={item} />
        ))}

        {(user?.role === "admin" || user?.role === "gestor") && (
          <div className="pt-4 border-t border-sidebar-border mt-4 space-y-2">
            {adminGestorItems.map((item) => (
              <NavLinkItem key={item.href} item={item} />
            ))}
            {user?.role === "admin" &&
              superAdminItems.map((item) => <NavLinkItem key={item.href} item={item} />)}
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm">
              {user ? getUserInitials(user.name) : <User className="h-4 w-4" aria-hidden="true" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || "Usuário"}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {user ? getRoleLabel(user.role) : "Carregando…"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            aria-label="Sair"
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
