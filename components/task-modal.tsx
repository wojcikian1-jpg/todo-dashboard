"use client";

import { useState, useTransition } from "react";
import { updateTask } from "@/lib/actions";
import type { Task, Tag, TaskPriority } from "@/lib/types/domain";

interface Props {
  task: Task;
  tags: Tag[];
  onClose: () => void;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDueDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate + "T00:00:00") < today;
}

export function TaskModal({ task, tags, onClose }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isPending, startTransition] = useTransition();

  // View mode: note input
  const [newNote, setNewNote] = useState("");

  // Edit mode state
  const [editDescription, setEditDescription] = useState(task.description);
  const [editDueDate, setEditDueDate] = useState(task.dueDate ?? "");
  const [editPriority, setEditPriority] = useState<TaskPriority>(
    task.priority
  );
  const [editSubtasks, setEditSubtasks] = useState(
    task.subtasks.map((s) => ({ ...s }))
  );
  const [editTagIds, setEditTagIds] = useState(task.tags.map((t) => t.id));
  const [newSubtaskText, setNewSubtaskText] = useState("");

  function enterEditMode() {
    setEditDescription(task.description);
    setEditDueDate(task.dueDate ?? "");
    setEditPriority(task.priority);
    setEditSubtasks(task.subtasks.map((s) => ({ ...s })));
    setEditTagIds(task.tags.map((t) => t.id));
    setNewSubtaskText("");
    setMode("edit");
  }

  function buildPayload(
    overrides: Partial<{
      subtasks: typeof task.subtasks;
      notes: typeof task.notes;
    }> = {}
  ) {
    return {
      id: task.id,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      tagIds: task.tags.map((t) => t.id),
      subtasks: task.subtasks.map((s) => ({
        id: s.id,
        text: s.text,
        completed: s.completed,
      })),
      notes: task.notes.map((n) => ({
        id: n.id,
        text: n.text,
        createdAt: n.createdAt,
      })),
      ...overrides,
    };
  }

  // View mode actions
  function handleToggleSubtask(subtaskId: string) {
    const updated = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    startTransition(async () => {
      await updateTask(buildPayload({ subtasks: updated }));
    });
  }

  function handleAddNote() {
    const text = newNote.trim();
    if (!text) return;
    const note = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    };
    startTransition(async () => {
      await updateTask(buildPayload({ notes: [...task.notes, note] }));
      setNewNote("");
    });
  }

  function handleDeleteNote(noteId: string) {
    const updated = task.notes.filter((n) => n.id !== noteId);
    startTransition(async () => {
      await updateTask(buildPayload({ notes: updated }));
    });
  }

  // Edit mode actions
  function handleAddSubtask() {
    const text = newSubtaskText.trim();
    if (!text) return;
    setEditSubtasks([
      ...editSubtasks,
      { id: crypto.randomUUID(), text, completed: false },
    ]);
    setNewSubtaskText("");
  }

  function handleRemoveSubtask(id: string) {
    setEditSubtasks(editSubtasks.filter((s) => s.id !== id));
  }

  function handleToggleTag(tagId: string) {
    setEditTagIds((ids) =>
      ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId]
    );
  }

  function handleSave() {
    startTransition(async () => {
      await updateTask({
        id: task.id,
        description: editDescription,
        dueDate: editDueDate || null,
        priority: editPriority,
        tagIds: editTagIds,
        subtasks: editSubtasks.map((s) => ({
          id: s.id,
          text: s.text,
          completed: s.completed,
        })),
        notes: task.notes.map((n) => ({
          id: n.id,
          text: n.text,
          createdAt: n.createdAt,
        })),
      });
      setMode("view");
    });
  }

  const overdue = isOverdue(task);
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === "view" ? "Task Details" : "Edit Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        {mode === "view" ? (
          /* ===================== VIEW MODE ===================== */
          <div className="space-y-4">
            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Priority + Due Date badges */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  task.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : task.priority === "low"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {task.priority.charAt(0).toUpperCase() +
                  task.priority.slice(1)}{" "}
                Priority
              </span>
              {task.dueDate && (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    overdue
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Due: {formatDueDate(task.dueDate)}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-slate-900">
              {task.text}
            </h3>

            {/* Description */}
            <p
              className={`text-sm ${task.description ? "text-slate-700" : "italic text-slate-400"}`}
            >
              {task.description || "No description provided."}
            </p>

            {/* Subtasks */}
            {task.subtasks.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  Subtasks ({completedSubtasks}/{task.subtasks.length})
                </h4>
                <div className="space-y-1">
                  {task.subtasks.map((sub) => (
                    <label
                      key={sub.id}
                      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 ${
                        sub.completed
                          ? "text-slate-400 line-through"
                          : "text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => handleToggleSubtask(sub.id)}
                        disabled={isPending}
                        className="accent-blue-600"
                      />
                      {sub.text}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              {task.notes.length > 0 && (
                <div className="mb-3">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">
                    Notes ({task.notes.length})
                  </h4>
                  <div className="space-y-2">
                    {[...task.notes].reverse().map((note) => (
                      <div
                        key={note.id}
                        className="group/note rounded-lg bg-slate-50 p-3"
                      >
                        <p className="text-sm text-slate-700">{note.text}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {formatTimestamp(note.createdAt)}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={isPending}
                            className="text-xs text-slate-400 opacity-0 hover:text-red-500 group-hover/note:opacity-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add note */}
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={isPending || !newNote.trim()}
                  className="self-end rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-0.5 text-xs text-slate-400">
              <p>Created: {formatTimestamp(task.createdAt)}</p>
              <p>Updated: {formatTimestamp(task.updatedAt)}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={enterEditMode}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Edit Task
              </button>
            </div>
          </div>
        ) : (
          /* ===================== EDIT MODE ===================== */
          <div className="space-y-4">
            {/* Title (read-only) */}
            <p className="text-lg font-semibold text-slate-900">{task.text}</p>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                placeholder="Add a description..."
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Due Date
              </label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <div className="flex gap-2">
                {(["high", "medium", "low"] as const).map((p) => (
                  <label
                    key={p}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      editPriority === p
                        ? p === "high"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : p === "low"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-yellow-500 bg-yellow-50 text-yellow-700"
                        : "border-slate-300 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={editPriority === p}
                      onChange={() => setEditPriority(p)}
                      className="sr-only"
                    />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Subtasks
              </label>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add a subtask..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  +
                </button>
              </div>
              {editSubtasks.length > 0 && (
                <ul className="space-y-1">
                  {editSubtasks.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>{sub.text}</span>
                      <button
                        onClick={() => handleRemoveSubtask(sub.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tags
              </label>
              {tags.length === 0 ? (
                <p className="text-sm italic text-slate-400">
                  No tags created yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className={`cursor-pointer rounded-lg px-3 py-1 text-sm font-medium text-white transition-opacity ${
                        editTagIds.includes(tag.id)
                          ? "opacity-100 ring-2 ring-white ring-offset-2"
                          : "opacity-50"
                      }`}
                      style={{ backgroundColor: tag.color }}
                    >
                      <input
                        type="checkbox"
                        checked={editTagIds.includes(tag.id)}
                        onChange={() => handleToggleTag(tag.id)}
                        className="sr-only"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setMode("view")}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
