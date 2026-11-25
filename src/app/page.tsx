import { redirect } from "next/navigation";
import { currentUser, HOME } from "@/lib/auth";

export default async function Home() {
  const u = await currentUser();
  redirect(u ? HOME[u.role] : "/login");
}
