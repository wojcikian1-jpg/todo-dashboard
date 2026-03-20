import { getTasks, getTags } from "@/lib/queries";
import { KanbanBoard } from "@/components/kanban-board";

export default async function DashboardPage() {
  let tasks: Awaited<ReturnType<typeof getTasks>> = [];
  let tags: Awaited<ReturnType<typeof getTags>> = [];
  try {
    [tasks, tags] = await Promise.all([getTasks(), getTags()]);
  } catch {
    // Fall back to empty board if queries fail (e.g. no auth)
  }

  return <KanbanBoard initialTasks={tasks} initialTags={tags} />;
}
