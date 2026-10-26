import type { NextRequest } from "next/server";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { ApiError, handle, requireSession } from "@/lib/server/http";
import { loadTrip } from "@/lib/server/trips";
import type { VehicleDocument } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The trip vehicle's documents (RC, insurance and so on) for its driver, who cannot read the
 * owner's vehicles or their files directly. Only while the trip is scheduled or in progress, so a
 * driver keeps no access after the trip. `?doc=<id>` returns a link to view one file for 10 minutes.
 */
export const GET = handle(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireSession(req);
  const trip = await loadTrip(id);

  const isOwner = trip.ownerId === session.uid;
  const isDriver = trip.driverId === session.uid;
  // Same answer as "not found" so trip IDs cannot be probed.
  if (!isOwner && !isDriver) throw new ApiError(404, "Trip not found.");
  if (!isOwner && trip.status !== "scheduled" && trip.status !== "in_progress") {
    throw new ApiError(403, "Vehicle documents are available until the trip ends.");
  }

  const vehicle = await adminDb().doc(`vehicles/${trip.vehicleId}`).get();
  const documents = vehicle.exists && vehicle.get("ownerId") === trip.ownerId ? ((vehicle.get("documents") as VehicleDocument[] | undefined) ?? []) : [];

  const docId = req.nextUrl.searchParams.get("doc");
  if (docId) {
    const document = documents.find((d) => d.id === docId);
    if (!document) throw new ApiError(404, "This document is no longer available.");
    const [url] = await adminBucket()
      .file(document.path)
      .getSignedUrl({ version: "v4", action: "read", expires: Date.now() + 10 * 60_000 });
    return { url };
  }

  return {
    documents: [...documents]
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
      // Everything except the storage path: files are opened through `?doc=` only.
      .map((d) => ({ id: d.id, type: d.type, name: d.name, fileName: d.fileName, uploadedAt: d.uploadedAt })),
  };
});
