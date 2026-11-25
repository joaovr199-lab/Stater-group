import { requireUser } from "@/lib/auth";
import { MeetingsView } from "@/components/views";

export default async function Page() {
  const user = await requireUser(["agency_manager"]);
  return <MeetingsView user={user} base="/imobiliaria" />;
}
