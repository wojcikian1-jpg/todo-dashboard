import { z } from "zod/v4";

export const taskStatusSchema = z.enum([
  "not-started",
  "in-progress",
  "at-risk",
  "completed",
]);

export const taskPrioritySchema = z.enum(["high", "medium", "low"]);

export const subtaskStatusSchema = z.enum(["pending", "in-progress", "completed"]);

export const createTaskSchema = z.object({
  text: z.string().trim().min(1, "Task title is required").max(500),
  description: z.string().trim().max(2000).optional().default(""),
  dueDate: z.string().date().nullable().optional().default(null),
  priority: taskPrioritySchema.optional().default("medium"),
  tagIds: z.array(z.string().uuid()).optional().default([]),
  subtasks: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().trim().min(1).max(500),
        status: subtaskStatusSchema,
      })
    )
    .optional()
    .default([]),
});

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

export const recurringFrequencyTypeSchema = z.enum([
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "monthly-pattern",
]);

export const createRecurringTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  frequencyType: recurringFrequencyTypeSchema,
  frequencyConfig: z
    .union([
      z.null(),
      z.object({ dayOfWeek: z.number().int().min(0).max(6) }),
      z.object({ dayOfMonth: z.number().int().min(1).max(31) }),
      z.object({
        week: z.number().int().min(-1).max(4).refine((v) => v !== 0, "Week cannot be 0"),
        dayOfWeek: z.number().int().min(0).max(6),
      }),
    ])
    .nullable()
    .optional()
    .default(null),
  startDate: z.string().date("Must be a valid date"),
  endDate: z.string().date().nullable().optional().default(null),
  tagIds: z.array(z.string().uuid()).optional().default([]),
});

export const toggleRecurringCompletionSchema = z.object({
  recurringTaskId: z.string().uuid(),
  date: z.string().date("Must be a valid date"),
});

export const fetchRecurringCompletionsSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
});

export const projectStatusSchema = z.enum([
  "planning",
  "active",
  "blocked",
  "on-hold",
  "done",
  "archived",
]);

export const issueStatusSchema = z.enum(["open", "resolved"]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  goal: z.string().trim().max(2000).optional().default(""),
  status: projectStatusSchema.optional().default("planning"),
  startDate: z.string().date().nullable().optional().default(null),
  targetDate: z.string().date().nullable().optional().default(null),
});

export const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Project name is required").max(200),
  description: z.string().trim().max(2000),
  goal: z.string().trim().max(2000),
  status: projectStatusSchema,
  startDate: z.string().date().nullable(),
  targetDate: z.string().date().nullable(),
});

export const deleteProjectSchema = z.object({
  id: z.string().uuid(),
});

export const createSubWorkflowSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
});

export const deleteSubWorkflowSchema = z.object({
  id: z.string().uuid(),
});

export const createProjectTaskSchema = z.object({
  projectId: z.string().uuid(),
  workflowId: z.string().uuid().nullable(),
  text: z.string().trim().min(1, "Task title is required").max(500),
});

export const createIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, "Issue title is required").max(500),
  description: z.string().trim().max(5000).optional().default(""),
});

export const updateIssueStatusSchema = z.object({
  id: z.string().uuid(),
  status: issueStatusSchema,
});

export const createProjectNoteSchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(1, "Note cannot be empty").max(10000),
});

export const deleteProjectNoteSchema = z.object({
  id: z.string().uuid(),
});

export type CreateRecurringTaskInput = z.infer<typeof createRecurringTaskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
