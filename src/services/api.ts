// ── Service Layer ──
// All database access goes through here. Components NEVER import supabase directly.
// When migrating to a custom VPS API, only this file changes.

import { supabase } from "@/integrations/supabase/client";
import type { Lead, Conversation, Message, PipelineStage, CalendarEvent } from "@/types/crm";

// ── Auth ──
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Profile / Org ──
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, active_organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Leads ──
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

// ── Pipeline Stages ──
export async function fetchStages(orgId: string): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from("funnel_stages")
    .select("*")
    .eq("organization_id", orgId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as PipelineStage[];
}

// ── Conversations ──
export async function fetchConversations(orgId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, lead:leads(id, contractor_name, stage, contact_phone)")
    .eq("organization_id", orgId)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function updateConversation(id: string, updates: Partial<Conversation>) {
  const { error } = await supabase.from("conversations").update(updates).eq("id", id);
  if (error) throw error;
}

export async function markConversationRead(id: string) {
  const { error } = await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
  if (error) throw error;
}

// ── Notes ──
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

// ── Messages ──
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("lead_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(msg: {
  lead_id: string;
  organization_id: string;
  conversation_id: string;
  message_text: string;
  direction: "outbound";
}) {
  const { data, error } = await supabase.from("lead_messages").insert({
    ...msg,
    message_type: "text",
  }).select().single();
  if (error) throw error;
  // Update conversation last_message
  await supabase.from("conversations").update({
    last_message_at: new Date().toISOString(),
    last_message_text: msg.message_text,
  }).eq("id", msg.conversation_id);
  return data as Message;
}

// ── Calendar Events ──
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
  const { data, error } = await supabase.from("calendar_events").insert(event as any).select().single();
  if (error) throw error;
  return data as CalendarEvent;
}

// ── Realtime helpers ──
export function subscribeToTable(table: string, filter: string, callback: () => void) {
  const channel = supabase
    .channel(`rt-${table}-${Date.now()}`)
    .on("postgres_changes", { event: "*", schema: "public", table, filter }, callback)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
