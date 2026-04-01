import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import type {
  Task,
  Tag,
  SubtaskStatus,
  RecurringTask,
  RecurringCompletion,
  RecurringFrequencyType,
  FrequencyConfig,
} from "@/lib/types/domain";

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

export async function getRecurringTasks(): Promise<RecurringTask[]> {
  const supabase = await createClient();
  const workspaceId = await getActiveWorkspaceId();

  const [tagsResult, tasksResult] = await Promise.all([
    supabase
      .from("tags")
      .select("id, name, color")
      .eq("workspace_id", workspaceId),
    supabase
      .from("recurring_tasks")
      .select("id, title, frequency_type, frequency_config, start_date, end_date, tag_ids, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  if (tagsResult.error) throw tagsResult.error;
  if (tasksResult.error) throw tasksResult.error;

  const tagMap = new Map<string, Tag>(
    (tagsResult.data ?? []).map((t) => [t.id, t])
  );

  return (tasksResult.data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    frequencyType: row.frequency_type as RecurringFrequencyType,
    frequencyConfig: (row.frequency_config as FrequencyConfig) ?? null,
    startDate: row.start_date as string,
    endDate: (row.end_date as string) ?? null,
    tags: ((row.tag_ids as string[]) ?? [])
      .map((id: string) => tagMap.get(id))
      .filter((t: Tag | undefined): t is Tag => t !== undefined),
    createdAt: row.created_at as string,
  }));
}

export async function getRecurringCompletions(
  month: number,
  year: number
): Promise<RecurringCompletion[]> {
  const supabase = await createClient();
  const workspaceId = await getActiveWorkspaceId();

  const startOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Get recurring task IDs for this workspace
  const { data: taskRows, error: taskError } = await supabase
    .from("recurring_tasks")
    .select("id")
    .eq("workspace_id", workspaceId);

  if (taskError) throw taskError;
  const taskIds = (taskRows ?? []).map((r) => r.id as string);
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from("recurring_completions")
    .select("id, recurring_task_id, completed_date")
    .in("recurring_task_id", taskIds)
    .gte("completed_date", startOfMonth)
    .lte("completed_date", endOfMonth);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    recurringTaskId: row.recurring_task_id as string,
    completedDate: row.completed_date as string,
  }));
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
