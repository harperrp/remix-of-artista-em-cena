import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  X,
} from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useAuth } from "@/providers/AuthProvider";
import * as api from "@/services/api";
import { toast } from "sonner";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500",
  negotiation: "bg-amber-500",
  blocked: "bg-red-500",
  hold: "bg-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  negotiation: "Negociação",
  blocked: "Bloqueado",
  hold: "Reserva",
};

export function CrmAgendaPage() {
  const { activeOrgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["crm-events", activeOrgId],
    queryFn: () => api.fetchEvents(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["crm-leads", activeOrgId],
    queryFn: () => api.fetchLeads(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const createMut = useMutation({
    mutationFn: (form: any) =>
      api.createEvent({
        ...form,
        organization_id: activeOrgId!,
        created_by: user!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-events"] });
      toast.success("Evento criado");
      setCreateOpen(false);
      setCreateDate(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Index events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {};
    events.forEach((ev) => {
      const key = format(parseISO(ev.start_time), "yyyy-MM-dd");
      (map[key] ??= []).push(ev);
    });
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate[key] || [];
  }, [selectedDate, eventsByDate]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function handleDayClick(day: Date) {
    setSelectedDate(day);
  }

  function handleCreateOnDay(day: Date) {
    setCreateDate(day);
    setCreateOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      title: fd.get("title"),
      start_time: fd.get("start_time"),
      city: fd.get("city") || null,
      notes: fd.get("notes") || null,
      lead_id: fd.get("lead_id") || null,
      status: fd.get("status") || "negotiation",
    };
    createMut.mutate(data);
  }

  // Stats
  const monthEvents = useMemo(() => {
    const ms = startOfMonth(currentMonth);
    const me = endOfMonth(currentMonth);
    return events.filter((ev) => {
      const d = parseISO(ev.start_time);
      return d >= ms && d <= me;
    });
  }, [events, currentMonth]);

  const confirmed = monthEvents.filter((e) => e.status === "confirmed").length;
  const negotiation = monthEvents.filter((e) => e.status === "negotiation").length;

  return (
    <div className="p-4 md:p-6 space-y-4 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {monthEvents.length} eventos no mês •{" "}
            <span className="text-emerald-600 dark:text-emerald-400">{confirmed} confirmados</span> •{" "}
            <span className="text-amber-600 dark:text-amber-400">{negotiation} em negociação</span>
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateDate(new Date());
            setCreateOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs">
            Hoje
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid */}
        <Card className="flex-1 border bg-card overflow-hidden">
          {/* Week day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate[key] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[80px] md:min-h-[100px] border-b border-r p-1 cursor-pointer transition-colors relative group
                    ${!inMonth ? "bg-muted/20" : "hover:bg-accent/30"}
                    ${isSelected ? "bg-accent/50 ring-1 ring-primary" : ""}
                    ${today ? "bg-primary/5" : ""}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`
                        text-xs font-medium inline-flex items-center justify-center h-6 w-6 rounded-full
                        ${!inMonth ? "text-muted-foreground/40" : ""}
                        ${today ? "bg-primary text-primary-foreground" : ""}
                      `}
                    >
                      {format(day, "d")}
                    </span>
                    {/* Quick add button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateOnDay(day);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Event indicators */}
                  <div className="mt-0.5 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className={`
                          text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white
                          ${STATUS_COLORS[ev.status] || "bg-muted"}
                        `}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Side panel — selected day details */}
        <div className="w-full lg:w-80 shrink-0">
          {selectedDate ? (
            <Card className="border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm capitalize">
                  {format(selectedDate, "EEEE, dd MMM", { locale: ptBR })}
                </h3>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCreateOnDay(selectedDate)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedDate(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum evento neste dia</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={() => handleCreateOnDay(selectedDate)}
                  >
                    <Plus className="h-3 w-3" /> Criar evento
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {selectedDayEvents.map((ev) => (
                      <Card key={ev.id} className="border bg-background p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{ev.title}</p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] text-white shrink-0 ${STATUS_COLORS[ev.status] || ""}`}
                          >
                            {STATUS_LABELS[ev.status] || ev.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(ev.start_time), "HH:mm")}
                          </span>
                          {ev.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.city}
                              {ev.state && `, ${ev.state}`}
                            </span>
                          )}
                        </div>
                        {ev.contractor_name && (
                          <p className="text-xs text-muted-foreground">🎤 {ev.contractor_name}</p>
                        )}
                        {ev.fee != null && (
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {Number(ev.fee).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        )}
                        {ev.notes && <p className="text-xs text-muted-foreground italic">{ev.notes}</p>}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          ) : (
            <Card className="border bg-card p-6 text-center">
              <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Selecione um dia para ver os eventos</p>
            </Card>
          )}

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[key]}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input name="title" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data e hora *</Label>
                <Input
                  name="start_time"
                  type="datetime-local"
                  required
                  defaultValue={
                    createDate
                      ? format(createDate, "yyyy-MM-dd") + "T20:00"
                      : ""
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  name="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  defaultValue="negotiation"
                >
                  <option value="negotiation">Negociação</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="blocked">Bloqueado</option>
                  <option value="hold">Reserva</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cidade</Label>
                <Input name="city" />
              </div>
              <div>
                <Label>Lead vinculado</Label>
                <select
                  name="lead_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Nenhum</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.contractor_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea name="notes" rows={3} />
            </div>
            <Button type="submit" className="w-full" disabled={createMut.isPending}>
              Criar Evento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
