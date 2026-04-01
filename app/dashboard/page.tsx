import { getTasks, getTags, getRecurringTasks } from "@/lib/queries";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardPage() {
  let tasks: Awaited<ReturnType<typeof getTasks>> = [];
  let tags: Awaited<ReturnType<typeof getTags>> = [];
  let recurringTasks: Awaited<ReturnType<typeof getRecurringTasks>> = [];
  try {
    [tasks, tags, recurringTasks] = await Promise.all([
      getTasks(),
      getTags(),
      getRecurringTasks(),
    ]);
  } catch {
    // Fall back to empty state if queries fail (e.g. no auth)
  }

  return (
    <DashboardShell
      initialTasks={tasks}
      initialTags={tags}
      initialRecurringTasks={recurringTasks}
    />
  );
}
