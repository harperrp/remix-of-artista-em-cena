import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useOrg } from "@/providers/OrgProvider";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Handshake, FileText, LogOut, LayoutDashboard, Map, DollarSign } from "lucide-react";

function TopNavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const { profile } = useOrg();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">CRM Rodrigo Lopes</div>
            <div className="truncate text-xs text-muted-foreground">
              {profile?.display_name ?? profile?.email ?? user?.email ?? ""}
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            <TopNavItem to="/app/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <TopNavItem to="/app/calendar" icon={CalendarDays} label="Agenda" />
            <TopNavItem to="/app/leads" icon={Handshake} label="Leads" />
            <TopNavItem to="/app/contracts" icon={FileText} label="Contratos" />
            <TopNavItem to="/app/map" icon={Map} label="Mapa" />
            <TopNavItem to="/app/financial" icon={DollarSign} label="Financeiro" />
          </nav>

          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
