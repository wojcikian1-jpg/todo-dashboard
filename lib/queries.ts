import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import type { Task, Tag, Workspace, WorkspaceRole } from "@/lib/types/domain";

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const workspaceId = await getActiveWorkspaceId();

  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const workspaceId = await getActiveWorkspaceId();

  const [tagsResult, tasksResult] = await Promise.all([
    supabase
      .from("tags")
      .select("id, name, color")
      .eq("workspace_id", workspaceId),
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
  ]);

  if (tagsResult.error) throw tagsResult.error;
  if (tasksResult.error) throw tasksResult.error;

  const tagMap = new Map<string, Tag>(
    (tagsResult.data ?? []).map((t) => [t.id, t])
  );

  return (tasksResult.data ?? []).map((row) => ({
    id: row.id,
    text: row.text,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    tags: (row.tag_ids ?? [])
      .map((id: string) => tagMap.get(id))
      .filter((t: Tag | undefined): t is Tag => t !== undefined),
    subtasks: (row.subtasks ?? []).map((s: Record<string, unknown>) => ({
      id: s.id,
      text: s.text,
      status: s.status ?? (s.completed ? "completed" : "pending"),
    })),
    notes: row.notes ?? [],
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      role,
      joined_at,
      workspace:workspaces(id, name, owner_id, created_at)
    `
    )
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const ws = row.workspace as Record<string, unknown>;
    return {
      id: ws.id as string,
      name: ws.name as string,
      ownerId: ws.owner_id as string,
      role: row.role as WorkspaceRole,
      createdAt: ws.created_at as string,
    };
  });
}
