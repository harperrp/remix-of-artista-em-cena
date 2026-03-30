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
import { Plus, Search, Phone, MapPin } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useAuth } from "@/providers/AuthProvider";
import * as api from "@/services/api";
import { toast } from "sonner";
import type { Lead, PipelineStage } from "@/types/crm";
import { CrmPageHeader } from "@/components/crm/CrmPageHeader";
import { CrmStateCard } from "@/components/crm/CrmStateCard";

type LeadFormValues = {
  contractor_name: string;
  contact_phone?: string;
  city?: string;
  origin?: string;
  stage: string;
  notes?: string;
};

export function CrmLeadsPage() {
  const { activeOrgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading, isError } = useQuery({
    queryKey: ["crm-leads", activeOrgId],
    queryFn: () => api.fetchLeads(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages", activeOrgId],
    queryFn: () => api.fetchStages(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const createMut = useMutation({
    mutationFn: (form: LeadFormValues) => api.createLead({ ...form, organization_id: activeOrgId!, created_by: user!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); toast.success("Lead criado"); setDialogOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...rest }: { id: string } & LeadFormValues) => api.updateLead(id, rest),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); toast.success("Lead atualizado"); setDialogOpen(false); setEditLead(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = leads.filter((l) =>
    l.contractor_name.toLowerCase().includes(search.toLowerCase()) ||
    (l.contact_phone?.includes(search)) ||
    (l.city?.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form: LeadFormValues = {
      contractor_name: String(fd.get("contractor_name") ?? ""),
      contact_phone: String(fd.get("contact_phone") ?? "") || undefined,
      city: String(fd.get("city") ?? "") || undefined,
      origin: String(fd.get("origin") ?? "") || undefined,
      stage: String(fd.get("stage") ?? stages[0]?.name ?? "Prospecção"),
      notes: String(fd.get("notes") ?? "") || undefined,
    };

    if (editLead) {
      updateMut.mutate({ id: editLead.id, ...form });
    } else {
      createMut.mutate(form);
    }
  }

  function openEdit(lead: Lead) {
    setEditLead(lead);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-5 fade-up">
      <CrmPageHeader title="Leads" description={`${leads.length} leads cadastrados`} actions={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditLead(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input name="contractor_name" defaultValue={editLead?.contractor_name ?? ""} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input name="contact_phone" defaultValue={editLead?.contact_phone ?? ""} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input name="city" defaultValue={editLead?.city ?? ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Origem</Label>
                    <Input name="origin" defaultValue={editLead?.origin ?? ""} placeholder="WhatsApp, Instagram..." />
                  </div>
                  <div>
                    <Label>Etapa</Label>
                    <select name="stage" defaultValue={editLead?.stage ?? stages[0]?.name ?? "Prospecção"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {stages.map((s: PipelineStage) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea name="notes" defaultValue={editLead?.notes ?? ""} rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={createMut.isPending || updateMut.isPending}>
                  {editLead ? "Salvar" : "Criar Lead"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
      } />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou cidade..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <CrmStateCard message="Carregando leads..." />
      ) : isError ? (
        <CrmStateCard tone="error" message="Erro ao carregar leads." />
      ) : filtered.length === 0 ? (
        <CrmStateCard message="Nenhum lead encontrado" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => (
            <Card key={lead.id} className="border bg-card p-4 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openEdit(lead)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{lead.contractor_name}</p>
                  {lead.contact_phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {lead.contact_phone}</p>}
                  {lead.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.city}</p>}
                </div>
                <span className="text-[10px] bg-accent px-2 py-0.5 rounded-full shrink-0">{lead.stage}</span>
              </div>
              {lead.origin && <p className="text-[10px] text-muted-foreground mt-2">Origem: {lead.origin}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
