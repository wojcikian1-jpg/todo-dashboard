-- Add tag_ids column to recurring_tasks
ALTER TABLE recurring_tasks
  ADD COLUMN tag_ids uuid[] DEFAULT '{}';
