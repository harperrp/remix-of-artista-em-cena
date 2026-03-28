import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, MapPin, Send } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useAuth } from "@/providers/AuthProvider";
import * as api from "@/services/api";
import { toast } from "sonner";
import type { Conversation, PipelineStage } from "@/types/crm";
import { cn } from "@/lib/utils";

interface Props {
  conversation: Conversation;
  stages: PipelineStage[];
}

export function LeadPanel({ conversation, stages }: Props) {
  const { activeOrgId } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const lead = conversation.lead as any;
  const leadId = lead?.id;

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", leadId],
    queryFn: () => api.fetchNotes(leadId),
    enabled: !!leadId,
  });

  const noteMut = useMutation({
    mutationFn: () =>
      api.createNote({
        organization_id: activeOrgId!,
        entity_id: leadId,
        entity_type: "lead",
        content: noteText,
        created_by: user!.id,
      }),
    onSuccess: () => {
      setNoteText("");
      qc.invalidateQueries({ queryKey: ["notes", leadId] });
      toast.success("Nota adicionada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleStageChange = async (stageName: string) => {
    if (!leadId) return;
    try {
      await api.updateLead(leadId, { stage: stageName });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      qc.invalidateQueries({ queryKey: ["crm-conversations"] });
      toast.success(`Movido para ${stageName}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="w-72 border-l border-border shrink-0 overflow-auto bg-card">
      <div className="p-4 space-y-4">
        {/* Contact info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {conversation.contact_name || "Sem nome"}
            </p>
            <p className="text-xs text-muted-foreground">{conversation.contact_phone}</p>
          </div>
        </div>

        {/* Lead card */}
        {lead && (
          <Card className="border bg-background p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">LEAD</p>
            <p className="text-sm font-medium text-foreground">{lead.contractor_name}</p>
            <Badge variant="outline" className="text-[10px]">{lead.stage}</Badge>
            {lead.contact_phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {lead.contact_phone}
              </p>
            )}
            {(lead.city || lead.state) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {[lead.city, lead.state].filter(Boolean).join(", ")}
              </p>
            )}
          </Card>
        )}

        {/* Stage buttons */}
        {lead && stages.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">MOVER ETAPA</p>
            <div className="flex flex-wrap gap-1">
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStageChange(s.name)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-full border transition-colors",
                    lead.stage === s.name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:bg-accent border-border"
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick notes */}
        {leadId && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-2">NOTAS</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (noteText.trim()) noteMut.mutate();
              }}
              className="space-y-2"
            >
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Adicionar nota..."
                className="min-h-[60px] text-xs resize-none"
              />
              <Button type="submit" size="sm" className="w-full text-xs" disabled={!noteText.trim() || noteMut.isPending}>
                <Send className="h-3 w-3 mr-1" /> Salvar nota
              </Button>
            </form>
            {notes.length > 0 && (
              <div className="mt-3 space-y-2 max-h-48 overflow-auto">
                {notes.slice(0, 5).map((n: any) => (
                  <div key={n.id} className="text-xs bg-muted rounded-lg p-2 text-foreground">
                    {n.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
