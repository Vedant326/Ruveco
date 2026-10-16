# Ruveco setup guide

Follow these steps in order. The first section needs no accounts at all.

## 1. Try it on your computer first (no Firebase project needed)

This runs the whole app against the local Firebase emulators. Nothing is billed and no keys are needed.

Requirements: Node 20+, Java 11+, and the Firebase CLI (`npm install -g firebase-tools`).

```bash
npm install
npm run dev:local
```

Open http://localhost:3000.

- **Login:** type any 10-digit number starting with 6 to 9. The OTP is printed in the terminal, in a line like `To verify the phone number +919876543210, use the code 123456`.
- **Two users:** use a normal window for the owner and a private window for the driver.
- **Data:** it is wiped each time you stop the command. The emulator dashboard is at http://localhost:4000.
- **Test:** with `npm run dev:local` running, `npm run test:e2e` in a second terminal runs the spec's "Done when" scenario and the access rules (72 checks).

## 2. Create the Firebase project

1. Go to https://console.firebase.google.com and click **Create a project**. Name it `ruveco`. Google Analytics is not needed.
2. Bottom left, click **Upgrade** and choose the **Blaze** plan. Add a billing account, then set a budget alert (for example ₹500) under **Billing > Budgets & alerts**.

Blaze is needed for real SMS OTP and for Storage. Everything else stays inside the free quotas at MVP size.

## 3. Turn on the four Firebase products

### Authentication

1. **Build > Authentication > Get started**.
2. **Sign-in method** tab: enable **Phone**, then enable **Google** (choose a support email).
3. Under Phone, add **Phone numbers for testing**, for example `+91 98765 43210` with code `123456`. These work without sending an SMS, so use them while developing.
4. **Settings > SMS region policy**: choose **Allow** and select only **India**. This blocks SMS abuse from other countries.
5. **Settings > Authorized domains**: after you deploy, add your website domain here.

### Firestore (main data)

1. **Build > Firestore Database > Create database**.
2. Location: `asia-south1 (Mumbai)`.
3. Start in **production mode**. The real rules are deployed in step 6.

### Realtime Database (live GPS)

1. **Build > Realtime Database > Create Database**.
2. Location: **Singapore (asia-southeast1)**, the closest to India.
3. Start in **locked mode**.
4. Copy the URL shown at the top of the Data tab. It looks like `https://ruveco-default-rtdb.asia-southeast1.firebasedatabase.app`.

### Storage (license photos, face photos, trip documents)

1. **Build > Storage > Get started**.
2. Location: the 5 GB free allowance only applies to `us-central1`, `us-east1` or `us-west1`. A bucket in Mumbai is faster for uploads but is billed from the first GB (a small amount at MVP size).
3. Start in **production mode**.

## 4. Get the keys

### Web app keys

1. **Project settings (gear icon) > General > Your apps > Web (`</>`)**.
2. Register an app named `ruveco-web`. Hosting is not needed.
3. Copy the values of `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` and `appId`.

### Service account (used only by the server)

1. **Project settings > Service accounts > Generate new private key**. A JSON file downloads.
2. You need two values from it: `client_email` and `private_key`.
3. Keep this file secret. Do not commit it or share it.

### OpenRouteService (truck routes, distance, ETA)

1. Sign up at https://openrouteservice.org (free).
2. In the dashboard, create an API key (token).
3. The free plan allows about 2,000 route requests a day.

This key is optional. Without it the app uses the public OSRM demo server, which has car speeds only and no uptime promise, so set the key before real use.

### Maps and place search

Nothing to set up. Map tiles come from OpenFreeMap and place search from Photon. Both are free and need no key.

## 5. Fill in `.env.local`

```bash
cp .env.example .env.local
```

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` from the web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | the Realtime Database URL from step 3 |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the service account JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the JSON, in double quotes, keeping the `\n` characters |
| `ORS_API_KEY` | your OpenRouteService key |

Example of the private key line:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

## 6. Deploy the security rules and fill the vehicle company list

```bash
firebase login
firebase use --add        # choose your project, alias "default"
npm run deploy:rules      # Firestore, Realtime Database and Storage rules
npm run seed:companies    # fills the vehicleCompanies table
```

The first rules deploy asks whether Storage rules may read Firestore. Answer **yes**: trip documents are only shown to the trip's owner and driver, and that check reads the trip.

To change the company list, edit `src/lib/data/vehicle-companies.json` and run `npm run seed:companies` again.

## 7. Run against the real project

```bash
npm run dev
```

Sign in with a test phone number from step 3, or with Google.

## 8. Put it online (Vercel)

1. Push the project to GitHub.
2. At https://vercel.com click **Add New > Project** and import the repository.
3. Under **Environment Variables**, add every variable from `.env.local`. Paste `FIREBASE_PRIVATE_KEY` exactly as it is in the file, without the surrounding quotes.
4. Deploy.
5. Back in Firebase: **Authentication > Settings > Authorized domains > Add domain**, and add your Vercel domain. Phone and Google login fail on the live site without this.

Vercel's free Hobby plan is for non-commercial use. Move to Pro when Ruveco goes commercial.

## 9. Test on real phones

Location and camera only work over HTTPS, so test on the deployed site, not on `http://192.168.x.x:3000`.

Run the scenario from the spec with two phones:

1. Phone B: sign up as Owner, enter the company name, add a vehicle.
2. Phone A: sign up as Driver, fill the profile with license and face photo.
3. B: create a trip with A and the vehicle. A sees it under Assigned trips.
4. A: open the trip, tap **Start trip**, allow location. B gets the notification.
5. B: tap **Track trip**, see A moving, tap **Copy link**.
6. Open the link in a private window: status, ETA and a moving map, with no login.
7. A: tap **End trip**. The link shows "This trip is completed".
8. B: create another trip and cancel it with a reason.

## Things to know

- **The driver must keep the app open with the screen on.** A web page cannot read GPS when the phone is locked or another app is in front. The app holds a screen wake lock during a trip, and saves points on the phone to send later when the network drops.
- **Real SMS costs money** per message on Blaze. Test numbers are free.
- **Free limits that matter:** Firestore 50,000 reads and 20,000 writes a day; Realtime Database 1 GB stored, 10 GB download a month and 100 simultaneous connections. GPS points go to the Realtime Database, so trips do not use Firestore writes.
- **OTP rules:** Firebase decides how long an OTP is valid and when to lock after wrong tries. These cannot be set to the spec's exact "5 minutes, 5 tries, 15-minute lock".
