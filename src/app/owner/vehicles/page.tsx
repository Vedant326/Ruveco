"use client";

import { collection, getDocs } from "firebase/firestore";
import { Building2, ChevronRight, CircleCheck, Eye, FileText, Plus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { TruckArt } from "@/components/brand/illustrations";
import { useOwnerData } from "@/components/data-providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, EmptyState, ErrorState, SectionTitle, SkeletonList, Spinner } from "@/components/ui/misc";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { SearchSelect, type Option } from "@/components/ui/search-select";
import { Sheet } from "@/components/ui/sheet";
import { AddDocumentSheet, type PendingDocument } from "@/components/trip/documents";
import { api, errorMessage } from "@/lib/api";
import { normalizePlate, PLATE_RE, VEHICLE_DOC_TYPES, VEHICLE_TYPES } from "@/lib/constants";
import fallbackCompanies from "@/lib/data/vehicle-companies.json";
import { fb } from "@/lib/firebase/client";
import { cx, fmtDateTime } from "@/lib/format";
import type { Vehicle, VehicleDocType, VehicleType } from "@/lib/types";
import { openFile, safeFileName, saveWithRetry, uploadFile } from "@/lib/uploads";

type PendingVehicleDocument = PendingDocument<VehicleDocType>;

/** Uploads the file, then records it on the vehicle. */
async function uploadVehicleDocument(uid: string, vehicleId: string, pending: PendingVehicleDocument) {
  const path = `vehicles/${uid}/${vehicleId}/${crypto.randomUUID()}-${safeFileName(pending.file.name)}`;
  await uploadFile(path, pending.file);
  await saveWithRetry(() =>
    api(`/api/vehicles/${vehicleId}/document`, {
      body: { type: pending.type, name: pending.name, fileName: pending.file.name, path },
    }),
  );
}

/** Label for a document chosen but not uploaded yet. */
function pendingTitle(doc: PendingVehicleDocument) {
  return doc.type === "other" ? doc.name : VEHICLE_DOC_TYPES.find((d) => d.value === doc.type)?.label;
}

/** Vehicle companies from the `vehicleCompanies` table; the bundled list is used until it is seeded. */
function useVehicleCompanies() {
  const [names, setNames] = useState<string[]>(fallbackCompanies);
  useEffect(() => {
    getDocs(collection(fb().db, "vehicleCompanies"))
      .then((snap) => {
        const stored = snap.docs.map((d) => d.get("name") as string).filter(Boolean);
        if (stored.length) setNames([...new Set(stored)].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
  }, []);
  return names.map((name): Option => ({ value: name, label: name }));
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const { vehicles } = useOwnerData();
  const companies = useVehicleCompanies();
  const [number, setNumber] = useState("");
  const [type, setType] = useState<VehicleType | null>(null);
  const [company, setCompany] = useState<Option | null>(null);
  const [errors, setErrors] = useState<{ number?: string; type?: string; company?: string }>({});
  const [busy, setBusy] = useState(false);
  const [documents, setDocuments] = useState<PendingVehicleDocument[]>([]);
  const [docOpen, setDocOpen] = useState(false);
  // By ID, so the sheet shows new documents as soon as they are saved.
  const [openId, setOpenId] = useState<string | null>(null);
  const openVehicle = vehicles.items.find((v) => v.id === openId) ?? null;
  // Documents still uploading from registration, per vehicle, so cards say so instead of "No documents".
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const changeUploading = (id: string, by: number) => setUploading((u) => ({ ...u, [id]: Math.max(0, (u[id] ?? 0) + by) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!PLATE_RE.test(number)) found.number = "Enter a valid vehicle number like MH12AB1234";
    if (!type) found.type = "Choose a vehicle type";
    if (!company) found.company = "Choose a vehicle company";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const created = await api<{ id: string }>("/api/vehicles", { body: { number, type, company: company!.value } });
      toast.success(documents.length ? `${number} added. Uploading documents…` : `${number} added`, {
        icon: <CircleCheck className="h-4 w-4 text-emerald-600" />,
      });
      setNumber("");
      setType(null);
      setCompany(null);
      // Documents need the vehicle ID, so they upload now, all at once, while the form is free again.
      const pending = documents;
      setDocuments([]);
      if (pending.length) {
        changeUploading(created.id, pending.length);
        const uploads = pending.map((doc) => uploadVehicleDocument(user!.uid, created.id, doc).finally(() => changeUploading(created.id, -1)));
        void Promise.allSettled(uploads).then((results) => {
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed) toast.warning(`${failed} document${failed > 1 ? "s" : ""} for ${number} could not be uploaded. Tap the vehicle to add ${failed > 1 ? "them" : "it"} again.`);
          else toast.success(`Documents for ${number} uploaded`);
        });
      }
    } catch (err) {
      const message = errorMessage(err);
      if (message.includes("already added")) setErrors({ number: message });
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Add Vehicle" subtitle="Register once, pick it in every trip" back="/owner" />

      <Card>
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="Vehicle number" required error={errors.number}>
            <Input
              value={number}
              placeholder="MH12AB1234"
              autoCapitalize="characters"
              invalid={Boolean(errors.number)}
              className="font-bold uppercase tracking-widest placeholder:font-medium placeholder:tracking-normal"
              onChange={(e) => {
                setNumber(normalizePlate(e.target.value).slice(0, 11));
                setErrors((x) => ({ ...x, number: undefined }));
              }}
            />
          </Field>

          <Field as="div" label="Vehicle type" required error={errors.type}>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
              {VEHICLE_TYPES.map((option) => {
                const selected = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setType(option.value);
                      setErrors((x) => ({ ...x, type: undefined }));
                    }}
                    className={cx(
                      "flex cursor-pointer flex-col items-center rounded-2xl border-2 px-1.5 pb-2.5 pt-2 text-center transition-colors",
                      selected ? "border-brand-600 bg-brand-50" : "border-line bg-white hover:border-brand-300",
                    )}
                  >
                    <TruckArt type={option.value} className="h-12 w-full" />
                    <span className="mt-1 text-sm font-bold text-ink">{option.label}</span>
                    <span className="text-[11px] leading-tight text-muted">{option.range}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field as="div" label="Vehicle company" required error={errors.company}>
            <SearchSelect
              value={company}
              onChange={(option) => {
                setCompany(option);
                setErrors((x) => ({ ...x, company: undefined }));
              }}
              options={companies}
              title="Vehicle company"
              placeholder="Choose a company"
              searchPlaceholder="Search companies"
              allowCustom
              invalid={Boolean(errors.company)}
              icon={<Building2 className="h-4 w-4" />}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Documents</span>
              <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setDocOpen(true)}>
                Add
              </Button>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-muted">RC, insurance, PUC, permit or other files. You can also add them later.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <FileText className="h-5 w-5 shrink-0 text-brand-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{pendingTitle(doc)}</p>
                      <p className="truncate text-xs text-muted">{doc.file.name}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove document"
                      onClick={() => setDocuments((list) => list.filter((_, j) => j !== i))}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" block loading={busy}>
            Save vehicle
          </Button>
        </form>
      </Card>

      <section className="mt-7">
        <SectionTitle>Registered vehicles {vehicles.items.length > 0 && <span className="font-medium text-muted">({vehicles.items.length})</span>}</SectionTitle>
        {vehicles.loading ? (
          <SkeletonList rows={2} />
        ) : vehicles.error ? (
          <ErrorState message="Your vehicles could not be loaded." onRetry={vehicles.retry} />
        ) : vehicles.items.length === 0 ? (
          <Card>
            <EmptyState title="No vehicles yet" text="Add your first vehicle with the form above." />
          </Card>
        ) : (
          <Stagger className="grid gap-3 sm:grid-cols-2">
            {vehicles.items.map((v) => (
              <StaggerItem key={v.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(v.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-3xl border border-line/70 bg-white p-3.5 text-left shadow-card transition-colors hover:border-brand-300"
                >
                  <span className="grid h-14 w-20 shrink-0 place-items-center rounded-2xl bg-brand-50 px-2">
                    <TruckArt type={v.type} className="w-full" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold tracking-wide text-ink">{v.number}</p>
                    <p className="truncate text-sm text-muted">{v.company}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-brand-600">
                      {uploading[v.id] ? (
                        <>
                          <Spinner className="h-3.5 w-3.5" /> Uploading…
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5" /> {documentCount(v)}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="ml-auto rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">{v.type}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      <AddDocumentSheet
        types={VEHICLE_DOC_TYPES}
        namePlaceholder="Road tax receipt"
        open={docOpen}
        onClose={() => setDocOpen(false)}
        onAdd={(doc) => setDocuments((list) => [...list, doc])}
      />
      <VehicleDocumentsSheet vehicle={openVehicle} uploading={openId ? (uploading[openId] ?? 0) : 0} onClose={() => setOpenId(null)} />
    </>
  );
}

function documentCount(v: Vehicle) {
  const count = v.documents?.length ?? 0;
  return count === 0 ? "No documents" : `${count} document${count > 1 ? "s" : ""}`;
}

/** A registered vehicle's documents: view each one, and add more. */
function VehicleDocumentsSheet({ vehicle, uploading, onClose }: { vehicle: Vehicle | null; uploading: number; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const documents = [...(vehicle?.documents ?? [])].sort((a, b) => b.uploadedAt - a.uploadedAt);

  const view = async (path: string) => {
    try {
      await openFile(path);
    } catch {
      toast.error("Could not open this file. Please try again.");
    }
  };

  return (
    <>
      <Sheet open={Boolean(vehicle) && !adding} onClose={onClose} title={vehicle?.number ?? ""} description={vehicle ? `${vehicle.company} · ${vehicle.type}` : undefined}>
        <SectionTitle
          action={
            <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              Add
            </Button>
          }
        >
          Documents
        </SectionTitle>
        {uploading > 0 && (
          <p className="mb-2 flex items-center gap-2 rounded-2xl bg-brand-50 p-3 text-sm font-medium text-brand-700">
            <Spinner className="h-4 w-4" /> Uploading…
          </p>
        )}
        {documents.length === 0 && uploading === 0 ? (
          <p className="flex items-center gap-2 py-2 text-sm text-muted">
            <FileText className="h-4 w-4" /> No documents uploaded yet
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
                <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={() => view(d.path)}>
                  View
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
      {vehicle && (
        <AddDocumentSheet
          types={VEHICLE_DOC_TYPES}
          namePlaceholder="Road tax receipt"
          open={adding}
          onClose={() => setAdding(false)}
          onAdd={async (pending) => {
            await uploadVehicleDocument(vehicle.ownerId, vehicle.id, pending);
            toast.success("Document uploaded");
          }}
        />
      )}
    </>
  );
}
