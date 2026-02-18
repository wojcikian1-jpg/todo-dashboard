"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

export async function getActiveWorkspaceId(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (fromCookie) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", fromCookie)
      .single();

    if (data) return fromCookie;
  }

  // Fallback: get the user's first workspace
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) throw new Error("No workspace found");

  // Persist this for next time
  await setActiveWorkspaceId(data.workspace_id);
  return data.workspace_id;
}

export async function setActiveWorkspaceId(
  workspaceId: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
