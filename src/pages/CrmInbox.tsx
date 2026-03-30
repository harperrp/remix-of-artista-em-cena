import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/providers/OrgProvider";
import * as api from "@/services/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { CrmPageHeader } from "@/components/crm/CrmPageHeader";
import { CrmStateCard } from "@/components/crm/CrmStateCard";

import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { LeadPanel } from "@/components/inbox/LeadPanel";

export function CrmInboxPage() {
  const { activeOrgId } = useOrg();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading: loadingConversations, isError: conversationsError } = useQuery({
    queryKey: ["crm-conversations", activeOrgId],
    queryFn: () => api.fetchConversations(activeOrgId!),
    enabled: !!activeOrgId,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["crm-messages", selected?.lead_id],
    queryFn: () => api.fetchMessages(selected!.lead_id!),
    enabled: !!selected?.lead_id,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages", activeOrgId],
    queryFn: () => api.fetchStages(activeOrgId!),
    enabled: !!activeOrgId,
    staleTime: 60_000,
  });

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
      api.markConversationRead(selected.lead_id)
        .then(() => {
          qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
        })
        .catch((e: Error) => toast.error(e.message));
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
    onError: (e: Error) => toast.error(e.message),
  });

  if (loadingConversations) {
    return <CrmStateCard message="Carregando conversas..." />;
  }

  if (conversationsError) {
    return <CrmStateCard tone="error" message="Erro ao carregar inbox." />;
  }

  if (conversations.length === 0) {
    return <CrmStateCard message="Nenhuma conversa disponível no momento." />;
  }

  return (
    <div className="space-y-4 fade-up">
      <CrmPageHeader title="Inbox" description="Atendimento em tempo real com histórico por lead." />

      <div className="flex h-[calc(100vh-260px)] min-h-[520px] overflow-hidden rounded-2xl border bg-card">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          stages={stages}
          onSelect={setSelectedId}
        />

        <ChatPanel
          conversation={selected}
          messages={loadingMessages ? [] : messages}
          onSend={(text) => sendMut.mutate(text)}
          sending={sendMut.isPending}
        />

        {selected && <LeadPanel conversation={selected} stages={stages} />}
      </div>
    </div>
  );
}
