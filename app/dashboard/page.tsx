import { getTasks, getTags } from "@/lib/queries";
import { KanbanBoard } from "@/components/kanban-board";

export default async function DashboardPage() {
  const [tasks, tags] = await Promise.all([getTasks(), getTags()]);

  return <KanbanBoard initialTasks={tasks} initialTags={tags} />;
}
