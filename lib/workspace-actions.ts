"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkspaceSchema,
  generateInviteSchema,
  joinWorkspaceSchema,
} from "@/lib/schemas";
import { setActiveWorkspaceId } from "@/lib/workspace";
import type { ActionResult, WorkspaceInvite } from "@/lib/types/domain";

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function createWorkspace(
  input: unknown
): Promise<ActionResult<string>> {
  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: parsed.data.name, owner_id: userId })
      .select("id")
      .single();

    if (wsError) return { success: false, error: wsError.message };

    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) return { success: false, error: memberError.message };

    await setActiveWorkspaceId(workspace.id);
    revalidatePath("/dashboard");
    return { success: true, data: workspace.id };
  } catch {
    return { success: false, error: "Failed to create workspace" };
  }
}

export async function switchWorkspace(
  workspaceId: string
): Promise<ActionResult> {
  try {
    await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) {
      return { success: false, error: "Not a member of this workspace" };
    }

    await setActiveWorkspaceId(workspaceId);
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to switch workspace" };
  }
}

export async function generateInviteLink(
  input: unknown
): Promise<ActionResult<WorkspaceInvite>> {
  const parsed = generateInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_id: parsed.data.workspaceId,
        created_by: userId,
      })
      .select("id, token, expires_at, created_at")
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        id: data.id,
        token: data.token,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
      },
    };
  } catch {
    return { success: false, error: "Failed to generate invite" };
  }
}

export async function joinWorkspace(
  input: unknown
): Promise<ActionResult<string>> {
  const parsed = joinWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "join_workspace_via_invite",
      { invite_token: parsed.data.token }
    );

    if (error) return { success: false, error: error.message };

    const workspaceId = data as string;
    await setActiveWorkspaceId(workspaceId);
    revalidatePath("/dashboard");
    return { success: true, data: workspaceId };
  } catch {
    return { success: false, error: "Failed to join workspace" };
  }
}
