import { z } from "zod";
import { PHONE_RE } from "@/lib/constants";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { loadCompany } from "@/lib/server/companies";
import { ApiError, handle, requireRole } from "@/lib/server/http";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  phone: z.string().regex(PHONE_RE, "Enter a valid 10-digit mobile number").optional(),
  address: z.string().trim().min(1, "Enter your address").max(250),
  licenseNumber: z.string().trim().min(4, "Enter your driving license number").max(30),
  email: z.email("Enter a valid email address"),
  companyId: z.string().min(1, "Choose your company"),
  licensePhotoPath: z.string().min(1, "Upload your license photo"),
  facePhotoPath: z.string().min(1, "Take a face photo"),
  consent: z.literal(true, "Please accept the consent to continue"),
});

export const POST = handle(async (req) => {
  const { session } = await requireRole(req, "driver");
  const body = schema.parse(await req.json());

  // A phone-login number always wins; Google sign-in users type theirs.
  const phone = session.phone ?? body.phone;
  if (!phone) throw new ApiError(400, "Enter a valid 10-digit mobile number");

  const company = await loadCompany(body.companyId);

  const prefix = `drivers/${session.uid}/`;
  for (const path of [body.licensePhotoPath, body.facePhotoPath]) {
    if (!path.startsWith(prefix)) throw new ApiError(400, "Invalid photo. Please upload it again.");
    const [exists] = await adminBucket().file(path).exists();
    if (!exists) throw new ApiError(400, "Photo upload did not finish. Please upload it again.");
  }

  const now = Date.now();
  const db = adminDb();
  const batch = db.batch();
  batch.set(
    db.doc(`drivers/${session.uid}`),
    {
      name: body.name,
      nameLower: body.name.toLowerCase(),
      phone,
      address: body.address,
      licenseNumber: body.licenseNumber.toUpperCase(),
      licensePhotoPath: body.licensePhotoPath,
      facePhotoPath: body.facePhotoPath,
      email: body.email,
      // The owner of this company is the only one who sees this driver.
      ownerId: company.ownerId,
      companyId: company.id,
      companyName: company.name,
      consentAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  batch.update(db.doc(`users/${session.uid}`), {
    displayName: body.name,
    phone,
    companyId: company.id,
    companyName: company.name,
    profileComplete: true,
  });
  await batch.commit();
});
