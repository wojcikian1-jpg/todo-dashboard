"use server";

import { createClient } from "@/lib/supabase/server";

const SHARED_WORKSPACE_NAME = "Team Dashboard";

export async function getActiveWorkspaceId(): Promise<string> {
  const supabase = await createClient();

  // TODO: clean up duplicate "Team Dashboard" workspaces that this function
  // may have created when signed-in non-members fell through the lookup and
  // re-inserted. Merge their tasks/tags/members into the oldest row.
  // Get the single shared workspace
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("name", SHARED_WORKSPACE_NAME)
    .limit(1)
    .maybeSingle();

  if (data) return data.id;

  // First user — create the shared workspace
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: SHARED_WORKSPACE_NAME, owner_id: ownerId })
    .select("id")
    .single();
  if (wsError || !ws) throw new Error("Failed to create workspace");

  if (user) {
    await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });
  }

  return ws.id;
}
