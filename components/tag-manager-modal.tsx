"use client";

import { useState, useTransition } from "react";
import { createTag, deleteTag } from "@/lib/actions";
import type { Tag, Task } from "@/lib/types/domain";

interface Props {
  tags: Tag[];
  tasks: Task[];
  onClose: () => void;
}

export function TagManagerModal({ tags, tasks, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4a90d9");

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      await createTag({ name: name.trim(), color });
      setName("");
    });
  }

  function handleDeleteTag(tagId: string) {
    startTransition(async () => {
      await deleteTag(tagId);
    });
  }

  function getTagTaskCount(tagId: string): number {
    return tasks.filter((t) => t.tags.some((tag) => tag.id === tagId)).length;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Manage Tags</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        {/* Add tag form */}
        <form onSubmit={handleAddTag} className="mb-4 flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-slate-300"
          />
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {/* Tag list */}
        {tags.length === 0 ? (
          <p className="text-center text-sm italic text-slate-400">
            No tags yet. Create one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => {
              const count = getTagTaskCount(tag.id);
              return (
                <li
                  key={tag.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {tag.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {count} task{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    disabled={isPending}
                    className="text-lg text-slate-400 hover:text-red-500 disabled:opacity-50"
                  >
                    &times;
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
