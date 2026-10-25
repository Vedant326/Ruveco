import { adminDb } from "@/lib/firebase/admin";
import { ApiError } from "./http";

/**
 * Transport companies live in `companies/{key}`, where the key is the name in lower case with
 * spaces and punctuation removed. So "Shree Ganesh Transport" and "shree ganesh transport."
 * are the same company, and a name can be registered only once.
 */
export function companyKey(name: string) {
  return name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
}

/** A company a driver picked from the list. */
export async function loadCompany(id: string): Promise<Company> {
  const missing = new ApiError(400, "Choose your company from the list");
  if (!/^[^/]{1,200}$/.test(id)) throw missing;
  const snap = await adminDb().doc(`companies/${id}`).get();
  if (!snap.exists) throw missing;
  return { id, name: snap.get("name"), ownerId: snap.get("ownerId") };
}
