"use client";

import { useState } from "react";
import type { Contact } from "@/lib/airtable/contacts";
import { EditContactForm } from "./ContactForm";

export function ContactCard({
  contact,
  sites,
  isAdmin,
}: {
  contact: Contact;
  sites: { id: string; nom: string }[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditContactForm contact={contact} sites={sites} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{contact.nom}</p>
          <p className="text-sm text-slate-500">
            {[contact.fonction, contact.organisation].filter(Boolean).join(" · ")}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing(true)} className="text-xs text-slate-500 underline hover:text-slate-900">
            Modifier
          </button>
        )}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="block text-blue-700 hover:underline">
            {contact.email}
          </a>
        )}
        {contact.telephone && (
          <a href={`tel:${contact.telephone}`} className="block text-blue-700 hover:underline">
            {contact.telephone}
          </a>
        )}
      </div>
    </div>
  );
}
