import { getCurrentUser } from "@/lib/auth/session";
import { loadDossier } from "@/lib/data/dossier";
import { filterDossierBySite } from "@/lib/site-filter";
import { SiteFilterTabs } from "@/components/SiteFilterTabs";
import { isAdmin } from "@/lib/auth/rbac";
import { ContactCard } from "./ContactCard";
import { NewContactForm } from "./ContactForm";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { site } = await searchParams;
  const fullDossier = await loadDossier(user);
  const dossier = filterDossierBySite(fullDossier, site);
  const admin = isAdmin(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Contacts</h1>
        <SiteFilterTabs sites={fullDossier.sites} />
      </div>

      {admin && <NewContactForm sites={dossier.sites} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dossier.contacts.length === 0 && <p className="text-sm text-slate-500">Aucun contact dans ce périmètre.</p>}
        {dossier.contacts.map((c) => (
          <ContactCard key={c.id} contact={c} sites={dossier.sites} isAdmin={admin} />
        ))}
      </div>
    </div>
  );
}
