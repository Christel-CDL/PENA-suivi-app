import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  // Deuxième barrière, côté serveur, en plus du middleware : celle-ci relit
  // Airtable (rôle, sites, statut Actif/Suspendu) au lieu de se fier au cookie.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
