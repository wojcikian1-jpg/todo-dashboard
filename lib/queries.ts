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
  Project,
  ProjectStatus,
  Workflow,
  ProjectTask,
  Issue,
  IssueStatus,
  ProjectNote,
  TaskStatus,
  TaskPriority,
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
      .is("project_id", null)
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

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const workspaceId = await getActiveWorkspaceId();

  const [projectsResult, workflowsResult, issuesResult, notesResult, projectTasksResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("sub_workflows")
        .select("id, project_id, name, position, created_at"),
      supabase
        .from("issues")
        .select("id, project_id, title, description, status, opened_at, resolved_at"),
      supabase
        .from("project_notes")
        .select("id, project_id, body, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, project_id, subworkflow_id, text, status, priority, due_date, created_at")
        .eq("workspace_id", workspaceId)
        .eq("archived", false)
        .not("project_id", "is", null)
        .order("created_at", { ascending: true }),
    ]);

  if (projectsResult.error) throw projectsResult.error;
  if (workflowsResult.error) throw workflowsResult.error;
  if (issuesResult.error) throw issuesResult.error;
  if (notesResult.error) throw notesResult.error;
  if (projectTasksResult.error) throw projectTasksResult.error;

  const workflowsByProject = new Map<string, Workflow[]>();
  for (const row of workflowsResult.data ?? []) {
    const pid = row.project_id as string;
    const arr = workflowsByProject.get(pid) ?? [];
    arr.push({
      id: row.id as string,
      projectId: pid,
      name: row.name as string,
      position: row.position as number,
      createdAt: row.created_at as string,
    });
    workflowsByProject.set(pid, arr);
  }

  const issuesByProject = new Map<string, Issue[]>();
  for (const row of issuesResult.data ?? []) {
    const pid = row.project_id as string;
    const arr = issuesByProject.get(pid) ?? [];
    arr.push({
      id: row.id as string,
      projectId: pid,
      title: row.title as string,
      description: (row.description as string) ?? "",
      status: row.status as IssueStatus,
      openedAt: row.opened_at as string,
      resolvedAt: (row.resolved_at as string) ?? null,
    });
    issuesByProject.set(pid, arr);
  }

  const notesByProject = new Map<string, ProjectNote[]>();
  for (const row of notesResult.data ?? []) {
    const pid = row.project_id as string;
    const arr = notesByProject.get(pid) ?? [];
    arr.push({
      id: row.id as string,
      projectId: pid,
      body: row.body as string,
      createdAt: row.created_at as string,
    });
    notesByProject.set(pid, arr);
  }

  const tasksByProject = new Map<string, ProjectTask[]>();
  for (const row of projectTasksResult.data ?? []) {
    const pid = row.project_id as string;
    const arr = tasksByProject.get(pid) ?? [];
    arr.push({
      id: row.id as string,
      workflowId: (row.subworkflow_id as string) ?? null,
      text: row.text as string,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      dueDate: (row.due_date as string) ?? null,
    });
    tasksByProject.set(pid, arr);
  }

  return (projectsResult.data ?? []).map((row) => {
    const id = row.id as string;
    const workflows = (workflowsByProject.get(id) ?? []).sort(
      (a, b) => a.position - b.position
    );
    const issues = issuesByProject.get(id) ?? [];
    const notes = notesByProject.get(id) ?? [];
    const tasks = tasksByProject.get(id) ?? [];
    return {
      id,
      name: row.name as string,
      description: (row.description as string) ?? "",
      goal: (row.goal as string) ?? "",
      status: row.status as ProjectStatus,
      startDate: (row.start_date as string) ?? null,
      targetDate: (row.target_date as string) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      workflows,
      tasks,
      issues,
      notes,
      taskCount: tasks.length,
      openIssueCount: issues.filter((i) => i.status === "open").length,
    };
  });
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
