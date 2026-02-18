"use client";

import { useState, useTransition } from "react";
import { generateInviteLink } from "@/lib/workspace-actions";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export function InviteModal({ workspaceId, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateInviteLink({ workspaceId });
      if (result.success) {
        const url = `${window.location.origin}/invite/${result.data.token}`;
        setInviteUrl(url);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Invite Team Members
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Generate an invite link to share with your team. Anyone with the link
          can join this workspace and edit tasks.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {inviteUrl ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
              <button
                onClick={handleCopy}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              This link expires in 7 days.
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Generating..." : "Generate Invite Link"}
          </button>
        )}
      </div>
    </div>
  );
}
