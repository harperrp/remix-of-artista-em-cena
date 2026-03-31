import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, KanbanSquare, MapPin, MessageSquare, Radio, Target } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/providers/OrgProvider";
import * as api from "@/services/api";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { LeadPanel } from "@/components/inbox/LeadPanel";

const AGENDA_PREFILL_KEY = "crm:agenda-prefill";

function formatRelativeLabel(value?: string | null) {
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

export function CrmInboxPage() {
  const { activeOrgId } = useOrg();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["crm-conversations", activeOrgId],
    queryFn: () => api.fetchConversations(activeOrgId!),
    enabled: !!activeOrgId,
  });

  useEffect(() => {
    if (!conversations.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !conversations.some((conversation) => conversation.id === selectedId)) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  const { data: messages = [] } = useQuery({
    queryKey: ["crm-messages", selected?.lead_id],
    queryFn: () => api.fetchMessages(selected!.lead_id!),
    enabled: !!selected?.lead_id,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages", activeOrgId],
    queryFn: () => api.fetchStages(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const inboxSummary = useMemo(() => {
    const unreadConversations = conversations.filter((conversation) => (conversation.unread_count ?? 0) > 0).length;
    const totalUnreadMessages = conversations.reduce((total, conversation) => total + (conversation.unread_count ?? 0), 0);
    const activeStageLabel = selected?.stage ?? selected?.lead?.stage ?? "Sem etapa";
    const stageLoad = stages
      .map((stage) => ({
        name: stage.name,
        total: conversations.filter((conversation) => (conversation.stage ?? conversation.lead?.stage) === stage.name).length,
      }))
      .filter((stage) => stage.total > 0)
      .slice(0, 3);

    return {
      unreadConversations,
      totalUnreadMessages,
      activeStageLabel,
      stageLoad,
    };
  }, [conversations, selected, stages]);

  const selectedLeadSnapshot = useMemo(() => {
    if (!selected) return null;

    return {
      name: selected.contact_name || selected.lead?.contractor_name || "Lead sem nome",
      phone: selected.contact_phone || selected.lead?.contact_phone || "Sem telefone",
      stage: selected.stage ?? selected.lead?.stage ?? "Sem etapa",
      location: [selected.lead?.city, selected.lead?.state].filter(Boolean).join(", "),
      lastTouch: formatRelativeLabel(selected.last_message_at),
      unread: selected.unread_count ?? 0,
    };
  }, [selected]);

  useEffect(() => {
    if (!activeOrgId) return;

    return api.subscribeToTable("lead_messages", null, () => {
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });

      if (selected?.lead_id) {
        qc.invalidateQueries({ queryKey: ["crm-messages", selected.lead_id] });
      }
    });
  }, [activeOrgId, selected?.lead_id, qc]);

  useEffect(() => {
    if (!activeOrgId) return;

    return api.subscribeToTable("leads", `organization_id=eq.${activeOrgId}`, () => {
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
    });
  }, [activeOrgId, qc]);

  useEffect(() => {
    if (!selectedId || !selected?.lead_id) return;

    if ((selected.unread_count ?? 0) > 0) {
      api.markConversationRead(selected.lead_id).then(() => {
        qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
      });
    }
  }, [selectedId, selected?.lead_id, selected?.unread_count, qc, activeOrgId]);

  const sendMut = useMutation({
    mutationFn: (text: string) => {
      if (!selected?.lead_id) throw new Error("Conversa sem lead vinculado");

      return api.sendMessage({
        lead_id: selected.lead_id,
        organization_id: activeOrgId!,
        message_text: text,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-messages", selected?.lead_id] });
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleAgendaShortcut = () => {
    if (!selected) return;

    const payload = {
      leadId: selected.lead_id,
      title: `Negociação — ${selected.contact_name || selected.lead?.contractor_name || "Lead"}`,
      contractorName: selected.contact_name || selected.lead?.contractor_name || "",
      contactPhone: selected.contact_phone || selected.lead?.contact_phone || "",
      city: selected.lead?.city || "",
      state: selected.lead?.state || "",
      fee: selected.lead?.fee ?? undefined,
      funnelStage: selected.stage ?? selected.lead?.stage ?? "Negociação",
      notes: selected.last_message_text || undefined,
      start: new Date().toISOString(),
    };

    localStorage.setItem(AGENDA_PREFILL_KEY, JSON.stringify(payload));
    window.location.href = "/app/agenda";
  };

  return (
    <div className="flex h-full min-h-0 bg-background">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        stages={stages}
        onSelect={setSelectedId}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-card/70 px-5 py-3 backdrop-blur-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Inbox comercial</p>
                <p className="text-xs text-muted-foreground">
                  Aqui começa o funil. Qualifique o contato, mova etapa, registre contexto e puxe agenda, mapa e pipeline sem sair da conversa.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Conversas não lidas
                  </div>
                  <p className="mt-1 text-lg font-semibold text-foreground">{inboxSummary.unreadConversations}</p>
                </div>

                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Radio className="h-3.5 w-3.5" />
                    Mensagens pendentes
                  </div>
                  <p className="mt-1 text-lg font-semibold text-foreground">{inboxSummary.totalUnreadMessages}</p>
                </div>

                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    Etapa atual
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">{selected ? inboxSummary.activeStageLabel : "Selecione um lead"}</p>
                </div>
              </div>
            </div>

            {selectedLeadSnapshot && (
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{selectedLeadSnapshot.name}</p>
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {selectedLeadSnapshot.stage}
                      </Badge>
                      {selectedLeadSnapshot.unread > 0 && (
                        <Badge variant="outline" className="text-[10px] font-medium text-primary">
                          {selectedLeadSnapshot.unread} não lidas
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{selectedLeadSnapshot.phone}</span>
                      <span>Último toque: {selectedLeadSnapshot.lastTouch}</span>
                      {selectedLeadSnapshot.location && <span>{selectedLeadSnapshot.location}</span>}
                    </div>
                    {!!inboxSummary.stageLoad.length && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {inboxSummary.stageLoad.map((stage) => (
                          <span key={stage.name} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {stage.name}: {stage.total}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[33rem]">
                    <Button size="sm" className="justify-start gap-2" onClick={handleAgendaShortcut}>
                      <CalendarDays className="h-4 w-4" />
                      Agenda
                    </Button>
                    <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => (window.location.href = "/app/pipeline")}>
                      <KanbanSquare className="h-4 w-4" />
                      Pipeline
                    </Button>
                    <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => (window.location.href = "/app/map")}>
                      <MapPin className="h-4 w-4" />
                      Mapa
                    </Button>
                    <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => (window.location.href = "/app/leads")}>
                      <Target className="h-4 w-4" />
                      Carteira
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ChatPanel
          conversation={selected}
          messages={messages}
          onSend={(text) => sendMut.mutate(text)}
          sending={sendMut.isPending}
        />
      </div>

      {selected && <LeadPanel conversation={selected} stages={stages} />}
    </div>
  );
}
