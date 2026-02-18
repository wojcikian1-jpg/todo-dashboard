import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JoinWorkspaceClient } from "./join-client";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?invite=${token}`);
  }

  return <JoinWorkspaceClient token={token} />;
}
