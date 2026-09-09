const COLORS: Record<string, string> = {
  // Statuts de tâche
  "À faire": "bg-slate-100 text-slate-700",
  "En cours": "bg-blue-100 text-blue-700",
  "Mise en attente": "bg-amber-100 text-amber-800",
  "Terminé": "bg-emerald-100 text-emerald-700",
  "Annulée": "bg-slate-100 text-slate-500 line-through",
  // Priorités
  "Urgente": "bg-red-100 text-red-700",
  "Haute": "bg-orange-100 text-orange-700",
  "Normale": "bg-blue-100 text-blue-700",
  "Basse": "bg-slate-100 text-slate-600",
  // Statuts génériques (demandes, entrées à valider)
  "En attente": "bg-amber-100 text-amber-800",
  "Acceptée": "bg-emerald-100 text-emerald-700",
  "Refusée": "bg-red-100 text-red-700",
  "À valider": "bg-amber-100 text-amber-800",
  "Validée": "bg-emerald-100 text-emerald-700",
  "Rejetée": "bg-red-100 text-red-700",
};

export function StatusBadge({ value }: { value: string }) {
  const classes = COLORS[value] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {value || "—"}
    </span>
  );
}
