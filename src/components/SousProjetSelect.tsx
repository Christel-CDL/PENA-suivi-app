export type SousProjetGroupe = { id: string; nom: string; siteNom: string };

/**
 * Liste de sous-projets regroupée par site : sans le nom du site, des
 * sous-projets homonymes ("PAC2026" / "PAC2026 (DDAE)", "Plans VRD PM" / "PE")
 * sont impossibles à distinguer d'un coup d'œil.
 */
export function SousProjetSelect({
  name,
  sousProjets,
  required = true,
  className = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm",
}: {
  name: string;
  sousProjets: SousProjetGroupe[];
  required?: boolean;
  className?: string;
}) {
  const parSite = new Map<string, SousProjetGroupe[]>();
  for (const sp of sousProjets) {
    if (!parSite.has(sp.siteNom)) parSite.set(sp.siteNom, []);
    parSite.get(sp.siteNom)!.push(sp);
  }
  const sites = [...parSite.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <select name={name} required={required} defaultValue="" className={className}>
      <option value="" disabled>
        Choisir un sous-projet…
      </option>
      {sites.map((siteNom) => (
        <optgroup key={siteNom} label={siteNom}>
          {parSite
            .get(siteNom)!
            .sort((a, b) => a.nom.localeCompare(b.nom))
            .map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.nom}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
