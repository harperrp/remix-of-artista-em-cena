import { Card } from "@/components/ui/card";
import { useOrg } from "@/providers/OrgProvider";
import { useLeads, useContracts, useCalendarEvents } from "@/hooks/useCrmQueries";
import { formatMoneyBRL, monthStats } from "@/lib/calendar-utils";
import { CalendarDays, Handshake, DollarSign, MapPin, TrendingUp, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPreview } from "@/components/map/MapPreview";

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <Card className={`p-4 border bg-card/80 shadow-soft ${accent || ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { activeOrgId } = useOrg();
  const { data: leads = [] } = useLeads(activeOrgId);
  const { data: contracts = [] } = useContracts(activeOrgId);
  const { data: dbEvents = [] } = useCalendarEvents(activeOrgId);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthLabel = format(now, "MMMM yyyy", { locale: ptBR });

  // Map DB events to CalendarEvent format for stats
  const events = dbEvents.map((e: any) => ({
    id: e.id,
    title: e.title,
    status: e.status as "negotiation" | "confirmed" | "blocked" | "hold",
    start: e.start_time,
    end: e.end_time,
    fee: e.fee,
    city: e.city,
    state: e.state,
  }));

  const stats = monthStats(now, events);

  // Calculate additional stats
  const leadsInNegotiation = leads.filter((l: any) => l.stage === "Negociação").length;
  const pendingContracts = contracts.filter((c: any) => c.status === "pending").length;
  const totalEstimated = leads.reduce((acc: number, l: any) => acc + (l.fee || 0), 0);

  // Shows this month
  const monthEvents = dbEvents.filter((e: any) => {
    const d = parseISO(e.start_time);
    return d >= monthStart && d <= monthEnd;
  });

  // Map data for preview (leads + events with coordinates)
  const mapMarkers = [
    ...leads.filter((l: any) => l.latitude && l.longitude).map((l: any) => ({
      id: l.id,
      type: "lead" as const,
      lat: parseFloat(l.latitude),
      lng: parseFloat(l.longitude),
      title: l.contractor_name,
      city: l.city,
      state: l.state,
      status: l.stage,
    })),
    ...dbEvents.filter((e: any) => e.latitude && e.longitude).map((e: any) => ({
      id: e.id,
      type: "event" as const,
      lat: parseFloat(e.latitude),
      lng: parseFloat(e.longitude),
      title: e.title,
      city: e.city,
      state: e.state,
      status: e.status,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral de {monthLabel}</p>
      </div>

      {/* Main stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Shows fechados"
          value={stats.confirmedCount}
          accent="border-l-4 border-l-status-confirmed"
        />
        <StatCard
          icon={Clock}
          label="Em negociação"
          value={stats.negotiationCount}
          accent="border-l-4 border-l-status-negotiation"
        />
        <StatCard
          icon={TrendingUp}
          label="Dias livres"
          value={stats.freeDays}
          accent="border-l-4 border-l-muted"
        />
        <StatCard
          icon={DollarSign}
          label="Faturamento estimado"
          value={formatMoneyBRL(stats.estimatedRevenue)}
          accent="border-l-4 border-l-primary"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 border bg-card/70">
          <div className="flex items-center gap-3">
            <Handshake className="h-5 w-5 text-status-negotiation" />
            <div>
              <div className="font-semibold">{leadsInNegotiation}</div>
              <div className="text-xs text-muted-foreground">Leads em negociação</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border bg-card/70">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">{leads.length}</div>
              <div className="text-xs text-muted-foreground">Total de leads</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border bg-card/70">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-status-confirmed" />
            <div>
              <div className="font-semibold">{pendingContracts}</div>
              <div className="text-xs text-muted-foreground">Contratos pendentes</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Map preview */}
      <Card className="border bg-card/70 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Mapa de Oportunidades
          </h2>
          <p className="text-xs text-muted-foreground">Leads e shows no mapa</p>
        </div>
        <div className="h-[300px]">
          <MapPreview markers={mapMarkers} />
        </div>
      </Card>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border bg-card/70 p-4">
          <h3 className="font-semibold mb-3">Próximos shows</h3>
          {monthEvents.filter((e: any) => e.status === "confirmed").length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum show confirmado este mês</p>
          ) : (
            <div className="space-y-2">
              {monthEvents
                .filter((e: any) => e.status === "confirmed")
                .slice(0, 5)
                .map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.city ? `${e.city}/${e.state}` : "Local não definido"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(e.start_time), "dd/MM")}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="border bg-card/70 p-4">
          <h3 className="font-semibold mb-3">Leads recentes</h3>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lead cadastrado</p>
          ) : (
            <div className="space-y-2">
              {leads.slice(0, 5).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{l.contractor_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.city ? `${l.city}/${l.state}` : "—"}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-status-negotiation/10 text-status-negotiation">
                    {l.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
