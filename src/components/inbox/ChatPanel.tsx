import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Conversation, Message } from "@/types/crm";
import { cn } from "@/lib/utils";

interface Props {
  conversation: Conversation | null;
  messages: Message[];
  onSend: (text: string) => void;
  sending: boolean;
}

function formatDateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd 'de' MMMM", { locale: ptBR });
}

function groupByDate(messages: Message[]) {
  const groups: { label: string; msgs: Message[] }[] = [];
  let lastLabel = "";
  for (const msg of messages) {
    const label = formatDateLabel(msg.created_at);
    if (label !== lastLabel) {
      groups.push({ label, msgs: [msg] });
      lastLabel = label;
    } else {
      groups[groups.length - 1].msgs.push(msg);
    }
  }
  return groups;
}

export function ChatPanel({ conversation, messages, onSend, sending }: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-accent/20">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">Selecione uma conversa</p>
          <p className="text-xs text-muted-foreground mt-1">Escolha um contato à esquerda para começar</p>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative">
      {/* Header */}
      <div className="h-14 flex items-center px-5 border-b border-border bg-card shrink-0 z-10 gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">
            {(conversation.contact_name || conversation.contact_phone || "?")[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {conversation.contact_name || conversation.contact_phone}
          </p>
          <p className="text-[10px] text-muted-foreground">{conversation.contact_phone}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-accent/10"
        style={{ scrollBehavior: "auto" }}
      >
        <div className="p-5 pb-2 min-h-full flex flex-col justify-end">
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="flex justify-center my-4">
                <span className="text-[10px] bg-secondary text-muted-foreground px-3 py-1 rounded-full font-medium">
                  {group.label}
                </span>
              </div>
              {group.msgs.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex mb-2.5",
                    msg.direction === "inbound" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[72%] rounded-2xl px-3.5 py-2 text-sm",
                      msg.direction === "inbound"
                        ? "bg-card border border-border rounded-bl-md text-foreground shadow-card"
                        : "bg-primary text-primary-foreground rounded-br-md shadow-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">
                      {msg.message_text}
                    </p>
                    {msg.media_url && (
                      <a href={msg.media_url} target="_blank" rel="noreferrer" className="text-[11px] underline opacity-90">
                        Ver mídia ({msg.message_type})
                      </a>
                    )}
                    <p
                      className={cn(
                        "text-[10px] mt-1 text-right",
                        msg.direction === "inbound"
                          ? "text-muted-foreground"
                          : "text-primary-foreground/60"
                      )}
                    >
                      {format(parseISO(msg.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 bg-card shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) {
              onSend(text.trim());
              setText("");
            }
          }}
          className="flex gap-2 items-center"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 h-10 bg-secondary/50 border-transparent focus:border-border"
            autoFocus
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={!text.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
