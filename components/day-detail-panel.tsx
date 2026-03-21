"use client";

import { useState, useTransition } from "react";
import {
  toggleRecurringCompletion,
  deleteRecurringTask,
} from "@/lib/actions";
import { describeFrequency, getOccurrenceStatus } from "@/lib/recurring-utils";
import type { RecurringTask } from "@/lib/types/domain";

interface Props {
  date: string; // "YYYY-MM-DD"
  tasks: RecurringTask[];
  completionSet: Set<string>; // Set of "taskId:date" strings
  onClose: () => void;
  onChanged: () => void;
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DayDetailPanel({ date, tasks, completionSet, onClose, onChanged }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Local optimistic overrides: taskId -> true/false
  const [localToggles, setLocalToggles] = useState<Record<string, boolean>>({});

  function isCompleted(taskId: string): boolean {
    if (taskId in localToggles) return localToggles[taskId];
    return completionSet.has(`${taskId}:${date}`);
  }

  function handleToggle(taskId: string) {
    setError(null);
    const wasCompleted = isCompleted(taskId);
    // Optimistic update
    setLocalToggles((prev) => ({ ...prev, [taskId]: !wasCompleted }));

    startTransition(async () => {
      const result = await toggleRecurringCompletion({
        recurringTaskId: taskId,
        date,
      });
      if (!result.success) {
        // Revert optimistic update
        setLocalToggles((prev) => ({ ...prev, [taskId]: wasCompleted }));
        setError(result.error);
      } else {
        // Clear local override, let parent data take over
        setLocalToggles((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        onChanged();
      }
    });
  }

  function handleDelete(taskId: string) {
    if (!confirm("Delete this entire recurring task series?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRecurringTask(taskId);
      if (!result.success) {
        setError(result.error);
      } else {
        onChanged();
      }
    });
  }

  const statusColorMap = {
    completed: "border-l-green-500",
    overdue: "border-l-red-500",
    pending: "border-l-yellow-500",
    future: "border-l-slate-600",
  };

  return (
    <div className="mt-4 rounded-xl bg-slate-800/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          {formatDateHeading(date)}
        </h3>
        <button
          onClick={onClose}
          className="text-lg leading-none text-slate-400 hover:text-slate-200"
        >
          &times;
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm italic text-slate-500">
          No recurring tasks on this date.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const completed = isCompleted(task.id);
            const status = getOccurrenceStatus(
              date,
              completed ? new Set([date]) : new Set()
            );
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between rounded-lg border-l-4 bg-slate-700 px-3 py-2 ${statusColorMap[status]}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={() => handleToggle(task.id)}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-600"
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        completed
                          ? "text-slate-400 line-through"
                          : "text-white"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.tags.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {task.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400">
                      {describeFrequency(task)}
                      {task.endDate && ` (until ${task.endDate})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  disabled={isPending}
                  className="rounded p-1 text-xs text-slate-400 hover:bg-red-600/30 hover:text-red-400"
                  title="Delete series"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
