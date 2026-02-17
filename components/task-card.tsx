"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Task } from "@/lib/types/domain";

interface Props {
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate + "T00:00:00") < today;
}

function formatDueDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TaskCard({
  task,
  isDragging,
  isOverlay,
  onClick,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: task.id,
  });

  const firstTagColor = task.tags[0]?.color;
  const overdue = isOverdue(task);
  const completedSubtasks = task.subtasks.filter((s) => s.status === "completed").length;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      onClick={isOverlay ? undefined : onClick}
      className={`group cursor-grab rounded-lg bg-slate-700 p-3 shadow transition-all hover:bg-slate-600/80 ${
        isDragging ? "opacity-30" : ""
      } ${isOverlay ? "rotate-2 shadow-xl" : ""} ${
        overdue ? "ring-1 ring-red-500/50" : ""
      }`}
      style={
        firstTagColor
          ? { borderLeft: `4px solid ${firstTagColor}` }
          : undefined
      }
    >
      {/* Tags + Priority */}
      {(task.tags.length > 0 || task.priority === "high") && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {task.priority === "high" && (
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
              HIGH
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-white">{task.text}</p>

      {/* Description preview */}
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
          {task.description}
        </p>
      )}

      {/* Metadata row */}
      {(task.dueDate || task.subtasks.length > 0 || task.notes.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
          {task.dueDate && (
            <span className={overdue ? "font-medium text-red-400" : ""}>
              {formatDueDate(task.dueDate)}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span>
              {completedSubtasks}/{task.subtasks.length} subtasks
            </span>
          )}
          {task.notes.length > 0 && (
            <span>
              {task.notes.length} note{task.notes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Action buttons (visible on hover) */}
      {!isOverlay && (
        <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-xs text-slate-400 hover:bg-red-600/30 hover:text-red-400"
            title="Delete"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
