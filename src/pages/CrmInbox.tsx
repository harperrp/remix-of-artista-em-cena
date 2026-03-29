import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/providers/OrgProvider";
import * as api from "@/services/api";
import { toast } from "sonner";

import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { LeadPanel } from "@/components/inbox/LeadPanel";

export function CrmInboxPage() {
  const { activeOrgId } = useOrg();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["crm-conversations", activeOrgId],
    queryFn: () => api.fetchConversations(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

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

  useEffect(() => {
    if (!selected?.lead_id) return;
    return api.subscribeToTable("lead_messages", `lead_id=eq.${selected.lead_id}`, () => {
      qc.invalidateQueries({ queryKey: ["crm-messages", selected.lead_id] });
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
    });
  }, [selected?.lead_id, qc, activeOrgId]);

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
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        stages={stages}
        onSelect={setSelectedId}
      />
      <ChatPanel
        conversation={selected}
        messages={messages}
        onSend={(text) => sendMut.mutate(text)}
        sending={sendMut.isPending}
      />
      {selected && <LeadPanel conversation={selected} stages={stages} />}
    </div>
  );
}
