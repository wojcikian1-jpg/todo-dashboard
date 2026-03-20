-- ============================================================
-- Recurring Tasks: periodic tasks tracked on a calendar
-- ============================================================

-- Recurring task definitions
CREATE TABLE public.recurring_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  frequency_type text NOT NULL
    CHECK (frequency_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'monthly-pattern')),
  frequency_config jsonb,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT chk_recurring_title_not_empty CHECK (length(trim(title)) > 0)
);

CREATE INDEX idx_recurring_tasks_workspace ON public.recurring_tasks (workspace_id);

-- Completion records for individual occurrences
CREATE TABLE public.recurring_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_task_id uuid REFERENCES public.recurring_tasks(id) ON DELETE CASCADE NOT NULL,
  completed_date date NOT NULL,

  CONSTRAINT uq_completion UNIQUE (recurring_task_id, completed_date)
);

CREATE INDEX idx_recurring_completions_task ON public.recurring_completions (recurring_task_id);
CREATE INDEX idx_recurring_completions_date ON public.recurring_completions (completed_date);
