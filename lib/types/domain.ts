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

export interface Subtask {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
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

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
