import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import type { Conversation } from "@/types/crm";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    const term = search.toLowerCase();
    return (
      !term ||
      (c.contact_name ?? "").toLowerCase().includes(term) ||
      c.contact_phone.includes(term)
    );
  });

  return (
    <div className="w-80 border-r border-border flex flex-col shrink-0 bg-card">
      <div className="px-4 py-3.5 border-b border-border space-y-2.5">
        <h2 className="text-sm font-semibold text-foreground">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="h-8 pl-8 text-xs bg-secondary/50 border-transparent focus:border-border"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {search ? "Nenhum resultado" : "Nenhuma conversa"}
            </p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {filtered.map((c) => {
              const unread = (c.unread_count ?? 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2.5 transition-all duration-150",
                    selectedId === c.id
                      ? "bg-primary/8 border border-primary/15"
                      : unread
                        ? "bg-accent/60 hover:bg-accent border border-transparent"
                        : "hover:bg-accent/40 border border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                        selectedId === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      )}>
                        {(c.contact_name || c.contact_phone || "?")[0].toUpperCase()}
                      </div>
                      <p
                        className={cn(
                          "text-sm truncate",
                          unread ? "font-semibold text-foreground" : "font-medium text-foreground"
                        )}
                      >
                        {c.contact_name || c.contact_phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {c.last_message_at
                          ? format(parseISO(c.last_message_at), "HH:mm", { locale: ptBR })
                          : ""}
                      </p>
                      {unread && (
                        <Badge className="text-[10px] h-4.5 min-w-[18px] justify-center rounded-full bg-primary text-primary-foreground px-1">
                          {c.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-xs truncate mt-0.5 ml-[42px]",
                      unread ? "text-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {c.last_message_text || "Sem mensagens"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
