import { requireUser } from "@/lib/auth";
import { LeadDetail } from "@/components/LeadDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["broker"]);
  const { id } = await params;
  return <LeadDetail user={user} id={id} base="/corretor" />;
}
