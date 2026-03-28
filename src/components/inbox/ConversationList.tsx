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
    <div className="w-72 border-r border-border flex flex-col shrink-0 bg-card">
      <div className="p-3 border-b border-border space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-xs text-muted-foreground">
              {search ? "Nenhum resultado" : "Nenhuma conversa"}
            </p>
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {filtered.map((c) => {
              const unread = (c.unread_count ?? 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-colors",
                    selectedId === c.id
                      ? "bg-accent"
                      : unread
                        ? "bg-primary/5 hover:bg-accent/40"
                        : "hover:bg-accent/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm truncate",
                        unread ? "font-bold text-foreground" : "font-medium text-foreground"
                      )}
                    >
                      {c.contact_name || c.contact_phone}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {c.last_message_at
                          ? format(parseISO(c.last_message_at), "HH:mm", { locale: ptBR })
                          : ""}
                      </p>
                      {unread && (
                        <Badge className="text-[10px] h-5 min-w-5 justify-center bg-primary text-primary-foreground">
                          {c.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-xs truncate mt-1",
                      unread ? "text-foreground font-medium" : "text-muted-foreground"
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
