"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  createTagSchema,
  createRecurringTaskSchema,
  toggleRecurringCompletionSchema,
  fetchRecurringCompletionsSchema,
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
  createSubWorkflowSchema,
  deleteSubWorkflowSchema,
  createProjectTaskSchema,
  createIssueSchema,
  updateIssueStatusSchema,
  createProjectNoteSchema,
  deleteProjectNoteSchema,
} from "@/lib/schemas";
import { getActiveWorkspaceId } from "@/lib/workspace";
import type { ActionResult, Task, RecurringCompletion } from "@/lib/types/domain";

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const userId = await getAuthUserId();
    const workspaceId = await getActiveWorkspaceId();
    const supabase = await createClient();
    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      workspace_id: workspaceId,
      text: parsed.data.text,
      description: parsed.data.description,
      due_date: parsed.data.dueDate,
      priority: parsed.data.priority,
      tag_ids: parsed.data.tagIds,
      subtasks: parsed.data.subtasks,
    });

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(input: unknown): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();
    const { id, ...fields } = parsed.data;
    const { error } = await supabase
      .from("tasks")
      .update({
        description: fields.description,
        due_date: fields.dueDate,
        priority: fields.priority,
        tag_ids: fields.tagIds,
        subtasks: fields.subtasks,
        notes: fields.notes,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update task" };
  }
}

export async function updateTaskStatus(
  input: unknown
): Promise<ActionResult> {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update task status" };
  }
}

export async function deleteTask(id: unknown): Promise<ActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: "Invalid task ID" };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete task" };
  }
}

export async function archiveCompletedTasks(): Promise<ActionResult> {
  try {
    await getAuthUserId();
    const workspaceId = await getActiveWorkspaceId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ archived: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .eq("archived", false);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to archive tasks" };
  }
}

export async function fetchArchivedTasks(): Promise<ActionResult<Task[]>> {
  try {
    await getAuthUserId();
    const { getArchivedTasks } = await import("@/lib/queries");
    const tasks = await getArchivedTasks();
    return { success: true, data: tasks };
  } catch {
    return { success: false, error: "Failed to fetch archived tasks" };
  }
}

export async function restoreTask(id: unknown): Promise<ActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: "Invalid task ID" };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ archived: false })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to restore task" };
  }
}

export async function createTag(input: unknown): Promise<ActionResult> {
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const userId = await getAuthUserId();
    const workspaceId = await getActiveWorkspaceId();
    const supabase = await createClient();
    const { error } = await supabase.from("tags").insert({
      user_id: userId,
      workspace_id: workspaceId,
      name: parsed.data.name,
      color: parsed.data.color,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A tag with that name already exists" };
      }
      return { success: false, error: error.message };
    }
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create tag" };
  }
}

export async function deleteTag(id: unknown): Promise<ActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: "Invalid tag ID" };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();
    const { error } = await supabase.from("tags").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete tag" };
  }
}

// ── Recurring Tasks ──────────────────────────────────────

export async function createRecurringTask(
  input: unknown
): Promise<ActionResult> {
  const parsed = createRecurringTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const userId = await getAuthUserId();
    const workspaceId = await getActiveWorkspaceId();
    const supabase = await createClient();
    const { error } = await supabase.from("recurring_tasks").insert({
      user_id: userId,
      workspace_id: workspaceId,
      title: parsed.data.title,
      frequency_type: parsed.data.frequencyType,
      frequency_config: parsed.data.frequencyConfig,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      tag_ids: parsed.data.tagIds,
    });

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create recurring task" };
  }
}

export async function deleteRecurringTask(
  id: unknown
): Promise<ActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: "Invalid recurring task ID" };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("recurring_tasks")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete recurring task" };
  }
}

export async function toggleRecurringCompletion(
  input: unknown
): Promise<ActionResult> {
  const parsed = toggleRecurringCompletionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await getAuthUserId();
    const supabase = await createClient();
    const { recurringTaskId, date } = parsed.data;

    // Check if completion exists
    const { data: existing } = await supabase
      .from("recurring_completions")
      .select("id")
      .eq("recurring_task_id", recurringTaskId)
      .eq("completed_date", date)
      .maybeSingle();

    if (existing) {
      // Un-complete: delete the record
      const { error } = await supabase
        .from("recurring_completions")
        .delete()
        .eq("id", existing.id);
      if (error) return { success: false, error: error.message };
    } else {
      // Complete: insert the record
      const { error } = await supabase
        .from("recurring_completions")
        .insert({
          recurring_task_id: recurringTaskId,
          completed_date: date,
        });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to toggle completion" };
  }
}

export async function fetchRecurringCompletions(
  input: unknown
): Promise<ActionResult<RecurringCompletion[]>> {
  const parsed = fetchRecurringCompletionsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await getAuthUserId();
    const { getRecurringCompletions } = await import("@/lib/queries");
    const completions = await getRecurringCompletions(
      parsed.data.month,
      parsed.data.year
    );
    return { success: true, data: completions };
  } catch {
    return { success: false, error: "Failed to fetch completions" };
  }
}

export async function createProject(input: unknown): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const workspaceId = await getActiveWorkspaceId();
    const supabase = await createClient();
    const { error } = await supabase.from("projects").insert({
      workspace_id: workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      goal: parsed.data.goal,
      status: parsed.data.status,
      start_date: parsed.data.startDate,
      target_date: parsed.data.targetDate,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(input: unknown): Promise<ActionResult> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const { id, ...fields } = parsed.data;
    const { error } = await supabase
      .from("projects")
      .update({
        name: fields.name,
        description: fields.description,
        goal: fields.goal,
        status: fields.status,
        start_date: fields.startDate,
        target_date: fields.targetDate,
      })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(input: unknown): Promise<ActionResult> {
  const parsed = deleteProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("projects").delete().eq("id", parsed.data.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete project" };
  }
}

export async function createSubWorkflow(input: unknown): Promise<ActionResult> {
  const parsed = createSubWorkflowSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("sub_workflows")
      .select("position")
      .eq("project_id", parsed.data.projectId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPosition =
      existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;
    const { error } = await supabase.from("sub_workflows").insert({
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      position: nextPosition,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create sub-workflow" };
  }
}

export async function deleteSubWorkflow(input: unknown): Promise<ActionResult> {
  const parsed = deleteSubWorkflowSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("sub_workflows").delete().eq("id", parsed.data.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete sub-workflow" };
  }
}

export async function createIssue(input: unknown): Promise<ActionResult> {
  const parsed = createIssueSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("issues").insert({
      project_id: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create issue" };
  }
}

export async function updateIssueStatus(input: unknown): Promise<ActionResult> {
  const parsed = updateIssueStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const resolvedAt = parsed.data.status === "resolved" ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("issues")
      .update({ status: parsed.data.status, resolved_at: resolvedAt })
      .eq("id", parsed.data.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update issue" };
  }
}

export async function createProjectNote(input: unknown): Promise<ActionResult> {
  const parsed = createProjectNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("project_notes").insert({
      project_id: parsed.data.projectId,
      body: parsed.data.body,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create note" };
  }
}

export async function deleteProjectNote(input: unknown): Promise<ActionResult> {
  const parsed = deleteProjectNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("project_notes").delete().eq("id", parsed.data.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete note" };
  }
}

export async function createProjectTask(input: unknown): Promise<ActionResult> {
  const parsed = createProjectTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  try {
    const userId = await getAuthUserId();
    const workspaceId = await getActiveWorkspaceId();
    const supabase = await createClient();
    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      workspace_id: workspaceId,
      project_id: parsed.data.projectId,
      subworkflow_id: parsed.data.workflowId,
      text: parsed.data.text,
      status: "not-started",
      priority: "medium",
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to create task" };
  }
}
