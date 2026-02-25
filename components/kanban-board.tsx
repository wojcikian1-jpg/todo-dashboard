"use client";

import { useState, useOptimistic, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createTask,
  updateTaskStatus as updateTaskStatusAction,
  deleteTask,
  archiveCompletedTasks,
} from "@/lib/actions";
import type { Task, Tag, TaskStatus } from "@/lib/types/domain";
import { TASK_STATUS } from "@/lib/types/domain";
import { TaskCard } from "./task-card";
import { TaskModal } from "./task-modal";
import { TagManagerModal } from "./tag-manager-modal";
import { FilterBar } from "./filter-bar";
import { ArchivedTasksModal } from "./archived-tasks-modal";

const COLUMNS = [
  { id: TASK_STATUS.NOT_STARTED, title: "Not Started" },
  { id: TASK_STATUS.IN_PROGRESS, title: "In Progress" },
  { id: TASK_STATUS.AT_RISK, title: "Waiting on Other Team(s)" },
  { id: TASK_STATUS.COMPLETED, title: "Completed" },
] as const;

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

interface Props {
  initialTasks: Task[];
  initialTags: Tag[];
}

export function KanbanBoard({ initialTasks, initialTags }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticTasks, addOptimistic] = useOptimistic(
    initialTasks,
    (tasks: Task[], update: { id: string; status: TaskStatus }) =>
      tasks.map((t) =>
        t.id === update.id ? { ...t, status: update.status } : t
      )
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Filter tasks
  const filteredTasks = optimisticTasks.filter((task) => {
    if (selectedFilterTags.length > 0) {
      if (!task.tags.some((tag) => selectedFilterTags.includes(tag.id)))
        return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !task.text.toLowerCase().includes(q) &&
        !task.description.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function getColumnTasks(status: TaskStatus) {
    return filteredTasks
      .filter((t) => t.status === status)
      .sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 1) -
          (PRIORITY_ORDER[b.priority] ?? 1)
      );
  }

  const activeTask = activeId
    ? optimisticTasks.find((t) => t.id === activeId) ?? null
    : null;

  const selectedTask = selectedTaskId
    ? optimisticTasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = optimisticTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    startTransition(async () => {
      addOptimistic({ id: taskId, status: newStatus });
      await updateTaskStatusAction({ id: taskId, status: newStatus });
    });
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startTransition(async () => {
      await createTask({
        text: newTitle.trim(),
        description: newDescription.trim(),
      });
      setNewTitle("");
      setNewDescription("");
    });
  }

  async function handleDeleteTask(id: string) {
    if (selectedTaskId === id) setSelectedTaskId(null);
    startTransition(async () => {
      await deleteTask(id);
    });
  }

  async function handleArchiveCompleted() {
    startTransition(async () => {
      await archiveCompletedTasks();
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const totalTasks = optimisticTasks.length;
  const completedCount = optimisticTasks.filter(
    (t) => t.status === "completed"
  ).length;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Team Dashboard</h1>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
          >
            Sign Out
          </button>
        </div>

        {/* Add Task Form */}
        <form onSubmit={handleAddTask} className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title..."
            className="min-w-[200px] flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)..."
            className="min-w-[200px] flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending || !newTitle.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add Task
          </button>
          <button
            type="button"
            onClick={() => setShowTagManager(true)}
            className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-600"
          >
            Manage Tags
          </button>
        </form>

        {/* Filter Bar */}
        <FilterBar
          tags={initialTags}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTags={selectedFilterTags}
          onSelectedTagsChange={setSelectedFilterTags}
        />

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => {
              const tasks = getColumnTasks(col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  count={tasks.length}
                >
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isDragging={activeId === task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      onDelete={() => handleDeleteTask(task.id)}
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                isOverlay
                onClick={() => {}}
                onDelete={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Stats Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
          <span>
            {totalTasks} total tasks
            {completedCount > 0 && ` | ${completedCount} completed`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowArchive(true)}
              className="rounded bg-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-600"
            >
              View Archive
            </button>
            <button
              onClick={handleArchiveCompleted}
              disabled={isPending || completedCount === 0}
              className="rounded bg-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
            >
              Archive Completed
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          tags={initialTags}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {showTagManager && (
        <TagManagerModal
          tags={initialTags}
          tasks={optimisticTasks}
          onClose={() => setShowTagManager(false)}
        />
      )}

      {showArchive && (
        <ArchivedTasksModal onClose={() => setShowArchive(false)} />
      )}
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`rounded-xl bg-slate-800/60 p-3 transition-colors ${
        isOver ? "bg-slate-800/80 ring-2 ring-blue-500/50" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
          {count}
        </span>
      </div>
      <div ref={setNodeRef} className="flex min-h-[100px] flex-col gap-2">
        {children}
      </div>
    </div>
  );
}
