import { createClient } from "@/lib/supabase/server";
import type { Task, Tag } from "@/lib/types/domain";

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();

  const [tagsResult, tasksResult] = await Promise.all([
    supabase.from("tags").select("id, name, color"),
    supabase
      .from("tasks")
      .select("*")
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
    subtasks: row.subtasks ?? [],
    notes: row.notes ?? [],
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
