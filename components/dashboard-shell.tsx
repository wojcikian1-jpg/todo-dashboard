"use client";

import { useState } from "react";
import type { Task, Tag, RecurringTask, Project } from "@/lib/types/domain";
import { KanbanBoard } from "./kanban-board";
import { RecurringCalendar } from "./recurring-calendar";
import { ProjectsView } from "./projects-view";

interface Props {
  initialTasks: Task[];
  initialTags: Tag[];
  initialRecurringTasks: RecurringTask[];
  initialProjects: Project[];
}

type View = "board" | "recurring" | "projects";

export function DashboardShell({
  initialTasks,
  initialTags,
  initialRecurringTasks,
  initialProjects,
}: Props) {
  const [activeView, setActiveView] = useState<View>("board");

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Team Dashboard</h1>
        </div>

        {/* View Toggle */}
        <div className="mb-4 inline-flex rounded-lg bg-slate-800 p-1">
          <button
            onClick={() => setActiveView("board")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeView === "board"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setActiveView("recurring")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeView === "recurring"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Recurring
          </button>
          <button
            onClick={() => setActiveView("projects")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeView === "projects"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Projects
          </button>
        </div>

        {/* View Content */}
        {activeView === "board" && (
          <KanbanBoard initialTasks={initialTasks} initialTags={initialTags} />
        )}
        {activeView === "recurring" && (
          <RecurringCalendar
            recurringTasks={initialRecurringTasks}
            tags={initialTags}
          />
        )}
        {activeView === "projects" && (
          <ProjectsView initialProjects={initialProjects} />
        )}
      </div>
    </div>
  );
}
