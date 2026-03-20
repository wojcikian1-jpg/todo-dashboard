"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/lib/actions";
import type { Tag, TaskPriority } from "@/lib/types/domain";

interface Props {
  tags: Tag[];
  onClose: () => void;
}

export function AddTaskModal({ tags, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [subtasks, setSubtasks] = useState<{ id: string; text: string }[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);

  function handleAddSubtask() {
    const text = newSubtaskText.trim();
    if (!text) return;
    setSubtasks([...subtasks, { id: crypto.randomUUID(), text }]);
    setNewSubtaskText("");
  }

  function handleRemoveSubtask(id: string) {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  }

  function handleToggleTag(tagId: string) {
    setTagIds((ids) =>
      ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId]
    );
  }

  function handleSubmit() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createTask({
        text: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        priority,
        tagIds,
        subtasks: subtasks.map((s) => ({
          id: s.id,
          text: s.text,
          status: "pending" as const,
        })),
      });
      onClose();
    });
  }

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
          <h2 className="text-lg font-bold text-slate-900">Add New Task</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add details..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
                    priority === p
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
                    checked={priority === p}
                    onChange={() => setPriority(p)}
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
            {subtasks.length > 0 && (
              <ul className="space-y-1">
                {subtasks.map((sub) => (
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
                      tagIds.includes(tag.id)
                        ? "opacity-100 ring-2 ring-white ring-offset-2"
                        : "opacity-50"
                    }`}
                    style={{ backgroundColor: tag.color }}
                  >
                    <input
                      type="checkbox"
                      checked={tagIds.includes(tag.id)}
                      onChange={() => handleToggleTag(tag.id)}
                      className="sr-only"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isPending || !title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create Task"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
