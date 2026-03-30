import { supabase } from "@/integrations/supabase/client";

// Backward-compatible export for legacy modules.
// Prefer importing `supabase` directly in new code.
export const db = supabase;
