import { requireUser } from "@/lib/auth";
import { UsersView } from "@/components/views";

export default async function Page() {
  const user = await requireUser(["agency_manager"]);
  return <UsersView user={user} />;
}
