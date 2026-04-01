export const TASK_STATUS = {
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  AT_RISK: "at-risk",
  COMPLETED: "completed",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const SUBTASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
} as const;

export type SubtaskStatus = (typeof SUBTASK_STATUS)[keyof typeof SUBTASK_STATUS];

export interface Subtask {
  readonly id: string;
  readonly text: string;
  readonly status: SubtaskStatus;
}

export interface Note {
  readonly id: string;
  readonly text: string;
  readonly createdAt: string;
}

export interface Tag {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface Task {
  readonly id: string;
  readonly text: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueDate: string | null;
  readonly tags: readonly Tag[];
  readonly subtasks: readonly Subtask[];
  readonly notes: readonly Note[];
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const RECURRING_FREQUENCY_TYPE = {
  DAILY: "daily",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  MONTHLY: "monthly",
  MONTHLY_PATTERN: "monthly-pattern",
} as const;

export type RecurringFrequencyType =
  (typeof RECURRING_FREQUENCY_TYPE)[keyof typeof RECURRING_FREQUENCY_TYPE];

export type FrequencyConfig =
  | null
  | { dayOfWeek: number }
  | { dayOfMonth: number }
  | { week: number; dayOfWeek: number };

export interface RecurringTask {
  readonly id: string;
  readonly title: string;
  readonly frequencyType: RecurringFrequencyType;
  readonly frequencyConfig: FrequencyConfig;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly tags: readonly Tag[];
  readonly createdAt: string;
}

export interface RecurringCompletion {
  readonly id: string;
  readonly recurringTaskId: string;
  readonly completedDate: string;
}

export const WORKSPACE_ROLE = {
  OWNER: "owner",
  MEMBER: "member",
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly role: WorkspaceRole;
  readonly createdAt: string;
}

export interface WorkspaceInvite {
  readonly id: string;
  readonly token: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
