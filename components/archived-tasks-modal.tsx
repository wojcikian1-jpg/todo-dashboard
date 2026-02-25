"use client";

import { useState, useEffect, useTransition } from "react";
import { fetchArchivedTasks, restoreTask } from "@/lib/actions";
import type { Task } from "@/lib/types/domain";

interface Props {
  onClose: () => void;
}

export function ArchivedTasksModal({ onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchArchivedTasks().then((result) => {
      if (result.success) setTasks(result.data);
      setLoading(false);
    });
  }, []);

  const filtered = tasks.filter((task) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      task.text.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q)
    );
  });

  function handleRestore(id: string) {
    startTransition(async () => {
      const result = await restoreTask(id);
      if (result.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Archived Tasks
            </h2>
            <button
              onClick={onClose}
              className="text-2xl leading-none text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archived tasks..."
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="overflow-y-auto px-6 pb-6" style={{ maxHeight: "calc(85vh - 140px)" }}>
          {loading ? (
            <p className="text-center text-sm text-slate-400">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm italic text-slate-400">
              {searchQuery
                ? "No matching archived tasks."
                : "No archived tasks yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    {task.tags.length > 0 && (
                      <div className="mb-1 flex flex-wrap gap-1">
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
                    <p className="text-sm font-medium text-slate-900">
                      {task.text}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {task.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      Archived{" "}
                      {new Date(task.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(task.id)}
                    disabled={isPending}
                    className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
