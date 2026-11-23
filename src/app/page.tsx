import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { Landing } from "@/components/landing/landing";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));
  return <Landing />;
}
