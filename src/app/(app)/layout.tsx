import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { PushListener } from "@/components/layout/PushListener";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar subtitle={roleLabel(profile.role)} />
      <PageTransition>{children}</PageTransition>
      <BottomNav />
      <SplashScreen />
      <PushListener />
    </div>
  );
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
