import { getTasks, getTags, getWorkspaces } from "@/lib/queries";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { KanbanBoard } from "@/components/kanban-board";

export default async function DashboardPage() {
  const [tasks, tags, workspaces, activeWorkspaceId] = await Promise.all([
    getTasks(),
    getTags(),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);

  return (
    <KanbanBoard
      initialTasks={tasks}
      initialTags={tags}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
    />
  );
}
