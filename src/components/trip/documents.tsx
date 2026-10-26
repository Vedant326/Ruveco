"use client";

import { Eye, FileText, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card, SectionTitle } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { DOC_TYPES } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import type { DocType, Trip } from "@/lib/types";
import { openFile, safeFileName, saveWithRetry, uploadFile, validateFile } from "@/lib/uploads";

export interface PendingDocument<T extends string = DocType> {
  type: T;
  name: string;
  file: File;
}

/** Uploads the file, then records it on the trip. */
export async function uploadTripDocument(tripId: string, pending: PendingDocument) {
  const path = `trips/${tripId}/${crypto.randomUUID()}-${safeFileName(pending.file.name)}`;
  await uploadFile(path, pending.file);
  await saveWithRetry(() =>
    api(`/api/trips/${tripId}/document`, {
      body: { type: pending.type, name: pending.name, fileName: pending.file.name, path },
    }),
  );
}

/** Add document dialog: type (for a trip E-way bill, GST bill or Other), then the file. */
export function AddDocumentSheet<T extends string>({
  open,
  onClose,
  onAdd,
  types,
  namePlaceholder = "Weighbridge slip",
}: {
  open: boolean;
  onClose: () => void;
  /** May be async; the sheet shows a spinner and stays open if it throws. */
  onAdd: (document: PendingDocument<T>) => void | Promise<void>;
  /** The first one is preselected. A type "other" asks for a name. */
  types: { value: T; label: string }[];
  namePlaceholder?: string;
}) {
  const [type, setType] = useState<T>(types[0].value);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (type === "other" && !name.trim()) return setError("Enter a name for this document");
    if (!file) return setError("Choose a file");
    const problem = validateFile(file);
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    try {
      await onAdd({ type, name: name.trim(), file });
      setFile(null);
      setName("");
      setType(types[0].value);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add document" description="PDF, JPG or PNG, up to 10 MB.">
      <div className="space-y-4">
        <Field label="Document type" required>
          <Select value={type} onChange={(e) => setType(e.target.value as T)}>
            {types.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
        {type === "other" && (
          <Field label="Document name" required>
            <Input value={name} maxLength={60} placeholder={namePlaceholder} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label="File" required>
          <span className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-4 hover:border-brand-400">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-card">
              <Upload className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm">
              <span className="block truncate font-semibold text-ink">{file ? file.name : "Take a photo or choose a file"}</span>
              <span className="text-xs text-muted">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Tap to select"}</span>
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </span>
        </Field>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <Button block loading={busy} onClick={submit}>
          Upload
        </Button>
      </div>
    </Sheet>
  );
}

/** Documents on a saved trip: view, and add for the owner and the assigned driver. */
export function DocumentsCard({ trip, canAdd }: { trip: Trip; canAdd: boolean }) {
  const [open, setOpen] = useState(false);

  const view = async (path: string) => {
    try {
      await openFile(path);
    } catch {
      toast.error("Could not open this file. Please try again.");
    }
  };

  return (
    <Card>
      <SectionTitle
        action={
          canAdd && (
            <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Add
            </Button>
          )
        }
      >
        Documents
      </SectionTitle>

      {trip.documents.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted">
          <FileText className="h-4 w-4" /> No documents uploaded yet
        </p>
      ) : (
        <ul className="space-y-2">
          {trip.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{d.name}</p>
                <p className="truncate text-xs text-muted">
                  {d.fileName} · {d.uploadedByName} · {fmtDateTime(d.uploadedAt)}
                </p>
              </div>
              <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={() => view(d.path)}>
                View
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddDocumentSheet
        types={DOC_TYPES}
        open={open}
        onClose={() => setOpen(false)}
        onAdd={async (pending) => {
          await uploadTripDocument(trip.id, pending);
          toast.success("Document uploaded");
        }}
      />
    </Card>
  );
}
