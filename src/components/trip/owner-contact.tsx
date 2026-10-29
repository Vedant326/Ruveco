"use client";

import { Building2, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { fmtPhone } from "@/lib/format";
import type { Trip } from "@/lib/types";

type Contact = { companyName: string; ownerName: string; ownerPhone: string };

/**
 * The trip owner's company, name and phone (with a call button), for the driver. Comes through the
 * server, since drivers cannot read the owner's account. Shows the company from the trip until loaded.
 */
export function OwnerContact({ trip }: { trip: Trip }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    api<Contact>(`/api/trips/${trip.id}/owner`)
      .then((res) => live && setContact(res))
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [trip.id]);

  const company = contact?.companyName || trip.companyName;
  return (
    <div className="space-y-3">
      {company && (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Company</p>
            <p className="truncate text-sm font-bold text-ink">{company}</p>
          </div>
        </div>
      )}
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" /> Loading owner details…
        </p>
      ) : (
        contact?.ownerName && (
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">Owner</p>
              <p className="truncate text-sm font-bold text-ink">{contact.ownerName}</p>
              {contact.ownerPhone && <p className="text-sm text-muted">{fmtPhone(contact.ownerPhone)}</p>}
            </div>
            {contact.ownerPhone && (
              <a
                href={`tel:+91${contact.ownerPhone}`}
                aria-label={`Call ${contact.ownerName}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"
              >
                <Phone className="h-5 w-5" />
              </a>
            )}
          </div>
        )
      )}
    </div>
  );
}
