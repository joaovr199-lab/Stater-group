import { requireUser } from "@/lib/auth";
import { UsersView } from "@/components/views";

export default async function Page() {
  const user = await requireUser(["stater_admin"]);
  return <UsersView user={user} />;
}
