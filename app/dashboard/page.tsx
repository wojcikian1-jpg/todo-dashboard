import { getTasks, getTags, getRecurringTasks, getProjects } from "@/lib/queries";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardPage() {
  let tasks: Awaited<ReturnType<typeof getTasks>> = [];
  let tags: Awaited<ReturnType<typeof getTags>> = [];
  let recurringTasks: Awaited<ReturnType<typeof getRecurringTasks>> = [];
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  try {
    [tasks, tags, recurringTasks, projects] = await Promise.all([
      getTasks(),
      getTags(),
      getRecurringTasks(),
      getProjects(),
    ]);
  } catch {
    // Fall back to empty state if queries fail (e.g. no auth)
  }

  return (
    <DashboardShell
      initialTasks={tasks}
      initialTags={tags}
      initialRecurringTasks={recurringTasks}
      initialProjects={projects}
    />
  );
}
