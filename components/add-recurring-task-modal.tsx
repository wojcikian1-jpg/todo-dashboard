"use client";

import { useState, useTransition } from "react";
import { createRecurringTask } from "@/lib/actions";
import type { Tag, RecurringFrequencyType, FrequencyConfig } from "@/lib/types/domain";

interface Props {
  tags: Tag[];
  onClose: () => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const OCCURRENCE_OPTIONS = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
  { value: -1, label: "Last" },
];

export function AddRecurringTaskModal({ tags, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [frequencyType, setFrequencyType] =
    useState<RecurringFrequencyType>("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noEndDate, setNoEndDate] = useState(true);
  const [tagIds, setTagIds] = useState<string[]>([]);

  // Weekly/biweekly config
  const [dayOfWeek, setDayOfWeek] = useState(0);
  // Monthly config
  const [dayOfMonth, setDayOfMonth] = useState(1);
  // Monthly-pattern config
  const [patternWeek, setPatternWeek] = useState(1);
  const [patternDayOfWeek, setPatternDayOfWeek] = useState(0);

  // Update dayOfWeek when start date changes (for weekly/biweekly default)
  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (value) {
      const d = new Date(value + "T00:00:00");
      setDayOfWeek(d.getDay());
      setDayOfMonth(d.getDate());
    }
  }

  function buildFrequencyConfig(): FrequencyConfig {
    switch (frequencyType) {
      case "daily":
        return null;
      case "weekly":
      case "biweekly":
        return { dayOfWeek };
      case "monthly":
        return { dayOfMonth };
      case "monthly-pattern":
        return { week: patternWeek, dayOfWeek: patternDayOfWeek };
    }
  }

  function handleToggleTag(tagId: string) {
    setTagIds((ids) =>
      ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId]
    );
  }

  function handleSubmit() {
    if (!title.trim() || !startDate) return;
    startTransition(async () => {
      await createRecurringTask({
        title: title.trim(),
        frequencyType,
        frequencyConfig: buildFrequencyConfig(),
        startDate,
        endDate: noEndDate ? null : endDate || null,
        tagIds,
      });
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Add Recurring Task
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly team standup"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Frequency Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Frequency
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["daily", "Daily"],
                  ["weekly", "Weekly"],
                  ["biweekly", "Biweekly"],
                  ["monthly", "Monthly"],
                  ["monthly-pattern", "Custom"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    frequencyType === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="frequencyType"
                    value={value}
                    checked={frequencyType === value}
                    onChange={() => setFrequencyType(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Conditional frequency config */}
          {(frequencyType === "weekly" || frequencyType === "biweekly") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Day of Week
              </label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDayOfWeek(i)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      dayOfWeek === i
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequencyType === "monthly" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Day of Month
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                Months without this day will be skipped.
              </p>
            </div>
          )}

          {frequencyType === "monthly-pattern" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Occurrence
                </label>
                <div className="flex flex-wrap gap-2">
                  {OCCURRENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPatternWeek(opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        patternWeek === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Day
                </label>
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPatternDayOfWeek(i)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        patternDayOfWeek === i
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              End Date
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={noEndDate}
                  onChange={(e) => setNoEndDate(e.target.checked)}
                  className="rounded border-slate-300"
                />
                No end date (continues indefinitely)
              </label>
              {!noEndDate && (
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tags
            </label>
            {tags.length === 0 ? (
              <p className="text-sm italic text-slate-400">
                No tags created yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className={`cursor-pointer rounded-lg px-3 py-1 text-sm font-medium text-white transition-opacity ${
                      tagIds.includes(tag.id)
                        ? "opacity-100 ring-2 ring-white ring-offset-2"
                        : "opacity-50"
                    }`}
                    style={{ backgroundColor: tag.color }}
                  >
                    <input
                      type="checkbox"
                      checked={tagIds.includes(tag.id)}
                      onChange={() => handleToggleTag(tag.id)}
                      className="sr-only"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isPending || !title.trim() || !startDate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
