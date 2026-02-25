import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import type { Task, Tag, SubtaskStatus } from "@/lib/types/domain";

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

  return (tasksResult.data ?? []).map((row) => mapRowToTask(row, tagMap));
}

export async function getArchivedTasks(): Promise<Task[]> {
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
      .eq("archived", true)
      .order("updated_at", { ascending: false }),
  ]);

  if (tagsResult.error) throw tagsResult.error;
  if (tasksResult.error) throw tasksResult.error;

  const tagMap = new Map<string, Tag>(
    (tagsResult.data ?? []).map((t) => [t.id, t])
  );

  return (tasksResult.data ?? []).map((row) => mapRowToTask(row, tagMap));
}

function mapRowToTask(
  row: Record<string, unknown>,
  tagMap: Map<string, Tag>
): Task {
  return {
    id: row.id as string,
    text: row.text as string,
    description: (row.description as string) ?? "",
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    dueDate: (row.due_date as string) ?? null,
    tags: ((row.tag_ids as string[]) ?? [])
      .map((id: string) => tagMap.get(id))
      .filter((t: Tag | undefined): t is Tag => t !== undefined),
    subtasks: ((row.subtasks as Record<string, unknown>[]) ?? []).map(
      (s: Record<string, unknown>) => ({
        id: s.id as string,
        text: s.text as string,
        status: ((s.status as string) ?? (s.completed ? "completed" : "pending")) as SubtaskStatus,
      })
    ),
    notes: (row.notes as Task["notes"]) ?? [],
    archived: row.archived as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
