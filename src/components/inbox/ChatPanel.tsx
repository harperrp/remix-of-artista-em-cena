import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione uma conversa</p>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-border bg-card shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {conversation.contact_name || conversation.contact_phone}
          </p>
          <p className="text-[10px] text-muted-foreground">{conversation.contact_phone}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1 min-h-full flex flex-col justify-end">
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full">
                  {group.label}
                </span>
              </div>
              {group.msgs.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex mb-1.5", msg.direction === "inbound" ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                      msg.direction === "inbound"
                        ? "bg-card border border-border rounded-tl-sm"
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                    <p className={cn(
                      "text-[10px] mt-1 text-right",
                      msg.direction === "inbound" ? "text-muted-foreground" : "text-primary-foreground/60"
                    )}>
                      {format(parseISO(msg.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3 bg-card shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) {
              onSend(text.trim());
              setText("");
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!text.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
