import { ReactNode } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuarterlyFilter from "@/components/quarterly-filter";

interface HeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  showQuarterlyFilter?: boolean;
}

export default function Header({ title, description, action, showQuarterlyFilter = true }: HeaderProps) {
  return (
    <header className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {showQuarterlyFilter && <QuarterlyFilter variant="compact" />}
          {action}
          <div className="relative">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
