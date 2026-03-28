import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import * as api from "@/services/api";
import { toast } from "sonner";
import type { Lead, PipelineStage } from "@/types/crm";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export function CrmPipelinePage() {
  const { activeOrgId } = useOrg();
  const qc = useQueryClient();

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages", activeOrgId],
    queryFn: () => api.fetchStages(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["crm-leads", activeOrgId],
    queryFn: () => api.fetchLeads(activeOrgId!),
    enabled: !!activeOrgId,
  });

  function getLeadsForStage(stageName: string) {
    return leads.filter((l) => l.stage === stageName);
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId;
    try {
      await api.updateLead(leadId, { stage: newStage });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success(`Lead movido para ${newStage}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="p-6 space-y-4 fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Arraste leads entre as etapas</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageLeads = getLeadsForStage(stage.name);
            return (
              <Droppable key={stage.name} droppableId={stage.name}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`w-64 shrink-0 rounded-lg border border-border p-3 transition-colors ${
                      snapshot.isDraggingOver ? "bg-accent/40" : "bg-card/50"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-sm font-semibold">{stage.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{stageLeads.length}</Badge>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 min-h-[100px]">
                      {stageLeads.map((lead, idx) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                          {(prov, snap) => (
                            <Card
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`border bg-card p-3 cursor-grab transition-shadow ${
                                snap.isDragging ? "shadow-lg ring-1 ring-ring" : ""
                              }`}
                            >
                              <p className="text-sm font-medium truncate">{lead.contractor_name}</p>
                              {lead.contact_phone && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                  <Phone className="h-3 w-3" /> {lead.contact_phone}
                                </p>
                              )}
                              {lead.city && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {lead.city}
                                </p>
                              )}
                              {lead.fee && (
                                <p className="text-xs font-medium text-green-400 mt-1">
                                  R$ {Number(lead.fee).toLocaleString("pt-BR")}
                                </p>
                              )}
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
