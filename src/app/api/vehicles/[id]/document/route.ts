import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ALLOWED_FILE_TYPES, VEHICLE_DOC_TYPES } from "@/lib/constants";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { ApiError, handle, requireRole } from "@/lib/server/http";
import type { VehicleDocument } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  type: z.enum(["rc", "insurance", "puc", "permit", "fitness", "other"]),
  name: z.string().trim().max(60).default(""),
  fileName: z.string().trim().min(1).max(200),
  path: z.string().min(1),
});

/** Records a file the owner already uploaded to `vehicles/{uid}/{vehicleId}/` on that vehicle. */
export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { session } = await requireRole(req, "owner");
  const input = schema.parse(await req.json());

  const ref = adminDb().doc(`vehicles/${id}`);
  const snap = await ref.get();
  // Same answer as "not found" so vehicle IDs cannot be probed.
  if (!snap.exists || snap.get("ownerId") !== session.uid) throw new ApiError(404, "Vehicle not found.");

  if (input.type === "other" && !input.name) throw new ApiError(400, "Enter a name for this document");
  if (!input.path.startsWith(`vehicles/${session.uid}/${id}/`)) throw new ApiError(400, "Invalid file. Please upload it again.");
  if (((snap.get("documents") as unknown[] | undefined) ?? []).length >= 20) {
    throw new ApiError(409, "A vehicle can have up to 20 documents.");
  }

  const file = adminBucket().file(input.path);
  const [exists] = await file.exists();
  if (!exists) throw new ApiError(400, "Upload did not finish. Please try again.");
  const [meta] = await file.getMetadata();
  if (!ALLOWED_FILE_TYPES.includes(meta.contentType ?? "")) {
    throw new ApiError(400, "Only PDF, JPG or PNG files are allowed.");
  }

  const document: VehicleDocument = {
    id: randomUUID(),
    type: input.type,
    name: input.type === "other" ? input.name : VEHICLE_DOC_TYPES.find((d) => d.value === input.type)!.label,
    fileName: input.fileName,
    path: input.path,
    uploadedAt: Date.now(),
  };
  await ref.update({ documents: FieldValue.arrayUnion(document) });
  return { document };
});
