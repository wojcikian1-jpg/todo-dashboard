"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  switchWorkspace,
  createWorkspace,
} from "@/lib/workspace-actions";
import type { Workspace } from "@/lib/types/domain";

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId }: Props) {
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSwitch(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await switchWorkspace(workspaceId);
      setOpen(false);
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      await createWorkspace({ name: newName.trim() });
      setNewName("");
      setShowCreateForm(false);
      setOpen(false);
    });
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600 disabled:opacity-50"
      >
        {activeWorkspace?.name ?? "Workspace"} &#9662;
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-slate-600 bg-slate-800 p-2 shadow-xl">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSwitch(ws.id)}
              disabled={isPending}
              className={`block w-full rounded px-3 py-2 text-left text-sm ${
                ws.id === activeWorkspaceId
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              {ws.name}
              {ws.role === "owner" && (
                <span className="ml-2 text-xs text-slate-500">owner</span>
              )}
            </button>
          ))}

          <hr className="my-1 border-slate-700" />

          {showCreateForm ? (
            <form onSubmit={handleCreate} className="flex gap-1 p-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workspace name"
                className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={isPending || !newName.trim()}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
              >
                Create
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="block w-full rounded px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700"
            >
              + New Workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
