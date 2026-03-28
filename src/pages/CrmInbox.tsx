import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, User, Phone, MapPin, MessageSquare } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useAuth } from "@/providers/AuthProvider";
import * as api from "@/services/api";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Conversation, Message } from "@/types/crm";

export function CrmInboxPage() {
  const { activeOrgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Realtime for messages
  useEffect(() => {
    if (!selectedId) return;
    return api.subscribeToTable("lead_messages", `conversation_id=eq.${selectedId}`, () => {
      qc.invalidateQueries({ queryKey: ["crm-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["crm-conversations"] });
    });
  }, [selectedId, qc]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: () => {
      if (!selected?.lead_id) throw new Error("Conversa sem lead vinculado");
      return api.sendMessage({
        lead_id: selected.lead_id,
        organization_id: activeOrgId!,
        conversation_id: selectedId!,
        message_text: msgText,
        direction: "outbound",
      });
    },
    onSuccess: () => {
      setMsgText("");
      qc.invalidateQueries({ queryKey: ["crm-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["crm-conversations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages", activeOrgId],
    queryFn: () => api.fetchStages(activeOrgId!),
    enabled: !!activeOrgId,
  });

  return (
    <div className="flex h-full">
      {/* Col 1: Conversation list */}
      <div className="w-72 border-r border-border flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <h2 className="text-sm font-semibold">Conversas</h2>
        </div>
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-xs text-muted-foreground">Nenhuma conversa</p>
            </div>
          ) : (
            <div className="p-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                    selectedId === c.id ? "bg-accent" : "hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{c.contact_name || c.contact_phone}</p>
                    {(c.unread_count ?? 0) > 0 && (
                      <Badge variant="default" className="text-[10px] h-5 min-w-5 justify-center">
                        {c.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.last_message_text || "Sem mensagens"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(parseISO(c.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Col 2: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold">{selected.contact_name || selected.contact_phone}</p>
                <p className="text-[10px] text-muted-foreground">{selected.contact_phone}</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      msg.direction === "inbound"
                        ? "bg-muted border border-border"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                      <p className="text-[10px] opacity-60 mt-1 text-right">
                        {format(parseISO(msg.created_at), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); if (msgText.trim()) sendMut.mutate(); }}
                className="flex gap-2"
              >
                <Input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!msgText.trim() || sendMut.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Col 3: Lead panel */}
      {selected && (
        <div className="w-72 border-l border-border shrink-0 overflow-auto">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">{selected.contact_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{selected.contact_phone}</p>
              </div>
            </div>

            {selected.lead && (
              <Card className="border bg-card p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">LEAD</p>
                <p className="text-sm font-medium">{(selected.lead as any).contractor_name}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{(selected.lead as any).stage}</Badge>
                </div>
                {(selected.lead as any).contact_phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {(selected.lead as any).contact_phone}
                  </p>
                )}
              </Card>
            )}

            {/* Quick stage change */}
            {selected.lead && stages.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">MOVER ETAPA</p>
                <div className="flex flex-wrap gap-1">
                  {stages.map((s) => (
                    <button
                      key={s.id}
                      onClick={async () => {
                        try {
                          await api.updateLead((selected.lead as any).id, { stage: s.name });
                          qc.invalidateQueries({ queryKey: ["crm-leads"] });
                          qc.invalidateQueries({ queryKey: ["crm-conversations"] });
                          toast.success(`Movido para ${s.name}`);
                        } catch (e: any) { toast.error(e.message); }
                      }}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                        (selected.lead as any).stage === s.name
                          ? "bg-accent text-foreground border-border"
                          : "text-muted-foreground hover:bg-accent/50 border-transparent"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
