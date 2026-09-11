"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function SiteFilterTabs({ sites }: { sites: { id: string; nom: string }[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("site") ?? "all";

  function hrefFor(siteId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (siteId === "all") params.delete("site");
    else params.set("site", siteId);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  if (sites.length <= 1) return null;

  const tabs = [{ id: "all", nom: "Tous les sites" }, ...sites];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={hrefFor(tab.id)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            current === tab.id
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          {tab.nom}
        </Link>
      ))}
    </div>
  );
}
