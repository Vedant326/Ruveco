"use client";

import { Eye, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle, Spinner } from "@/components/ui/misc";
import { api, errorMessage } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { Trip, VehicleDocument } from "@/lib/types";

type Listed = Omit<VehicleDocument, "path">;

/**
 * The trip vehicle's documents (RC, insurance and so on), read-only, for the driver during a
 * scheduled or in-progress trip. They come through the server, since drivers cannot read the
 * owner's vehicles directly.
 */
export function VehicleDocumentsCard({ trip }: { trip: Trip }) {
  const [documents, setDocuments] = useState<Listed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api<{ documents: Listed[] }>(`/api/trips/${trip.id}/vehicle-documents`)
      .then((res) => live && setDocuments(res.documents))
      .catch((err) => live && setError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [trip.id, attempt]);

  const retry = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };

  const view = async (doc: Listed) => {
    // Opened right away (inside the tap) so the browser does not block it, then pointed at the file.
    const tab = window.open("", "_blank");
    setOpening(doc.id);
    try {
      const { url } = await api<{ url: string }>(`/api/trips/${trip.id}/vehicle-documents?doc=${encodeURIComponent(doc.id)}`);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      toast.error(errorMessage(err));
    } finally {
      setOpening(null);
    }
  };

  return (
    <Card>
      <SectionTitle>Vehicle documents</SectionTitle>
      <p className="-mt-2 mb-3 text-xs text-muted">
        {trip.vehicleNumber} · added by {trip.companyName || "the owner"}
      </p>

      {error ? (
        <p className="text-sm text-muted">
          {error}{" "}
          <button type="button" onClick={retry} className="cursor-pointer font-semibold text-brand-700">
            Try again
          </button>
        </p>
      ) : !documents ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" /> Loading…
        </p>
      ) : documents.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted">
          <FileText className="h-4 w-4" /> The owner has not added documents for this vehicle
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{d.name}</p>
                <p className="truncate text-xs text-muted">
                  {d.fileName} · {fmtDateTime(d.uploadedAt)}
                </p>
              </div>
              <Button size="sm" variant="ghost" loading={opening === d.id} icon={<Eye className="h-4 w-4" />} onClick={() => view(d)}>
                View
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
