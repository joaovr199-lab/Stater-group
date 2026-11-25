import { requireUser } from "@/lib/auth";
import { ReportsView } from "@/components/views";

type P = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: P) {
  const user = await requireUser(["agency_manager"]);
  const sp = await searchParams;
  return <ReportsView user={user} sp={sp} base="/imobiliaria" />;
}
