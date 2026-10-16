// End-to-end check of the spec's "Done when" scenario (section 6), plus the access rules.
// It talks to the local Firebase emulators only, never to a real project.
//
//   Terminal 1:  npm run dev:local
//   Terminal 2:  npm run test:e2e
//
// B is an owner, A is a driver, C is a receiver with no login, X is a stranger.
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithCustomToken } from "firebase/auth";
import { connectDatabaseEmulator, get as rtdbGet, getDatabase, ref as rtdbRef, serverTimestamp, update as rtdbUpdate, set as rtdbSet } from "firebase/database";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from "firebase/firestore";
import { connectStorageEmulator, getDownloadURL, getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
import { initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getDatabase as getAdminDatabase } from "firebase-admin/database";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const AUTH = "http://127.0.0.1:9099";
const CONFIG = {
  apiKey: "demo-key",
  projectId: "demo-ruveco",
  storageBucket: "demo-ruveco.appspot.com",
  databaseURL: "https://demo-ruveco-default-rtdb.firebaseio.com",
};

process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
const admin = initAdmin({ projectId: CONFIG.projectId, databaseURL: CONFIG.databaseURL });

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  -> ${detail}` : ""}`);
}

/** True when the promise is refused by security rules. */
const denied = (promise) => promise.then(() => false, (err) => /permission|unauthorized/i.test(`${err.code} ${err.message}`));
const allowed = (promise) => promise.then(() => true, (err) => (console.log("     ", err.code ?? err.message), false));

/** Signs in with phone + OTP through the Auth emulator, then opens the same client SDK the browser uses. */
async function login(label, phone) {
  const post = (path, body) =>
    fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${path}?key=demo-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
  const sent = await post("accounts:sendVerificationCode", { phoneNumber: `+91${phone}` });
  const codes = await (await fetch(`${AUTH}/emulator/v1/projects/${CONFIG.projectId}/verificationCodes`)).json();
  const code = codes.verificationCodes.filter((c) => c.phoneNumber === `+91${phone}`).pop().code;
  const session = await post("accounts:signInWithPhoneNumber", { sessionInfo: sent.sessionInfo, code });

  const app = initializeApp(CONFIG, label);
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const rtdb = getDatabase(app);
  connectDatabaseEmulator(rtdb, "127.0.0.1", 9000);
  const storage = getStorage(app);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  await signInWithCustomToken(auth, await getAdminAuth(admin).createCustomToken(session.localId));
  return { uid: session.localId, token: session.idToken, app, db, rtdb, storage };
}

async function call(user, path, body, method) {
  const res = await fetch(`${APP}${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { ...(user ? { Authorization: `Bearer ${user.token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

const upload = (user, path, type, bytes = 2000) => uploadBytes(storageRef(user.storage, path), new Uint8Array(bytes), { contentType: type });
const myTrips = async (user, field) => (await getDocs(query(collection(user.db, "trips"), where(field, "==", user.uid)))).docs.map((d) => ({ id: d.id, ...d.data() }));

const rand = () => String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
const B = await login("owner", `98${rand()}`);
const A = await login("driver", `97${rand()}`);
const X = await login("stranger", `96${rand()}`);

// 0. auth guard
check("API rejects calls with no token", (await call(null, "/api/me", {}, "POST")).status === 401);

// 1. B signs up as owner, company, vehicle
check("B: account created", (await call(B, "/api/me", undefined, "POST")).data.profile?.role === null);
check("B: choose Owner", (await call(B, "/api/me/role", { role: "owner" })).status === 200);
check("B: cannot switch role later", (await call(B, "/api/me/role", { role: "driver" })).status === 409);
check("B: company name", (await call(B, "/api/me/company", { companyName: "Shree Ganesh Transport" })).status === 200);
const plate = `MH12AB${rand().slice(0, 4)}`;
const v = await call(B, "/api/vehicles", { number: `mh-12 ab ${plate.slice(6)}`, type: "HCV", company: "Tata Motors" });
check("B: add vehicle (number normalised)", v.status === 200 && v.data.id === `${B.uid}_${plate}`, v.data.id ?? v.data.error);
const dup = await call(B, "/api/vehicles", { number: plate, type: "LCV", company: "Eicher" });
check("B: duplicate vehicle rejected", dup.status === 409 && dup.data.error === "This vehicle is already added", dup.data.error);
check("B: bad plate rejected", (await call(B, "/api/vehicles", { number: "HELLO", type: "LCV", company: "Eicher" })).status === 400);

// 2. A signs up as driver, fills profile
await call(A, "/api/me", undefined, "POST");
check("A: choose Driver", (await call(A, "/api/me/role", { role: "driver" })).status === 200);
check("A: driver cannot add vehicles", (await call(A, "/api/vehicles", { number: plate, type: "LCV", company: "Eicher" })).status === 403);
const lic = `drivers/${A.uid}/license-1.jpg`, face = `drivers/${A.uid}/face-1.jpg`;
check("A: upload license photo", await allowed(upload(A, lic, "image/jpeg")));
check("A: upload face photo", await allowed(upload(A, face, "image/jpeg")));
check("Storage: stranger cannot write into A's folder", await denied(upload(X, `drivers/${A.uid}/x.jpg`, "image/jpeg")));
check("Storage: stranger cannot read A's license photo", await denied(getDownloadURL(storageRef(X.storage, lic))));
check("Storage: wrong file type rejected", await denied(upload(A, `drivers/${A.uid}/x.exe`, "application/octet-stream")));
check("Storage: file over 10 MB rejected", await denied(upload(A, `drivers/${A.uid}/big.jpg`, "image/jpeg", 10 * 1024 * 1024 + 10)));
const driverName = `Ramesh ${rand().slice(0, 4)}`;
const profileBody = { name: driverName, address: "12 MG Road, Pune", licenseNumber: "MH1220110012345", email: "ramesh@example.com", licensePhotoPath: lic, facePhotoPath: face, consent: true };
check("A: profile without consent rejected", (await call(A, "/api/driver/profile", { ...profileBody, consent: false })).status === 400);
const prof = await call(A, "/api/driver/profile", profileBody);
check("A: save profile", prof.status === 200, prof.data.error);

// 3. B creates a trip with A
await call(X, "/api/me", undefined, "POST");
await call(X, "/api/me/role", { role: "owner" });
const found = await call(B, `/api/drivers?q=${encodeURIComponent(driverName.toLowerCase().slice(0, 8))}`);
const hit = found.data.drivers?.find((d) => d.uid === A.uid);
check("B: finds driver by name (name and phone only)", Boolean(hit) && Object.keys(hit).sort().join() === "name,phone,uid", JSON.stringify(hit));
check("A: driver cannot search drivers", (await call(A, "/api/drivers?q=a")).status === 403);
const places = await call(B, "/api/places?q=Pune%20Railway%20Station");
check("Place search returns suggestions with coordinates", places.data.places?.length > 0 && typeof places.data.places[0].lat === "number", places.data.places?.[0]?.address ?? places.data.error);
const source = { address: "Pune Railway Station, Pune, Maharashtra", lat: 18.5285, lng: 73.8743 };
const destination = { address: "Chhatrapati Shivaji Terminus, Mumbai, Maharashtra", lat: 18.9398, lng: 72.8355 };
const dir = await call(B, "/api/directions", { from: source, to: destination });
check("Distance preview", dir.data.distanceKm > 100 && dir.data.distanceKm < 250, `${dir.data.distanceKm} km, ${dir.data.durationMin} min`);
const now = Date.now();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const tripBody = { vehicleId: v.data.id, driverId: A.uid, date: today, source, destination, pickupAt: now + 3600e3, deliveryAt: now + 5 * 3600e3, receiverName: "Suresh Traders", receiverPhone: "9123456780", goodsDescription: "Cement" };
check("B: delivery before pickup rejected", (await call(B, "/api/trips", { ...tripBody, deliveryAt: now })).status === 400);
check("B: past date rejected", (await call(B, "/api/trips", { ...tripBody, date: "2020-01-01" })).status === 400);
check("X: cannot use B's vehicle", (await call(X, "/api/trips", tripBody)).status === 400);
const t1 = await call(B, "/api/trips", tripBody);
check("B: create trip", t1.status === 200 && /^RV-\d{5}$/.test(t1.data.tripCode), t1.data.tripCode ?? t1.data.error);
const t2 = await call(B, "/api/trips", tripBody);
const id = t1.data.id;

let driverTrips = await myTrips(A, "driverId");
check("Status is Scheduled and A sees the trip", driverTrips.find((t) => t.id === id)?.status === "scheduled", `${driverTrips.length} assigned`);
check("Firestore: owner B lists only their own trips", (await myTrips(B, "ownerId")).length === 2);
check("Firestore: stranger X sees no trips", (await myTrips(X, "ownerId")).length === 0);
check("Firestore: stranger X cannot open the trip", await denied(getDoc(doc(X.db, "trips", id))));
check("Firestore: nobody can list all trips", await denied(getDocs(collection(X.db, "trips"))));
check("Firestore: A cannot read B's vehicle", await denied(getDoc(doc(A.db, "vehicles", v.data.id))));
check("Firestore: B cannot read A's license record", await denied(getDoc(doc(B.db, "drivers", A.uid))));
check("Firestore: status cannot be written from a client", await denied(updateDoc(doc(A.db, "trips", id), { status: "completed" })));
const assigned = (await getDocs(query(collection(A.db, "notifications"), where("userId", "==", A.uid)))).docs;
check("A is notified about the new trip", assigned.some((n) => n.get("tripId") === id), assigned[0]?.get("message"));
check("Firestore: A can mark a notification read, but not edit it", (await allowed(updateDoc(assigned[0].ref, { readAt: Date.now() }))) && (await denied(updateDoc(assigned[0].ref, { message: "hacked" }))));

// goods + documents
check("A: add goods item", (await call(A, `/api/trips/${id}/goods`, { goods: [{ item: "Cement bags", quantity: 200, unit: "pieces" }] })).status === 200);
check("X: cannot touch the trip", (await call(X, `/api/trips/${id}/goods`, { goods: [] })).status === 404);
const docPath = `trips/${id}/eway.pdf`;
check("Storage: B uploads trip document", await allowed(upload(B, docPath, "application/pdf")));
check("Storage: driver A can open the trip document", await allowed(getDownloadURL(storageRef(A.storage, docPath))));
check("Storage: stranger cannot upload to or read the trip files", (await denied(upload(X, `trips/${id}/x.pdf`, "application/pdf"))) && (await denied(getDownloadURL(storageRef(X.storage, docPath)))));
const docRes = await call(B, `/api/trips/${id}/document`, { type: "eway", fileName: "eway.pdf", path: docPath });
check("B: document recorded", docRes.status === 200 && docRes.data.document?.name === "E-way bill", docRes.data.error);
check("B: trip figures saved", (await call(B, `/api/trips/${id}/figures`, { totalFuel: 120.5, paymentReceived: 45000 })).status === 200);

// 4. A starts the trip
const point = { lat: 18.62, lng: 73.75, acc: 12, spd: 14, t: Date.now() };
const sendGps = (user, p) => rtdbUpdate(rtdbRef(user.rtdb, `tracking/${id}`), { [`points/${p.t}`]: p, latest: { ...p, r: serverTimestamp() } });
check("GPS write refused before the trip starts", await denied(sendGps(A, point)));
check("B: owner cannot start the trip", (await call(B, `/api/trips/${id}/start`, undefined, "POST")).status === 403);
const start = await call(A, `/api/trips/${id}/start`, undefined, "POST");
check("A: Start trip", start.status === 200 && start.data.status === "in_progress", start.data.error);
check("A: starting again is harmless", (await call(A, `/api/trips/${id}/start`, undefined, "POST")).status === 200);
check("A: cannot start a second trip while one is running", (await call(A, `/api/trips/${t2.data.id}/start`, undefined, "POST")).status === 409);
const started = (await myTrips(B, "ownerId")).find((t) => t.id === id);
const token = started.trackingToken;
check("Status is In progress, tracking token is 32+ chars", started.status === "in_progress" && token?.length >= 32, token);
const notes = (await getDocs(query(collection(B.db, "notifications"), where("userId", "==", B.uid)))).docs.map((n) => n.get("message"));
const startNote = notes.find((m) => m.includes("has started"));
check("B gets the start notification", startNote === `Trip ${t1.data.tripCode} has started. Driver ${driverName}, vehicle ${plate}`, startNote);
check("B: cannot cancel a trip in progress", (await call(B, `/api/trips/${id}/cancel`, { reason: "x" })).status === 409);

// 5. GPS + owner live view
check("A: GPS points accepted", await allowed(sendGps(A, point)));
check("GPS: owner cannot write points", await denied(sendGps(B, point)));
check("GPS: bad coordinates refused", await denied(rtdbSet(rtdbRef(A.rtdb, `tracking/${id}/points/1`), { lat: 999, lng: 0, t: 1 })));
check("B sees A's live location", (await rtdbGet(rtdbRef(B.rtdb, `tracking/${id}/latest`))).val()?.lat === point.lat);
check("GPS: stranger cannot read location", await denied(rtdbGet(rtdbRef(X.rtdb, `tracking/${id}/latest`))));
check("GPS: nobody can read tracking tokens", await denied(rtdbGet(rtdbRef(B.rtdb, "tokens"))));

// 6. C opens the link with no login
const track = await call(null, `/api/track/${token}?full=1`);
check("C: link works with no login", track.status === 200 && track.data.status === "in_progress");
check("C: sees live position and ETA", track.data.latest?.lat === point.lat && track.data.eta?.seconds > 0, `ETA ${Math.round((track.data.eta?.seconds ?? 0) / 60)} min, ${track.data.eta?.distanceKm} km to go`);
check("C: gets planned route and driven path", track.data.route?.length > 2 && track.data.path?.length === 1, `route ${track.data.route?.length} pts`);
check("C: response has status, ETA and map data only", Object.keys(track.data).sort().join() === "completedAt,destination,eta,latest,path,route,serverTime,source,startedAt,status,valid", Object.keys(track.data).join());
const etaAt = track.data.eta?.at;
check("ETA is reused within 5 minutes", (await call(null, `/api/track/${token}`)).data.eta?.at === etaAt);
check("C: wrong token is not valid", (await call(null, `/api/track/${"x".repeat(32)}`)).status === 404);

// 7. A ends the trip
const end = await call(A, `/api/trips/${id}/end`, undefined, "POST");
check("A: End trip", end.status === 200 && end.data.status === "completed", end.data.error);
check("Sharing stops: GPS write refused after End trip", await denied(sendGps(A, { ...point, t: Date.now() })));
const done = await call(null, `/api/track/${token}?full=1`);
check("C sees Completed, with no live position", done.data.status === "completed" && done.data.latest === null && done.data.eta === null);
check("Goods locked after completion", (await call(A, `/api/trips/${id}/goods`, { goods: [] })).status === 409);

// 8. B cancels a different Scheduled trip
check("B: cancel needs a reason", (await call(B, `/api/trips/${t2.data.id}/cancel`, { reason: " " })).status === 400);
check("A: driver cannot cancel", (await call(A, `/api/trips/${t2.data.id}/cancel`, { reason: "no" })).status === 403);
const cancel = await call(B, `/api/trips/${t2.data.id}/cancel`, { reason: "Customer postponed" });
check("B: cancel a Scheduled trip with a reason", cancel.status === 200 && cancel.data.status === "cancelled", cancel.data.error);
check("A: cannot start a cancelled trip", (await call(A, `/api/trips/${t2.data.id}/start`, undefined, "POST")).status === 409);

// 48-hour expiry: age the completed trip's token directly in the emulator (admin access)
await getAdminDatabase(admin).ref(`tokens/${token}/completedAt`).set(Date.now() - 49 * 3600e3);
check("Link stops working 48 hours after Completed", (await call(null, `/api/track/${token}`)).status === 404);

await Promise.all([B, A, X].map((u) => deleteApp(u.app)));
console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
