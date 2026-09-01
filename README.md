# Event Manager — Photography & Video

A private dashboard for a photography and videography business. You enter a booking once.
Payments, crew and footage all hang off that event.

**Live website:** https://jagan-event-management.web.app  
**Source code:** https://github.com/Harry1012886/Jagan-event-management-  
**Firebase project:** `jagan-event-management` (Spark / free plan)

Sign in with Google using `harryhermione2910@gmail.com` or `saranyakumaravel2903@gmail.com`.
Both accounts are Owners of the Firebase project. Data you save is tied to **the Google
account you used to sign in**, so use the same account on your phone and your laptop.

---

## Do I need to pay money?

**No — not for normal use of this dashboard.** The project is on Firebase **Spark**, which is
the free plan. Google does not ask for a card for Spark.

What stays free for this kind of app:

| What you use | Cost for this business |
| --- | --- |
| Website hosting | Free |
| Google sign-in | Free |
| Saving events, payments, clients, crew, footage status | Free (Cloud Firestore, generous free quota) |
| Using the site on phone and laptop | Free |
| Google Calendar reminders (optional, if you connect them later) | Free |

You would only start paying if you **upgrade to Blaze** (pay-as-you-go). You do **not** need
Blaze for this app. Spark is enough.

Things that are *not* stored in this website, and are not billed through Firebase:

- Photo and video files — they stay in **Google Drive**. This app only stores the Drive **link**
  and whether footage is pending / uploaded / verified.
- Google Drive space — that is your Google account’s Drive quota, same as always.

**Do not turn on Cloud Functions or Identity Platform “upgrade” banners** unless you know you
want a paid feature. SMS multi-factor login, for example, needs a paid upgrade. You do not need
it.

---

## Where is the data saved?

Everything you type in the dashboard (events, clients, payments, crew, footage status) is saved
in **Google Cloud Firestore**, inside the Firebase project `jagan-event-management`.

It is **not** saved only in the phone browser. That is why a booking added on the laptop shows
up on the phone after you refresh or wait a second.

Each record is stamped with your account id (`ownerUid`). Security rules allow only the signed-in
owner to read or write their own rows. If you sign in with a *different* Google account, you will
see an empty dashboard — that is by design, not a data loss.

### What is stored in each collection

| Collection | What it holds |
| --- | --- |
| `users` | Profile for each signed-in account |
| `clients` | Name, phone, email, notes |
| `events` | Date, time, type, India state/district, venue, amounts, shoot status |
| `payments` | Amount, type (Advance / Partial / Final), Cash / UPI / Bank Transfer, paid or pending, date, optional reference number |
| `crewAssignments` | Crew name, role, agreed fee, payment method, amount, paid/pending, paid date |
| `footageUploads` | Pending / uploading / uploaded / verified, Google Drive link, verification |
| `notifications` | In-app reminder / alert records |

Raw wedding films and photo folders are **not** uploaded here. Paste the Drive link on the
footage screen.

Payment rows store amounts and UPI/bank **reference numbers** only — never card numbers or UPI PINs.

---

## How to see the data

### Inside the website (day-to-day)

Open https://jagan-event-management.web.app and sign in. Then:

- **Dashboard** — upcoming shoots, money still to collect, footage still pending
- **All Events** — every booking
- **Payments** — client money and crew money
- **Crew & Footage** — who shot, who uploaded
- **Settings → Backup & export** — download a JSON backup, plus CSV files that open in Excel
  or Google Sheets

### Inside Firebase (the actual database)

1. Open [Firebase console](https://console.firebase.google.com/project/jagan-event-management/overview).
2. Sign in with an Owner account (`harryhermione2910@gmail.com` or `saranyakumaravel2903@gmail.com`).
3. Left menu → **Build** → **Firestore Database**.
4. Open the **Data** tab and click into `events`, `payments`, and the other collections.

That Firestore page is the source of truth. The website is a friendly view of the same records.

To see who can sign in: **Build → Authentication → Users**.

To see the hosted website files: **Build → Hosting**.

---

## How to use the site

1. Open https://jagan-event-management.web.app on phone or computer.
2. **Continue with Google** and pick one of the Owner accounts. Use that same account everywhere.
3. **Add Event** — date (year/month calendar), time (clock), location (India map → state →
   district), amounts.
4. On the event page, record **client payments** (paid/pending, Cash/UPI/Bank Transfer,
   optional reference), add **crew**, mark **crew paid**, and set **footage** status + Drive link.
5. The dashboard totals update from those records. You do not type a separate “total paid”.

Email/password on the login screen only works if you later enable **Email/Password** under
Authentication → Sign-in method. Google sign-in is enough.

---

## Owners and sharing

| Google account | Role |
| --- | --- |
| harryhermione2910@gmail.com | Owner |
| saranyakumaravel2903@gmail.com | Owner |

Owners can open the Firebase console and change settings. **App data is still per signed-in
user.** If one person signs in with account A and someone else signs in with account B, they do
not see each other’s events.

If two people must share **one** diary of jobs, they must both sign in with the **same** Google
account, or a developer must later change the security rules. Do not change rules unless you
understand that.

---

## Reminders (Google Calendar) — optional

The dashboard can create Google Calendar events with reminders. Calendar then emails you and
notifies your phone even when the website is closed. That stays free. Gmail API was not used,
because automatic emails while the site is closed would need paid Cloud Functions.

This is **not** required for bookings and payments. Leave it until you want it. Setup is in
**Settings** on the website, and needs a Google Cloud OAuth client ID (`VITE_GOOGLE_CLIENT_ID`)
plus a rebuild and redeploy.

---

## Backup

In the website: **Settings → Backup & export**.

- JSON — full copy, can be restored from the same page
- Events CSV and Payments CSV — for Excel / Sheets

Download a backup before you click **Clear all data**. Clearing deletes Firestore records for
that signed-in account on every device.

---

## If something looks empty

- Signed in with the other Owner Google account? You will not see the first account’s events.
- Just saved on another device? Wait a second, or refresh.
- Google sign-in popup blocked? Allow popups for this site.
- “This web address is not authorised”? Add the site URL under Authentication → Settings →
  Authorised domains. Hosting (`*.web.app`) is normally already listed.

---

## For developers (local run and redeploy)

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` with the web app keys from
Firebase → Project settings → Your apps. Never commit `.env`. Never put a service-account
private key in this project.

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

Environment variables are baked in at **build** time. After changing `.env`, build and deploy
again.

Other commands: `npm run lint`, `npm run preview`, `npm run emulators`.

India map shapes live under `public/geo/`. Regenerate with `node scripts/build-geo.mjs` if needed.

---

## What is already set up

- React / Vite website on Firebase Hosting
- Google sign-in (Firebase Authentication)
- Cloud Firestore + security rules so only the owner of a record can read or write it
- Live site at https://jagan-event-management.web.app
- Code on GitHub at https://github.com/Harry1012886/Jagan-event-management-
