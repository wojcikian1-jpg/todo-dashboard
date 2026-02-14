"use client";

import { useState, useRef, useEffect } from "react";
import type { Tag } from "@/lib/types/domain";

interface Props {
  tags: Tag[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
}

export function FilterBar({
  tags,
  searchQuery,
  onSearchChange,
  selectedTags,
  onSelectedTagsChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function toggleTag(tagId: string) {
    if (selectedTags.includes(tagId)) {
      onSelectedTagsChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onSelectedTagsChange([...selectedTags, tagId]);
    }
  }

  function clearFilter() {
    onSelectedTagsChange([]);
  }

  const displayText =
    selectedTags.length === 0
      ? "All Tasks"
      : selectedTags.length === 1
        ? tags.find((t) => t.id === selectedTags[0])?.name ?? "All Tasks"
        : `${selectedTags.length} tags selected`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search tasks..."
        className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
      />

      {/* Filter dropdown */}
      <span className="text-sm text-slate-400">Filter:</span>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          {displayText}
        </button>

        {open && (
          <div className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-lg border border-slate-600 bg-slate-800 p-2 shadow-xl">
            {/* All option */}
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              <input
                type="checkbox"
                checked={selectedTags.length === 0}
                onChange={clearFilter}
                className="accent-blue-500"
              />
              All Tasks
            </label>

            {tags.map((tag) => (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="accent-blue-500"
                />
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
