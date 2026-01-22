import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/providers/OrgProvider";
import { useLeads } from "@/hooks/useCrmQueries";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, MapPin, Calendar, DollarSign, Phone, Mail, Building2, Edit2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatMoneyBRL } from "@/lib/calendar-utils";
import { LeadDialog } from "@/components/leads/LeadDialog";
import type { FunnelStage } from "@/lib/calendar-types";

const STAGES: FunnelStage[] = ["Prospecção", "Contato", "Proposta", "Negociação", "Contrato", "Fechado"];

const stageColors: Record<FunnelStage, string> = {
  "Prospecção": "bg-slate-100 border-slate-300",
  "Contato": "bg-blue-50 border-blue-200",
  "Proposta": "bg-purple-50 border-purple-200",
  "Negociação": "bg-yellow-50 border-yellow-200",
  "Contrato": "bg-orange-50 border-orange-200",
  "Fechado": "bg-green-50 border-green-200",
};

const stageBadgeColors: Record<FunnelStage, string> = {
  "Prospecção": "bg-slate-200 text-slate-700",
  "Contato": "bg-blue-200 text-blue-700",
  "Proposta": "bg-purple-200 text-purple-700",
  "Negociação": "bg-yellow-200 text-yellow-800",
  "Contrato": "bg-orange-200 text-orange-700",
  "Fechado": "bg-green-200 text-green-700",
};

export function LeadsKanbanPage() {
  const { activeOrgId } = useOrg();
  const { data: leads = [], refetch } = useLeads(activeOrgId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l: any) => l.stage === stage);
    return acc;
  }, {} as Record<FunnelStage, any[]>);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const leadId = result.draggableId;
    const newStage = result.destination.droppableId as FunnelStage;
    const lead = leads.find((l: any) => l.id === leadId);

    if (!lead || lead.stage === newStage) return;

    // Validation: Lead without date can't advance past "Proposta"
    const advancedStages: FunnelStage[] = ["Negociação", "Contrato", "Fechado"];
    if (advancedStages.includes(newStage) && !lead.event_date) {
      toast.error("Lead sem data não pode avançar", {
        description: "Defina uma data pretendida antes de avançar para negociação.",
      });
      return;
    }

    const { error } = await db
      .from("leads")
      .update({ stage: newStage })
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao mover lead", { description: error.message });
      return;
    }

    // If moved to "Negociação", create calendar event
    if (newStage === "Negociação" && lead.event_date) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await db.from("calendar_events").insert({
          organization_id: activeOrgId,
          lead_id: leadId,
          title: lead.contractor_name,
          status: "negotiation",
          start_time: new Date(lead.event_date).toISOString(),
          city: lead.city,
          state: lead.state,
          fee: lead.fee,
          created_by: user.id,
          latitude: lead.latitude,
          longitude: lead.longitude,
          venue_name: lead.venue_name,
          contractor_name: lead.contractor_name,
        });
        toast.success("Evento criado no calendário");
      }
    }

    // If moved to "Fechado", update calendar event to confirmed
    if (newStage === "Fechado") {
      await db
        .from("calendar_events")
        .update({ status: "confirmed" })
        .eq("lead_id", leadId);
      toast.success("Show confirmado no calendário!");
    }

    refetch();
  }

  function openCreateDialog() {
    setEditingLead(null);
    setDialogOpen(true);
  }

  function openEditDialog(lead: any) {
    setEditingLead(lead);
    setDialogOpen(true);
  }

  async function handleDialogResult(data: any | null) {
    if (!data) {
      setDialogOpen(false);
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !activeOrgId) return;

    if (editingLead) {
      // Update
      const { error } = await db
        .from("leads")
        .update(data)
        .eq("id", editingLead.id);
      if (error) {
        toast.error("Erro ao atualizar lead", { description: error.message });
        return;
      }
      toast.success("Lead atualizado");
    } else {
      // Create
      const { error } = await db.from("leads").insert({
        ...data,
        organization_id: activeOrgId,
        created_by: user.id,
      });
      if (error) {
        toast.error("Erro ao criar lead", { description: error.message });
        return;
      }
      toast.success("Lead criado");
    }

    setDialogOpen(false);
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Funil de Leads</h1>
          <p className="text-sm text-muted-foreground">Arraste os cards para mudar de etapa</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <Badge className={stageBadgeColors[stage]}>{stage}</Badge>
                <span className="text-xs text-muted-foreground">{leadsByStage[stage].length}</span>
              </div>

              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                  >
                    <div className="space-y-2">
                      {leadsByStage[stage].map((lead: any, index: number) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 cursor-grab ${stageColors[stage]} ${
                                snapshot.isDragging ? "shadow-lg rotate-2" : ""
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-medium text-sm truncate flex-1">
                                    {lead.contractor_name}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditDialog(lead);
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>

                                {lead.contractor_type && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    {lead.contractor_type}
                                  </div>
                                )}

                                {lead.event_date && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Calendar className="h-3 w-3 text-primary" />
                                    {format(parseISO(lead.event_date), "dd/MM/yyyy")}
                                  </div>
                                )}

                                {(lead.city || lead.state) && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {[lead.city, lead.state].filter(Boolean).join(" / ")}
                                  </div>
                                )}

                                {lead.fee && (
                                  <div className="flex items-center gap-1 text-xs font-medium text-green-700">
                                    <DollarSign className="h-3 w-3" />
                                    {formatMoneyBRL(lead.fee)}
                                  </div>
                                )}
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingLead}
        onResult={handleDialogResult}
      />
    </div>
  );
}
