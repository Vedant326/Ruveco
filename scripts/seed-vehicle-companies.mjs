// Fills the `vehicleCompanies` table that the Add Vehicle dropdown reads from.
// Run once after creating the Firebase project:  npm run seed:companies
// Re-running is safe: each company is written under a fixed ID, so nothing is duplicated.
//
// The list is a curated file of commercial vehicle makers sold in India
// (src/lib/data/vehicle-companies.json). Edit that file and re-run to change it.
import { readFile } from "node:fs/promises";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase credentials. Fill in .env.local first (see SETUP.md).");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const names = JSON.parse(await readFile(new URL("../src/lib/data/vehicle-companies.json", import.meta.url), "utf8"));
const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const batch = db.batch();
for (const name of unique) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  batch.set(db.doc(`vehicleCompanies/${id}`), { name, source: "curated", updatedAt: Date.now() });
}
await batch.commit();
console.log(`Saved ${unique.length} vehicle companies to project ${projectId}.`);
