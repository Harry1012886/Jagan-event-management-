# Event Manager — Photography & Video

A private dashboard for a photography/videography business. One booking is entered once, and
payments, crew and footage all hang off it.

- **Events** — date, time, event type, location (India state → district), venue, notes
- **Client payments** — total, advance, instalments, running balance, payment status
- **Crew** — who shot the event, their fee, and whether they have been paid
- **Footage** — per-crew upload status (pending / uploading / uploaded / verified)
- **Calendar** — month view with year and month dropdowns
- **Reminders** — pushed to Google Calendar, which then emails and notifies your phone

Works on phone and desktop from the same URL. On desktop you get a sidebar and tables; on
mobile you get a bottom nav and stacked cards.

## Setting up Firebase

Firebase is required — the app has no local-only mode, because the whole point is that a
booking added on your phone is on your laptop a moment later. Everything below fits inside the
free Spark plan, no card needed.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Build → Authentication → Sign-in method** — enable **Google**.
3. **Build → Firestore Database** — create a database.
4. **Project settings → Your apps → Web app** — register an app and copy the config values.
5. Copy `.env.example` to `.env` and paste those values in.

Then publish the security rules so only your own account can read or write your data:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.rules` restricts every document to the account that created it, so signing in with a
different Google account shows an empty dashboard rather than your records.

If the keys are missing the app says so on screen and lists exactly which ones, rather than
failing somewhere deeper.

## Running it locally

```bash
npm install
npm run dev
```

Other commands:

```bash
npm run lint       # ESLint
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run emulators  # local Auth + Firestore, no real project touched
```

To develop against the emulators instead of your live data, run `npm run emulators` and create
a `.env.local` holding **all six** Firebase keys plus the emulator flag. Placeholder values are
fine, the emulator does not check them:

```
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-event-manager.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-event-manager
VITE_FIREBASE_STORAGE_BUCKET=demo-event-manager.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:demoemulator
VITE_FIREBASE_EMULATOR=true
```

Vite reads `.env.local` **after** `.env`, so while that file exists it wins and your real
project is left completely alone. Delete it to go back to live data.

The emulator loads `firestore.rules`, so it is also the right place to check that a rule change
does what you expect before deploying it.

## How the data is stored

| Collection | Holds |
| --- | --- |
| `users` | One profile per account, keyed by uid |
| `clients` | Name, phone, email, notes |
| `events` | Date, time, type, location, venue, amounts, shoot status |
| `payments` | Client instalments: amount, type, method, paid/unpaid, date, reference |
| `crewAssignments` | Crew member, role, agreed fee, and their payment method/amount/status/date |
| `footageUploads` | Per-crew upload status, Google Drive link, verification |

Every document carries an `ownerUid`, which is what both the queries and the security rules
filter on. Each collection is watched with a live listener, so changes appear on other devices
within about a second without a refresh, and edits made with no signal are sent up when the
connection returns.

## Reminders (Google Calendar)

Google Calendar was chosen over the Gmail API because a reminder has to fire when the website is
closed. Calendar stores the reminder and sends it for you, by email and as a phone notification,
at no cost. Gmail would need a scheduled server job, and Firebase charges for those.

1. In [Google Cloud Console](https://console.cloud.google.com), enable the **Google Calendar API**
   on the same project.
2. Configure the OAuth consent screen and add your own Google account as a test user.
3. Create an **OAuth client ID** of type *Web application*, and add your site address to the
   authorised JavaScript origins.
4. Put the client ID in `.env` as `VITE_GOOGLE_CLIENT_ID` and rebuild.

Leave `VITE_GOOGLE_CLIENT_ID` blank to keep calendar features switched off; the rest of the app
works exactly the same.

## Hosting

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` already rewrites all routes to `index.html`, which is what a single-page app
needs so that `/events/new` works on a hard refresh.

Environment variables are baked in at build time, so `.env` must be present on the machine that
runs `npm run build`. If you later change a key, rebuild and redeploy.

## Notes on the data

- Large photo and video files stay in Google Drive. This app stores the links and the upload
  status, not the footage itself.
- Payment records hold amounts and reference numbers only — never card numbers or UPI PINs.
- The app only uses the Firebase client SDK. No admin credential or service-account private key
  is stored in it, and none is needed.
- **Settings → Backup & export** downloads a full JSON backup, plus CSV files of events and
  payments that open in Excel or Google Sheets.

## Map data

The India state and district shapes under `public/geo/` are pre-simplified so they are small
enough to ship. To regenerate them from the upstream source:

```bash
node scripts/build-geo.mjs
```

District shapes load on demand, so only the state you tapped is ever downloaded.
