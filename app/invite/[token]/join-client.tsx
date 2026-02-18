"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinWorkspace } from "@/lib/workspace-actions";

export function JoinWorkspaceClient({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function join() {
      const result = await joinWorkspace({ token });
      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error);
      }
    }
    join();
  }, [token, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="mb-2 text-xl font-bold text-red-600">
            Unable to Join
          </h1>
          <p className="text-slate-600">{error}</p>
          <a
            href="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-white">Joining workspace...</p>
    </div>
  );
}
