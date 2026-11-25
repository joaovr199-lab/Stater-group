import { requireUser } from "@/lib/auth";
import { LinksView } from "@/components/views";

export default async function Page() {
  const user = await requireUser(["agency_manager"]);
  return <LinksView user={user} />;
}
