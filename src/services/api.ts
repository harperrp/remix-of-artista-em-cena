// ── Service Layer ──
// All database access goes through here. Components NEVER import supabase directly.

import { supabase } from "@/integrations/supabase/client";
import type { CalendarEvent, Conversation, Lead, Message, PipelineStage } from "@/types/crm";

type LeadConversationRow = {
  id: string;
  organization_id: string;
  contractor_name: string;
  stage: string;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  created_at: string;
};

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, active_organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchLeads(orgId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function createLead(lead: Partial<Lead> & { organization_id: string; contractor_name: string; created_by: string }) {
  const { data, error } = await supabase.from("leads").insert(lead).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function fetchStages(orgId: string): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from("funnel_stages")
    .select("*")
    .eq("organization_id", orgId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as PipelineStage[];
}

export async function fetchConversations(orgId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, organization_id, contractor_name, stage, contact_phone, whatsapp_phone, last_message, last_message_at, unread_count, created_at")
    .eq("organization_id", orgId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  const rows = (data ?? []) as LeadConversationRow[];

  return rows.map((lead) => ({
    id: lead.id,
    organization_id: lead.organization_id,
    lead_id: lead.id,
    contact_phone: lead.whatsapp_phone || lead.contact_phone || "",
    contact_name: lead.contractor_name,
    last_message_at: lead.last_message_at || lead.created_at,
    last_message_text: lead.last_message,
    unread_count: lead.unread_count ?? 0,
    status: "open",
    created_at: lead.created_at,
    lead: lead as unknown as Lead,
    stage: lead.stage,
  }));
}

export async function updateConversation(id: string, updates: Pick<Lead, "stage" | "notes">) {
  const { error } = await supabase.from("leads").update(updates).eq("id", id);
  if (error) throw error;
}

export async function markConversationRead(leadId: string) {
  const { error } = await supabase.rpc("mark_lead_conversation_read", { _lead_id: leadId });
  if (error) throw error;
}

export async function fetchNotes(entityId: string) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createNote(note: { organization_id: string; entity_id: string; entity_type: string; content: string; created_by: string }) {
  const { data, error } = await supabase.from("notes").insert(note).select().single();
  if (error) throw error;
  return data;
}

export async function fetchMessages(leadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("lead_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(msg: {
  lead_id?: string;
  organization_id: string;
  message_text?: string;
  to?: string;
  mode?: "cloud" | "vps";
  media_url?: string;
}) {
  const { data, error } = await supabase.functions.invoke("wa-send-message", {
    body: {
      leadId: msg.lead_id,
      organizationId: msg.organization_id,
      to: msg.to,
      text: msg.message_text,
      mode: msg.mode ?? "cloud",
      media_url: msg.media_url,
    },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Erro ao enviar mensagem");
  return data;
}

export async function fetchEvents(orgId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("organization_id", orgId)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function createEvent(event: Partial<CalendarEvent> & { organization_id: string; title: string; start_time: string; created_by: string }) {
  const { data, error } = await supabase.from("calendar_events").insert(event).select().single();
  if (error) throw error;
  return data as CalendarEvent;
}

export function subscribeToTable(table: string, filter: string | null, callback: () => void) {
  const channel = supabase
    .channel(`rt-${table}-${Date.now()}`)
    .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, callback)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
