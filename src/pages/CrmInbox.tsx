import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/providers/OrgProvider";
import { useAuth } from "@/providers/AuthProvider";
import * as api from "@/services/api";
import { toast } from "sonner";

import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { LeadPanel } from "@/components/inbox/LeadPanel";

export function CrmInboxPage() {
  const { activeOrgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["crm-conversations", activeOrgId],
    queryFn: () => api.fetchConversations(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const { data: messages = [] } = useQuery({
    queryKey: ["crm-messages", selectedId],
    queryFn: () => api.fetchMessages(selectedId!),
    enabled: !!selectedId,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages", activeOrgId],
    queryFn: () => api.fetchStages(activeOrgId!),
    enabled: !!activeOrgId,
  });

  // Realtime messages
  useEffect(() => {
    if (!selectedId) return;
    return api.subscribeToTable("lead_messages", `conversation_id=eq.${selectedId}`, () => {
      qc.invalidateQueries({ queryKey: ["crm-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["crm-conversations"] });
    });
  }, [selectedId, qc]);

  // Mark as read when selecting
  useEffect(() => {
    if (!selectedId || !selected) return;
    if ((selected.unread_count ?? 0) > 0) {
      api.markConversationRead(selectedId).then(() => {
        qc.invalidateQueries({ queryKey: ["crm-conversations"] });
      });
    }
  }, [selectedId]);

  const sendMut = useMutation({
    mutationFn: (text: string) => {
      if (!selected?.lead_id) throw new Error("Conversa sem lead vinculado");
      return api.sendMessage({
        lead_id: selected.lead_id,
        organization_id: activeOrgId!,
        conversation_id: selectedId!,
        message_text: text,
        direction: "outbound",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["crm-conversations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
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
