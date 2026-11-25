import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["agency_manager"]);
  if (user.must_change_password) redirect("/conta/senha");
  return <Shell user={user}>{children}</Shell>;
}
