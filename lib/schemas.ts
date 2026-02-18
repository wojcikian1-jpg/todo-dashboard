import { z } from "zod/v4";

export const taskStatusSchema = z.enum([
  "not-started",
  "in-progress",
  "at-risk",
  "completed",
]);

export const taskPrioritySchema = z.enum(["high", "medium", "low"]);

export const createTaskSchema = z.object({
  text: z.string().trim().min(1, "Task title is required").max(500),
  description: z.string().trim().max(2000).optional().default(""),
});

export const subtaskStatusSchema = z.enum(["pending", "in-progress", "completed"]);

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  description: z.string().trim().max(2000),
  dueDate: z.string().date().nullable(),
  priority: taskPrioritySchema,
  tagIds: z.array(z.string().uuid()),
  subtasks: z.array(
    z.object({
      id: z.string(),
      text: z.string().trim().min(1).max(500),
      status: subtaskStatusSchema,
    })
  ),
  notes: z.array(
    z.object({
      id: z.string(),
      text: z.string().trim().min(1).max(5000),
      createdAt: z.string(),
    })
  ),
});

export const updateTaskStatusSchema = z.object({
  id: z.string().uuid(),
  status: taskStatusSchema,
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
});

export const addNoteSchema = z.object({
  taskId: z.string().uuid(),
  text: z.string().trim().min(1, "Note cannot be empty").max(5000),
});

export const toggleSubtaskSchema = z.object({
  taskId: z.string().uuid(),
  subtaskId: z.string(),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(100),
});

export const generateInviteSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const joinWorkspaceSchema = z.object({
  token: z.string().min(1, "Invite token is required"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
