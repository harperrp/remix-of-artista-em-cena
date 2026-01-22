import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useOrg } from "@/providers/OrgProvider";
import { useContracts, useLeads, useCalendarEvents } from "@/hooks/useCrmQueries";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FilePlus, FileText, ExternalLink, Edit2, Calendar, MapPin, DollarSign } from "lucide-react";
import { formatMoneyBRL } from "@/lib/calendar-utils";
import { format, parseISO } from "date-fns";
import { ContractDialog } from "@/components/contracts/ContractDialog";

function statusLabel(s: string) {
  switch (s) {
    case "pending":
      return "Pendente";
    case "signed":
      return "Assinado";
    case "canceled":
      return "Cancelado";
    default:
      return s;
  }
}

function statusBadgeClass(s: string) {
  switch (s) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "signed":
      return "bg-green-100 text-green-800 border-green-300";
    case "canceled":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "";
  }
}

export function ContractsCrudPage() {
  const { activeOrgId } = useOrg();
  const { data: contracts = [], isLoading, refetch } = useContracts(activeOrgId);
  const { data: leads = [] } = useLeads(activeOrgId);
  const { data: events = [] } = useCalendarEvents(activeOrgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);

  // Filter leads that are in advanced stages (potential for contract)
  const eligibleLeads = leads.filter(
    (l: any) => ["Negociação", "Contrato", "Fechado"].includes(l.stage)
  );

  function openCreateDialog() {
    setEditingContract(null);
    setDialogOpen(true);
  }

  function openEditDialog(contract: any) {
    setEditingContract(contract);
    setDialogOpen(true);
  }

  async function handleDialogResult(data: any | null) {
    if (!data) {
      setDialogOpen(false);
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !activeOrgId) return;

    if (editingContract) {
      // Update
      const { error } = await db
        .from("contracts")
        .update({
          lead_id: data.lead_id,
          status: data.status,
          fee: data.fee,
          payment_method: data.payment_method,
          document_url: data.document_url,
        })
        .eq("id", editingContract.id);

      if (error) {
        toast.error("Erro ao atualizar contrato", { description: error.message });
        return;
      }

      // If signed, update calendar event to confirmed
      if (data.status === "signed") {
        await db
          .from("calendar_events")
          .update({ status: "confirmed" })
          .eq("lead_id", data.lead_id);

        // Also update lead stage
        await db
          .from("leads")
          .update({ stage: "Fechado" })
          .eq("id", data.lead_id);
      }

      toast.success("Contrato atualizado");
    } else {
      // Create
      const { error } = await db.from("contracts").insert({
        organization_id: activeOrgId,
        lead_id: data.lead_id,
        status: data.status,
        fee: data.fee,
        payment_method: data.payment_method,
        document_url: data.document_url,
        created_by: user.id,
      });

      if (error) {
        toast.error("Erro ao criar contrato", { description: error.message });
        return;
      }

      // Update lead stage to "Contrato"
      await db.from("leads").update({ stage: "Contrato" }).eq("id", data.lead_id);

      toast.success("Contrato criado");
    }

    setDialogOpen(false);
    refetch();
  }

  // Get lead info for contract
  function getLeadInfo(leadId: string) {
    return leads.find((l: any) => l.id === leadId);
  }

  // Get event info for contract
  function getEventInfo(leadId: string) {
    return events.find((e: any) => e.lead_id === leadId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground">Gerencie contratos vinculados aos leads</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <FilePlus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-2">
        {["pending", "signed", "canceled"].map((s) => (
          <Badge key={s} variant="outline" className={statusBadgeClass(s)}>
            {statusLabel(s)}
          </Badge>
        ))}
      </div>

      <Card className="border bg-card/70 p-4 shadow-soft">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : contracts.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Sem contratos ainda. Clique em <span className="font-medium">Novo Contrato</span>.
          </div>
        ) : (
          <div className="grid gap-4">
            {contracts.map((c: any) => {
              const lead = getLeadInfo(c.lead_id);
              const event = getEventInfo(c.lead_id);

              return (
                <Card key={c.id} className="border bg-card/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          {lead?.contractor_name || c.leads?.contractor_name || "Contrato"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {(lead?.city || c.leads?.city) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead?.city || c.leads?.city}/{lead?.state || c.leads?.state}
                          </span>
                        )}

                        {event && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(event.start_time), "dd/MM/yyyy")}
                          </span>
                        )}

                        {(c.fee || lead?.fee) && (
                          <span className="flex items-center gap-1 text-green-700 font-medium">
                            <DollarSign className="h-3 w-3" />
                            {formatMoneyBRL(c.fee || lead?.fee)}
                          </span>
                        )}
                      </div>

                      {c.payment_method && (
                        <div className="text-xs text-muted-foreground">
                          Pagamento: {c.payment_method}
                        </div>
                      )}

                      {c.document_url ? (
                        <a
                          className="text-sm text-primary underline flex items-center gap-1"
                          href={c.document_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir documento
                        </a>
                      ) : (
                        <div className="text-xs text-muted-foreground">Sem documento anexado</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusBadgeClass(c.status)}>
                        {statusLabel(c.status)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(c)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <ContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingContract}
        leads={eligibleLeads}
        onResult={handleDialogResult}
      />
    </div>
  );
}
