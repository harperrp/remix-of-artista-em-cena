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
          <div className="p-1">
            {filtered.map((c) => {
              const unread = (c.unread_count ?? 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2.5 transition-colors",
                    selectedId === c.id
                      ? "bg-accent"
                      : "hover:bg-accent/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "text-sm truncate",
                      unread ? "font-semibold text-foreground" : "font-medium text-foreground"
                    )}>
                      {c.contact_name || c.contact_phone}
                    </p>
                    {unread && (
                      <Badge className="text-[10px] h-5 min-w-5 justify-center shrink-0 bg-primary text-primary-foreground">
                        {c.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs truncate mt-0.5",
                    unread ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {c.last_message_text || "Sem mensagens"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {c.last_message_at
                      ? format(parseISO(c.last_message_at), "dd/MM HH:mm", { locale: ptBR })
                      : ""}
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
