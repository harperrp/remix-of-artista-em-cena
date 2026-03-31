import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  KanbanSquare,
  MapPin,
  Phone,
  Route,
  Send,
  Target,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOrg } from "@/providers/OrgProvider";
import { useAuth } from "@/providers/AuthProvider";
import * as api from "@/services/api";
import type { Conversation, Lead, PipelineStage } from "@/types/crm";
import { cn } from "@/lib/utils";

interface Props {
  conversation: Conversation;
  stages: PipelineStage[];
}

const AGENDA_PREFILL_KEY = "crm:agenda-prefill";

const NEXT_STEP_BY_STAGE: Record<string, string> = {
  Prospecção: "Qualifique rápido e leve o lead para Contato assim que houver uma resposta útil.",
  Contato: "Estruture contexto, confirme praça/interesse e avance para Proposta com próximo passo definido.",
  Proposta: "Agende follow-up, registre valores e aproveite cidade/UF para alimentar agenda e mapa.",
  Negociação: "Transforme a conversa em evento na agenda e use o pipeline como acompanhamento visual.",
  Contrato: "Sincronize agenda, contrato e responsável para evitar operação solta.",
  Fechado: "Use mapa, agenda e contatos como acompanhamento operacional do show já confirmado.",
};

function normaliseAgendaTitle(name: string) {
  if (!name.trim()) return "Nova negociação";
  return `Negociação — ${name.trim()}`;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Sem registro";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function LeadPanel({ conversation, stages }: Props) {
  const navigate = useNavigate();
  const { activeOrgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const lead = (conversation.lead ?? null) as Lead | null;
  const leadId = lead?.id ?? conversation.lead_id ?? null;
  const leadStage = lead?.stage ?? conversation.stage ?? "Sem etapa";
  const locationLabel = [lead?.city, lead?.state].filter(Boolean).join(", ");

  useEffect(() => {
    setEditName(lead?.contractor_name || conversation.contact_name || "");
    setEditPhone(lead?.contact_phone || conversation.contact_phone || "");
  }, [lead?.id, lead?.contractor_name, lead?.contact_phone, conversation.contact_name, conversation.contact_phone]);

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", leadId],
    queryFn: () => api.fetchNotes(leadId!),
    enabled: !!leadId,
  });

  const noteMut = useMutation({
    mutationFn: () =>
      api.createNote({
        organization_id: activeOrgId!,
        entity_id: leadId!,
        entity_type: "lead",
        content: noteText,
        created_by: user!.id,
      }),
    onSuccess: () => {
      setNoteText("");
      qc.invalidateQueries({ queryKey: ["notes", leadId] });
      toast.success("Nota adicionada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateLeadMut = useMutation({
    mutationFn: async () => {
      if (!leadId) throw new Error("Lead não encontrado");
      return api.updateLead(leadId, {
        contractor_name: editName.trim() || "Sem nome",
        contact_phone: editPhone.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      qc.invalidateQueries({ queryKey: ["leads", activeOrgId] });
      toast.success("Contato atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const nextRecommendedAction = useMemo(() => {
    return NEXT_STEP_BY_STAGE[leadStage] ?? "Use o Inbox como central: qualifique, mova etapa e ligue esse lead à agenda e ao mapa.";
  }, [leadStage]);

  const operationalChecklist = useMemo(
    () => [
      { id: "inbox", label: "Conversa centralizada no Inbox", done: true },
      { id: "stage", label: `Etapa atual: ${leadStage}`, done: leadStage !== "Sem etapa" },
      { id: "agenda", label: "Próximo passo deve virar evento na agenda", done: Boolean(lead?.event_date) },
      { id: "map", label: "Cidade/UF definidas para aparecer no mapa", done: Boolean(locationLabel) },
    ],
    [lead?.event_date, leadStage, locationLabel]
  );

  const handleStageChange = async (stageName: string) => {
    if (!leadId) return;
    try {
      await api.updateLead(leadId, { stage: stageName });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
      qc.invalidateQueries({ queryKey: ["leads", activeOrgId] });
      toast.success(`Movido para ${stageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível mover a etapa";
      toast.error(message);
    }
  };

  const handleGoToAgenda = () => {
    const payload = {
      leadId,
      title: normaliseAgendaTitle(editName || conversation.contact_name || ""),
      contractorName: editName || conversation.contact_name || "",
      contactPhone: editPhone || conversation.contact_phone || "",
      city: lead?.city ?? "",
      state: lead?.state ?? "",
      fee: lead?.fee ?? undefined,
      funnelStage: leadStage,
      notes: noteText.trim() || lead?.notes || conversation.last_message_text || undefined,
      start: new Date().toISOString(),
    };

    localStorage.setItem(AGENDA_PREFILL_KEY, JSON.stringify(payload));
    navigate("/app/agenda");
    toast.success("Lead enviado para a agenda", {
      description: "O evento já vai abrir com os dados principais preenchidos.",
    });
  };

  return (
    <div className="w-[24rem] shrink-0 overflow-auto border-l border-border bg-card">
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {conversation.contact_name || editName || "Sem nome"}
            </p>
            <p className="text-xs text-muted-foreground">{conversation.contact_phone}</p>
          </div>
        </div>

        <Card className="space-y-3 border bg-primary/5 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Próximo passo sugerido</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{nextRecommendedAction}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" className="justify-start gap-2" onClick={handleGoToAgenda}>
              <CalendarDays className="h-4 w-4" />
              Agendar show
            </Button>
            <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => navigate("/app/pipeline")}>
              <KanbanSquare className="h-4 w-4" />
              Pipeline
            </Button>
            <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => navigate("/app/leads")}>
              <Route className="h-4 w-4" />
              Carteira
            </Button>
            <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => navigate("/app/contacts")}>
              <Users className="h-4 w-4" />
              Contatos
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="w-full justify-start gap-2" onClick={() => navigate("/app/map")}>
            <MapPin className="h-4 w-4" />
            Ver mapa e oportunidades
          </Button>
        </Card>

        <Card className="space-y-3 border bg-background p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Resumo operacional</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Lead conectado ao funil</p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-medium">
              {leadStage}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Último toque</p>
              <p className="mt-1 font-medium text-foreground">{formatDateLabel(conversation.last_message_at)}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Origem</p>
              <p className="mt-1 font-medium text-foreground">{lead?.origin || "WhatsApp"}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Local</p>
              <p className="mt-1 font-medium text-foreground">{locationLabel || "Definir cidade/UF"}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cachê</p>
              <p className="mt-1 font-medium text-foreground">{lead?.fee ? `R$ ${lead.fee.toLocaleString("pt-BR")}` : "Não definido"}</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {operationalChecklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2">
                <div className="min-w-0 text-xs text-foreground">{item.label}</div>
                <Badge variant={item.done ? "default" : "outline"} className="shrink-0 text-[10px] font-medium">
                  {item.done ? "ok" : "pendente"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {lead && (
          <Card className="space-y-2.5 border bg-accent/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cadastro rápido</p>
                <p className="text-sm font-semibold text-foreground">{lead.contractor_name}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {leadStage}
              </Badge>
            </div>
            {lead.contact_phone && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {lead.contact_phone}
              </p>
            )}
            {(lead.city || lead.state) && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {[lead.city, lead.state].filter(Boolean).join(", ")}
              </p>
            )}
            <form
              className="space-y-2 pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                updateLeadMut.mutate();
              }}
            >
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Nome do cliente"
                className="h-8 text-xs"
              />
              <Input
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                placeholder="Telefone do cliente"
                className="h-8 text-xs"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={updateLeadMut.isPending}
              >
                Salvar contato
              </Button>
            </form>
          </Card>
        )}

        {lead && stages.length > 0 && (
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Mover etapa</p>
              <p className="text-[11px] text-muted-foreground">Inbox → Pipeline → Agenda</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.name)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-150",
                    leadStage === stage.name
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {leadId && (
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notas</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                Salvar contexto
                <ArrowRight className="h-3 w-3" />
                agenda/contrato
              </span>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!noteText.trim()) return;
                noteMut.mutate();
              }}
              className="space-y-2"
            >
              <Textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Adicione contexto útil: praça, faixa de valor, disponibilidade, objeções..."
                className="min-h-[96px] resize-none text-xs"
              />
              <Button type="submit" size="sm" variant="secondary" className="w-full gap-2 text-xs" disabled={!noteText.trim() || noteMut.isPending}>
                <Send className="h-3.5 w-3.5" />
                Salvar nota
              </Button>
            </form>

            {notes.length > 0 && (
              <div className="mt-3 space-y-2">
                {notes.slice(0, 4).map((note) => (
                  <Card key={note.id} className="border bg-background p-3">
                    <p className="text-xs leading-relaxed text-foreground">{note.content}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {new Date(note.created_at).toLocaleString("pt-BR")}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <Card className="border-dashed border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Como esse bloco ajuda</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                O Inbox passa a funcionar como central do lead. Você qualifica aqui, atualiza etapa aqui, salva contexto aqui e empurra para agenda, mapa e pipeline com menos troca de tela.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
