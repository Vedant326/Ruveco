import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const usingEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";

function init(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (usingEmulators) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ??= "127.0.0.1:9000";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
    return initializeApp({
      projectId: "demo-ruveco",
      databaseURL: "https://demo-ruveco-default-rtdb.firebaseio.com",
      storageBucket: "demo-ruveco.appspot.com",
    });
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Server Firebase credentials are missing. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  }
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminAuth = () => getAuth(init());
export const adminDb = () => getFirestore(init());
export const adminRtdb = () => getDatabase(init());
export const adminBucket = () => getStorage(init()).bucket();
