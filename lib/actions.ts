"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  createTagSchema,
} from "@/lib/schemas";
import { getActiveWorkspaceId } from "@/lib/workspace";
import type { ActionResult, Task } from "@/lib/types/domain";

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
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
