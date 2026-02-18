"use server";

import { createClient } from "@/lib/supabase/server";

const SHARED_WORKSPACE_NAME = "Team Dashboard";

export async function getActiveWorkspaceId(): Promise<string> {
  const supabase = await createClient();

  // Get the single shared workspace
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("name", SHARED_WORKSPACE_NAME)
    .limit(1)
    .single();

  if (data) return data.id;

  // First user — create the shared workspace
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: SHARED_WORKSPACE_NAME, owner_id: user.id })
    .select("id")
    .single();
  if (wsError || !ws) throw new Error("Failed to create workspace");

  await supabase
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });

  return ws.id;
}
