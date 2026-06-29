"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  Project,
  ProjectStatus,
  Issue,
  ProjectNote,
  ProjectTask,
  TaskStatus,
} from "@/lib/types/domain";
import {
  createProject,
  updateProject,
  deleteProject,
  createSubWorkflow,
  deleteSubWorkflow,
  createProjectTask,
  updateTaskStatus,
  deleteTask,
  createIssue,
  updateIssueStatus,
  createProjectNote,
  deleteProjectNote,
} from "@/lib/actions";

interface Props {
  initialProjects: Project[];
}

type InnerTab = "overview" | "tasks" | "issues" | "notes";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  blocked: "Blocked",
  "on-hold": "On Hold",
  done: "Done",
  archived: "Archived",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: "bg-slate-700 text-slate-200",
  active: "bg-blue-700 text-blue-100",
  blocked: "bg-red-700 text-red-100",
  "on-hold": "bg-amber-700 text-amber-100",
  done: "bg-emerald-700 text-emerald-100",
  archived: "bg-slate-800 text-slate-400",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "at-risk": "Waiting on Other Team(s)",
  completed: "Completed",
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  "not-started": "bg-slate-700 text-slate-300",
  "in-progress": "bg-blue-700 text-blue-100",
  "at-risk": "bg-amber-700 text-amber-100",
  completed: "bg-emerald-700 text-emerald-100",
};

const TASK_STATUS_ORDER: TaskStatus[] = [
  "not-started",
  "in-progress",
  "at-risk",
  "completed",
];

export function ProjectsView({ initialProjects }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProjects[0]?.id ?? null
  );
  const [innerTab, setInnerTab] = useState<InnerTab>("overview");

  const selected = initialProjects.find((p) => p.id === selectedId) ?? null;

  const refresh = () => startTransition(() => router.refresh());

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
        {/* Left rail: project list */}
        <div className="rounded-lg bg-slate-800/50 p-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="mb-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            + New Project
          </button>
          {initialProjects.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-400">
              No projects yet. Create one to track a larger initiative.
            </p>
          ) : (
            <ul className="space-y-1">
              {initialProjects.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      setSelectedId(p.id);
                      setInnerTab("overview");
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                      selectedId === p.id
                        ? "bg-slate-700"
                        : "hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {p.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status]}`}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      <span>{p.taskCount} tasks</span>
                      {p.openIssueCount > 0 && (
                        <span className="text-red-400">
                          {p.openIssueCount} open issue
                          {p.openIssueCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right pane: selected project detail */}
        <div className="rounded-lg bg-slate-800/50 p-4">
          {!selected ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              Select a project, or create a new one to get started.
            </div>
          ) : (
            <ProjectDetail
              project={selected}
              activeTab={innerTab}
              onTabChange={setInnerTab}
              onChange={refresh}
            />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onCreated={refresh}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────

function ProjectDetail({
  project,
  activeTab,
  onTabChange,
  onChange,
}: {
  project: Project;
  activeTab: InnerTab;
  onTabChange: (t: InnerTab) => void;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">{project.name}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}
            >
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          {project.targetDate && (
            <div className="mt-1 text-xs text-slate-400">
              Target: {project.targetDate}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              if (
                !confirm(
                  `Delete project "${project.name}"? Tasks linked to it will be unlinked but not deleted.`
                )
              )
                return;
              const res = await deleteProject({ id: project.id });
              if (res.success) onChange();
              else alert(res.error);
            }}
            className="rounded-md bg-red-700/60 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Inner tabs */}
      <div className="mb-4 inline-flex rounded-md bg-slate-900 p-1">
        {(["overview", "tasks", "issues", "notes"] as InnerTab[]).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
              activeTab === t
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab project={project} />}
      {activeTab === "tasks" && (
        <TasksTab project={project} onChange={onChange} />
      )}
      {activeTab === "issues" && (
        <IssuesTab project={project} onChange={onChange} />
      )}
      {activeTab === "notes" && (
        <NotesTab project={project} onChange={onChange} />
      )}

      {editing && (
        <EditProjectModal
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="space-y-4">
      {project.goal && (
        <Section title="Goal">
          <p className="whitespace-pre-wrap text-sm text-slate-200">
            {project.goal}
          </p>
        </Section>
      )}
      {project.description && (
        <Section title="Description">
          <p className="whitespace-pre-wrap text-sm text-slate-300">
            {project.description}
          </p>
        </Section>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tasks" value={project.taskCount} />
        <Stat label="Workflows" value={project.workflows.length} />
        <Stat
          label="Open Issues"
          value={project.openIssueCount}
          accent={project.openIssueCount > 0 ? "red" : undefined}
        />
        <Stat label="Notes" value={project.notes.length} />
      </div>
      {(project.startDate || project.targetDate) && (
        <Section title="Timeline">
          <div className="flex gap-6 text-sm text-slate-300">
            {project.startDate && (
              <div>
                <span className="text-slate-500">Start:</span>{" "}
                {project.startDate}
              </div>
            )}
            {project.targetDate && (
              <div>
                <span className="text-slate-500">Target:</span>{" "}
                {project.targetDate}
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function TasksTab({
  project,
  onChange,
}: {
  project: Project;
  onChange: () => void;
}) {
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);

  const addWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;
    setSubmittingWorkflow(true);
    const res = await createSubWorkflow({
      projectId: project.id,
      name: newWorkflowName.trim(),
    });
    setSubmittingWorkflow(false);
    if (res.success) {
      setNewWorkflowName("");
      onChange();
    } else {
      alert(res.error);
    }
  };

  // Group tasks by workflow id (null = unassigned)
  const tasksByWorkflow = new Map<string | null, ProjectTask[]>();
  for (const t of project.tasks) {
    const arr = tasksByWorkflow.get(t.workflowId) ?? [];
    arr.push(t);
    tasksByWorkflow.set(t.workflowId, arr);
  }

  const unassigned = tasksByWorkflow.get(null) ?? [];

  return (
    <div className="space-y-4">
      <TaskGroup
        title="Unassigned"
        subtitle="Tasks in this project not yet assigned to a workflow"
        projectId={project.id}
        workflowId={null}
        tasks={unassigned}
        onChange={onChange}
      />

      {project.workflows.map((w) => (
        <TaskGroup
          key={w.id}
          title={w.name}
          projectId={project.id}
          workflowId={w.id}
          tasks={tasksByWorkflow.get(w.id) ?? []}
          onChange={onChange}
          onDeleteWorkflow={async () => {
            if (
              !confirm(
                `Delete workflow "${w.name}"? Tasks inside will become unassigned.`
              )
            )
              return;
            const res = await deleteSubWorkflow({ id: w.id });
            if (res.success) onChange();
            else alert(res.error);
          }}
        />
      ))}

      {/* Add workflow */}
      <Section title="Add Workflow">
        <form onSubmit={addWorkflow} className="flex gap-2">
          <input
            type="text"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            placeholder="Workflow name (e.g., Backend, Design)"
            className="flex-1 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={submittingWorkflow || !newWorkflowName.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </Section>
    </div>
  );
}

function TaskGroup({
  title,
  subtitle,
  projectId,
  workflowId,
  tasks,
  onChange,
  onDeleteWorkflow,
}: {
  title: string;
  subtitle?: string;
  projectId: string;
  workflowId: string | null;
  tasks: ProjectTask[];
  onChange: () => void;
  onDeleteWorkflow?: () => void;
}) {
  const [newTaskText, setNewTaskText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setSubmitting(true);
    const res = await createProjectTask({
      projectId,
      workflowId,
      text: newTaskText.trim(),
    });
    setSubmitting(false);
    if (res.success) {
      setNewTaskText("");
      onChange();
    } else {
      alert(res.error);
    }
  };

  // Hide empty Unassigned group
  if (workflowId === null && tasks.length === 0) return null;

  const sorted = [...tasks].sort(
    (a, b) =>
      TASK_STATUS_ORDER.indexOf(a.status) - TASK_STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="rounded-lg bg-slate-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {title}{" "}
            <span className="ml-1 text-xs font-normal text-slate-500">
              ({tasks.length})
            </span>
          </h3>
          {subtitle && tasks.length > 0 && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {onDeleteWorkflow && (
          <button
            onClick={onDeleteWorkflow}
            className="text-xs text-slate-500 hover:text-red-400"
          >
            Delete workflow
          </button>
        )}
      </div>

      {sorted.length > 0 && (
        <ul className="mb-2 space-y-1">
          {sorted.map((t) => (
            <TaskRow key={t.id} task={t} onChange={onChange} />
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="+ Add a task..."
          className="flex-1 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={submitting || !newTaskText.trim()}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}

function TaskRow({
  task,
  onChange,
}: {
  task: ProjectTask;
  onChange: () => void;
}) {
  const [updating, setUpdating] = useState(false);

  const cycleStatus = async () => {
    const idx = TASK_STATUS_ORDER.indexOf(task.status);
    const next = TASK_STATUS_ORDER[(idx + 1) % TASK_STATUS_ORDER.length];
    setUpdating(true);
    const res = await updateTaskStatus({ id: task.id, status: next });
    setUpdating(false);
    if (res.success) onChange();
    else alert(res.error);
  };

  return (
    <li className="flex items-center gap-2 rounded-md bg-slate-900/60 px-3 py-2">
      <button
        onClick={cycleStatus}
        disabled={updating}
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${TASK_STATUS_COLORS[task.status]}`}
        title="Click to cycle status"
      >
        {TASK_STATUS_LABELS[task.status]}
      </button>
      <span
        className={`flex-1 text-sm ${
          task.status === "completed"
            ? "text-slate-500 line-through"
            : "text-slate-200"
        }`}
      >
        {task.text}
      </span>
      {task.dueDate && (
        <span className="shrink-0 text-[10px] text-slate-500">
          {task.dueDate}
        </span>
      )}
      <button
        onClick={async () => {
          if (!confirm(`Delete task "${task.text}"?`)) return;
          const res = await deleteTask(task.id);
          if (res.success) onChange();
          else alert(res.error);
        }}
        className="shrink-0 text-xs text-slate-600 hover:text-red-400"
      >
        ✕
      </button>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────

function IssuesTab({
  project,
  onChange,
}: {
  project: Project;
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    const res = await createIssue({
      projectId: project.id,
      title: title.trim(),
      description: description.trim(),
    });
    setSubmitting(false);
    if (res.success) {
      setTitle("");
      setDescription("");
      onChange();
    } else {
      alert(res.error);
    }
  };

  const open = project.issues.filter((i) => i.status === "open");
  const resolved = project.issues.filter((i) => i.status === "resolved");

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="space-y-2 rounded-md bg-slate-900/40 p-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title"
          className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Log Issue
        </button>
      </form>

      <Section title={`Open (${open.length})`}>
        {open.length === 0 ? (
          <p className="text-sm text-slate-400">No open issues.</p>
        ) : (
          <ul className="space-y-2">
            {open.map((i) => (
              <IssueRow key={i.id} issue={i} onChange={onChange} />
            ))}
          </ul>
        )}
      </Section>
      {resolved.length > 0 && (
        <Section title={`Resolved (${resolved.length})`}>
          <ul className="space-y-2">
            {resolved.map((i) => (
              <IssueRow key={i.id} issue={i} onChange={onChange} />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onChange,
}: {
  issue: Issue;
  onChange: () => void;
}) {
  return (
    <li className="rounded-md bg-slate-900/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white">{issue.title}</div>
          {issue.description && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">
              {issue.description}
            </p>
          )}
          <div className="mt-1 text-[10px] text-slate-500">
            Opened {new Date(issue.openedAt).toLocaleDateString()}
            {issue.resolvedAt &&
              ` • Resolved ${new Date(issue.resolvedAt).toLocaleDateString()}`}
          </div>
        </div>
        <button
          onClick={async () => {
            const res = await updateIssueStatus({
              id: issue.id,
              status: issue.status === "open" ? "resolved" : "open",
            });
            if (res.success) onChange();
            else alert(res.error);
          }}
          className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${
            issue.status === "open"
              ? "bg-emerald-700 text-emerald-100 hover:bg-emerald-600"
              : "bg-slate-700 text-slate-200 hover:bg-slate-600"
          }`}
        >
          {issue.status === "open" ? "Resolve" : "Reopen"}
        </button>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────

function NotesTab({
  project,
  onChange,
}: {
  project: Project;
  onChange: () => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await createProjectNote({
      projectId: project.id,
      body: body.trim(),
    });
    setSubmitting(false);
    if (res.success) {
      setBody("");
      onChange();
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="space-y-2 rounded-md bg-slate-900/40 p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Status update, decision, or note..."
          rows={3}
          className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Add Note
        </button>
      </form>

      {project.notes.length === 0 ? (
        <p className="text-sm text-slate-400">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {project.notes.map((n) => (
            <NoteRow key={n.id} note={n} onChange={onChange} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteRow({
  note,
  onChange,
}: {
  note: ProjectNote;
  onChange: () => void;
}) {
  return (
    <li className="rounded-md bg-slate-900/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm text-slate-200">
            {note.body}
          </p>
          <div className="mt-1 text-[10px] text-slate-500">
            {new Date(note.createdAt).toLocaleString()}
          </div>
        </div>
        <button
          onClick={async () => {
            if (!confirm("Delete this note?")) return;
            const res = await deleteProjectNote({ id: note.id });
            if (res.success) onChange();
            else alert(res.error);
          }}
          className="shrink-0 text-xs text-slate-500 hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "red";
}) {
  return (
    <div className="rounded-md bg-slate-900/60 p-3">
      <div
        className={`text-2xl font-bold ${
          accent === "red" ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function AddProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await createProject({
      name: name.trim(),
      description: description.trim(),
      goal: goal.trim(),
      status,
      startDate: startDate || null,
      targetDate: targetDate || null,
    });
    setSubmitting(false);
    if (res.success) {
      onCreated();
      onClose();
    } else {
      alert(res.error);
    }
  };

  return (
    <ModalShell onClose={onClose} title="New Project">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name (required)">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
          />
        </Field>
        <Field label="Goal / desired outcome">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            >
              {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            />
          </Field>
          <Field label="Target date">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [goal, setGoal] = useState(project.goal);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [targetDate, setTargetDate] = useState(project.targetDate ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await updateProject({
      id: project.id,
      name: name.trim(),
      description: description.trim(),
      goal: goal.trim(),
      status,
      startDate: startDate || null,
      targetDate: targetDate || null,
    });
    setSubmitting(false);
    if (res.success) onSaved();
    else alert(res.error);
  };

  return (
    <ModalShell onClose={onClose} title="Edit Project">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
          />
        </Field>
        <Field label="Goal">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            >
              {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            />
          </Field>
          <Field label="Target date">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-blue-500"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-slate-800 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
