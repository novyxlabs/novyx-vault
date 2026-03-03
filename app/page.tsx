import { isCloudMode, getUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import LandingPage from "@/components/LandingPage";

export default async function Page() {
  if (!isCloudMode()) return <AppShell />;

  const user = await getUser();
  if (!user) return <LandingPage />;

  return <AppShell />;
}
