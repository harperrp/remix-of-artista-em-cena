import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const lead = conversation.lead as any;
  const leadId = lead?.id;

  useEffect(() => {
    setEditName(lead?.contractor_name || conversation.contact_name || "");
    setEditPhone(lead?.contact_phone || conversation.contact_phone || "");
  }, [lead?.id, lead?.contractor_name, lead?.contact_phone, conversation.contact_name, conversation.contact_phone]);

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

  const updateLeadMut = useMutation({
    mutationFn: async () => {
      if (!leadId) throw new Error("Lead não encontrado");
      return api.updateLead(leadId, {
        contractor_name: editName.trim() || "Sem nome",
        contact_phone: editPhone.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Contato atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleStageChange = async (stageName: string) => {
    if (!leadId) return;
    try {
      await api.updateLead(leadId, { stage: stageName });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      qc.invalidateQueries({ queryKey: ["crm-conversations", activeOrgId] });
      toast.success(`Movido para ${stageName}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="w-80 border-l border-border shrink-0 overflow-auto bg-card">
      <div className="p-5 space-y-5">
        {/* Contact info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-4.5 w-4.5 text-primary" />
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
          <Card className="border bg-accent/30 p-4 space-y-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Lead</p>
            <p className="text-sm font-semibold text-foreground">{lead.contractor_name}</p>
            <Badge variant="secondary" className="text-[10px] font-medium">{lead.stage}</Badge>
            {lead.contact_phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {lead.contact_phone}
              </p>
            )}
            {(lead.city || lead.state) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {[lead.city, lead.state].filter(Boolean).join(", ")}
              </p>
            )}
            <form
              className="pt-2 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateLeadMut.mutate();
              }}
            >
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do cliente"
                className="h-8 text-xs"
              />
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Telefone do cliente"
                className="h-8 text-xs"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={updateLeadMut.isPending}
              >
                Salvar contato
              </Button>
            </form>
          </Card>
        )}

        {/* Stage buttons */}
        {lead && stages.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2.5">Mover Etapa</p>
            <div className="flex flex-wrap gap-1.5">
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStageChange(s.name)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-150 font-medium",
                    lead.stage === s.name
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground border-border"
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
            <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2.5">Notas</p>
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
                className="min-h-[56px] text-xs resize-none bg-secondary/50 border-transparent focus:border-border"
              />
              <Button type="submit" size="sm" variant="secondary" className="w-full text-xs gap-1.5" disabled={!noteText.trim() || noteMut.isPending}>
                <Send className="h-3 w-3" /> Salvar nota
              </Button>
            </form>
            {notes.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-48 overflow-auto">
                {notes.slice(0, 5).map((n: any) => (
                  <div key={n.id} className="text-xs bg-accent/50 rounded-lg p-2.5 text-foreground leading-relaxed">
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
