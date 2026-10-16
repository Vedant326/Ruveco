import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

/** Set NEXT_PUBLIC_USE_EMULATORS=1 to run against the local Firebase emulators with no real project. */
export const usingEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";

const config = usingEmulators
  ? {
      apiKey: "demo-key",
      authDomain: "demo-ruveco.firebaseapp.com",
      projectId: "demo-ruveco",
      storageBucket: "demo-ruveco.appspot.com",
      databaseURL: "https://demo-ruveco-default-rtdb.firebaseio.com",
      appId: "demo-app",
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.databaseURL);

interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  rtdb: Database;
  storage: FirebaseStorage;
}

let services: Services | null = null;

/** Firebase services, created on first use so nothing runs during prerendering. */
export function fb(): Services {
  if (services) return services;
  if (!firebaseConfigured) throw new Error("Firebase is not configured. Fill in .env.local.");

  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const rtdb = getDatabase(app);
  const storage = getStorage(app);

  if (usingEmulators) {
    const host = typeof window === "undefined" ? "127.0.0.1" : window.location.hostname;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectDatabaseEmulator(rtdb, host, 9000);
    connectStorageEmulator(storage, host, 9199);
  }

  services = { app, auth, db, rtdb, storage };
  return services;
}
