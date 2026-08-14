import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

const ADMIN_ROLES = ["owner", "admin"];

export default async function AdminLoginPage() {
  const profile = await getCurrentProfile();
  if (profile && ADMIN_ROLES.includes(profile.role)) redirect("/admin");

  return <AdminLoginForm />;
}
