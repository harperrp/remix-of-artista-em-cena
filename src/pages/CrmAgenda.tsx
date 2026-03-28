import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Calendar, MapPin } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useAuth } from "@/providers/AuthProvider";
import * as api from "@/services/api";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CrmAgendaPage() {
  const { activeOrgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

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
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      title: fd.get("title"),
      start_time: fd.get("start_time"),
      city: fd.get("city") || null,
      notes: fd.get("notes") || null,
      lead_id: fd.get("lead_id") || null,
    };
    createMut.mutate(data);
  }

  // Group by date
  const grouped = events.reduce<Record<string, typeof events>>((acc, ev) => {
    const day = format(parseISO(ev.start_time), "yyyy-MM-dd");
    (acc[day] ??= []).push(ev);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort();

  return (
    <div className="p-6 space-y-4 fade-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">{events.length} eventos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Evento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Título *</Label>
                <Input name="title" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data e hora *</Label>
                  <Input name="start_time" type="datetime-local" required />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input name="city" />
                </div>
              </div>
              <div>
                <Label>Lead vinculado</Label>
                <select name="lead_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Nenhum</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.contractor_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>Criar Evento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : sortedDays.length === 0 ? (
        <Card className="border bg-card p-8 text-center">
          <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Nenhum evento cadastrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDays.map((day) => (
            <div key={day}>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                {format(parseISO(day), "EEEE, dd MMMM yyyy", { locale: ptBR })}
              </p>
              <div className="space-y-2">
                {grouped[day].map((ev) => (
                  <Card key={ev.id} className="border bg-card p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{format(parseISO(ev.start_time), "HH:mm")}</span>
                        {ev.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {ev.city}</span>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
