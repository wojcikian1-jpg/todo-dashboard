"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchRecurringCompletions } from "@/lib/actions";
import {
  getCalendarDays,
  getOccurrencesForMonth,
  getOccurrenceStatus,
} from "@/lib/recurring-utils";
import type { RecurringTask, RecurringCompletion } from "@/lib/types/domain";
import { AddRecurringTaskModal } from "./add-recurring-task-modal";
import { DayDetailPanel } from "./day-detail-panel";

interface Props {
  recurringTasks: RecurringTask[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RecurringCalendar({ recurringTasks }: Props) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [completions, setCompletions] = useState<RecurringCompletion[]>([]);

  const todayStr = toDateStr(now);

  const loadCompletions = useCallback(async () => {
    const result = await fetchRecurringCompletions({
      month: currentMonth,
      year: currentYear,
    });
    if (result.success) {
      setCompletions(result.data);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadCompletions();
  }, [loadCompletions]);

  // Build completion lookup: Set of "taskId:date"
  const completionSet = new Set(
    completions.map((c) => `${c.recurringTaskId}:${c.completedDate}`)
  );

  // Compute occurrences per date for the visible month
  const occurrenceMap = new Map<string, RecurringTask[]>();
  for (const task of recurringTasks) {
    const dates = getOccurrencesForMonth(task, currentYear, currentMonth);
    for (const d of dates) {
      const existing = occurrenceMap.get(d) ?? [];
      existing.push(task);
      occurrenceMap.set(d, existing);
    }
  }

  const calendarDays = getCalendarDays(currentYear, currentMonth);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  }

  const statusDotColor = {
    completed: "bg-green-500",
    overdue: "bg-red-500",
    pending: "bg-yellow-500",
    future: "bg-slate-500",
  };

  // Tasks for the selected date
  const selectedDateTasks = selectedDate
    ? occurrenceMap.get(selectedDate) ?? []
    : [];

  return (
    <div>
      {/* Top Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Add Recurring Task
        </button>
      </div>

      {/* Calendar */}
      <div className="rounded-xl bg-slate-800/60 p-4">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
            >
              &larr;
            </button>
            <button
              onClick={nextMonth}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
            >
              &rarr;
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-xs font-semibold text-slate-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const tasks = occurrenceMap.get(day.date) ?? [];
            const isToday = day.date === todayStr;
            const isSelected = day.date === selectedDate;

            return (
              <button
                key={day.date}
                onClick={() =>
                  setSelectedDate(isSelected ? null : day.date)
                }
                className={`flex min-h-[60px] flex-col items-center rounded-lg p-1 transition-colors ${
                  !day.isCurrentMonth
                    ? "opacity-30"
                    : isSelected
                      ? "bg-blue-600/30 ring-1 ring-blue-500"
                      : "hover:bg-slate-700/50"
                } ${isToday ? "ring-1 ring-blue-400" : ""}`}
              >
                <span
                  className={`text-xs ${
                    isToday
                      ? "font-bold text-blue-400"
                      : day.isCurrentMonth
                        ? "text-slate-300"
                        : "text-slate-600"
                  }`}
                >
                  {parseInt(day.date.split("-")[2], 10)}
                </span>

                {/* Task dots */}
                {tasks.length > 0 && (
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                    {tasks.slice(0, 4).map((task) => {
                      const completed = completionSet.has(
                        `${task.id}:${day.date}`
                      );
                      const status = getOccurrenceStatus(
                        day.date,
                        completed ? new Set([day.date]) : new Set()
                      );
                      return (
                        <span
                          key={task.id}
                          className={`h-1.5 w-1.5 rounded-full ${statusDotColor[status]}`}
                        />
                      );
                    })}
                    {tasks.length > 4 && (
                      <span className="text-[8px] text-slate-400">
                        +{tasks.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          tasks={selectedDateTasks}
          completionSet={completionSet}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Overdue
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Due Today
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-500" /> Upcoming
        </span>
      </div>

      {/* Add Recurring Task Modal */}
      {showAddModal && (
        <AddRecurringTaskModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
