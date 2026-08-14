import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import * as notificationService from "@/services/notificationService";

const ADMIN_ROLES = ["owner", "admin"];

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/admin/login");
  if (!ADMIN_ROLES.includes(profile.role)) redirect("/settings");

  const notifications = await notificationService.listRecentNotifications();

  return (
    <AdminShell profile={profile} initialNotifications={notifications}>
      {children}
    </AdminShell>
  );
}
