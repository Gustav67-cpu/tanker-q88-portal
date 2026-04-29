# Tanker Q88 Portal

Mobile-first PWA for tanker vessel availability and broker-mediated fixture negotiation. Built with Expo (React Native + Web), Supabase (auth, database, storage), and NativeWind (Tailwind for RN).

## What it does

- **Owners** upload Q88 files (PDF / Word / Excel / image), edit vessel details, and update opening port/date/status. They see only their own vessels.
- **Charterers** browse all Open vessels, filter and search, view a Q88-style commercial summary, and submit fixture requests.
- **Broker / Admin** sits in the middle: receives every request, runs a Kanban desk by negotiation status, counter-offers on either side, and chats separately with each party.
- **Public share links** generate a stripped-down, no-auth vessel page that can be sent on WhatsApp.

## Critical product rule

There is **no direct Charterer ↔ Owner contact** anywhere in the platform. All communication routes through the broker, who earns 2.5% commission from the Owners' side. This rule is enforced in three places: UI gating, application-layer query column lists, and Supabase Row-Level Security.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 51, expo-router (file-based, typed routes) |
| Language | TypeScript (strict) |
| Styling | NativeWind v4 (Tailwind) |
| Backend | Supabase (Postgres + RLS + Storage + Realtime) |
| State | React state + Supabase client; auth context in `lib/auth.tsx` |
| PWA | Expo web export + manifest + service worker |

---

## First-time setup

### 1. Get the code into your repo

You have two options.

**Option A — into your existing Replit project**

1. Open https://replit.com/@myivanov/Vessel-Navigator
2. Either:
   - Use the Files panel: delete the existing app files (keep `.replit` and any Replit config), then drag the contents of this `tanker-q88-portal` folder into the project root, **or**
   - Use the Replit shell: `git clone` from your GitHub repo after you push there (option B).
3. Run `npm install` in the Replit shell.

**Option B — push to GitHub first, then sync to Replit**

1. From this folder locally:
   ```bash
   cd tanker-q88-portal
   git init
   git add .
   git commit -m "Initial Tanker Q88 Portal scaffold"
   git remote add origin https://github.com/Gustav67-cpu/baltic-dry-sync.git
   git branch -M main
   git push -u origin main --force   # only if the repo is empty / you want to overwrite
   ```
2. In Replit, use the version-control panel to pull from GitHub.

### 2. Set up Supabase

If you haven't already, follow the steps in `../supabase-setup-walkthrough.md`. The short version:

1. Create a Supabase project.
2. From **Project Settings → API**, copy **Project URL** and **anon / public key**.
3. In Replit, add **both** as Secrets *and* in the Environment Variables pane, keyed exactly:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Optional but recommended: set `EXPO_PUBLIC_PUBLIC_ORIGIN` to your published web URL (e.g. `https://your-app.replit.app`) so WhatsApp share links render with the right host.
5. In Supabase **SQL Editor**, paste & run the contents of `../tanker-q88-schema.sql` (one folder up from this app). This creates tables, RLS, the share-token RPC, and the auto-profile-on-signup trigger.
6. In Supabase **Storage**, create a private bucket named `q88-files`. Storage policies in the schema take effect once the bucket exists.

### 3. Promote yourself to broker/admin

The schema defaults every new signup to role=`charterer` (or whatever they pick at signup — but admin is never an option from the UI). To create your broker account:

1. Sign up via the app as a regular user.
2. In Supabase SQL Editor, run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@yourcompany.com';
   ```
3. Sign out and back in. You'll land on `/admin` (Broker Desk).

### 4. Run it

```bash
npm install
npm run start            # Expo dev server (mobile + web)
npm run web              # web only (faster iteration)
npm run build:web        # static export to dist/ for deploy
```

In Replit, the `start` script will be auto-detected. The web preview opens in the right pane.

---

## Project layout

```
app/
  _layout.tsx                         root layout (auth provider, stack)
  index.tsx                           role-based redirect
  login.tsx, signup.tsx               auth screens
  profile.tsx                         user profile editor
  +not-found.tsx                      404
  v/[token].tsx                       PUBLIC share page (no auth)

  owner/                              role-guarded: owner | admin
    _layout.tsx
    index.tsx                         dashboard — own vessels only
    new.tsx                           add vessel + Q88 upload
    edit/[id].tsx                     edit vessel
    requests.tsx                      Owner Enquiries list
    request/[id].tsx                  fixture detail + counter form

  charterer/                          role-guarded: charterer | admin
    _layout.tsx
    index.tsx                         vessel list + search + filters
    vessel/[id].tsx                   Q88 commercial summary
    request/[id].tsx                  Select / Request This Tanker
    request-detail/[id].tsx           charterer view of one request
    my-requests.tsx                   list of charterer's requests

  admin/                              role-guarded: admin only
    _layout.tsx
    index.tsx                         Broker Desk Kanban
    request/[id].tsx                  full broker control center

  chat/[fixtureId].tsx                two-channel chat (?type=charterer_broker | broker_owner)

components/
  Button, Input, Header, Banner (+ BrokerNotice), VesselCard,
  StatusBadge (Vessel + Fixture), EmptyState, Field/FieldRow

lib/
  supabase.ts            client + supabaseConfigured boolean
  auth.tsx               AuthProvider + useAuth() hook
  types.ts               TypeScript shapes mirroring DB schema
  whatsapp.ts            wa.me link + message generators
  format.ts              dwt / date / number helpers

assets/
  manifest.webmanifest   PWA manifest

public/
  service-worker.js      offline-tolerant SW
  register-sw.js         registers the SW in browsers
```

---

## How the broker-only mediation rule is enforced

It's belt-and-braces, in three layers:

**1. Database (Supabase RLS).** Charterers cannot read fixture rows that aren't their own. Owners can read fixture rows for their vessels but cannot read the `chat_messages` rows whose `chat_type='charterer_broker'`. Charterers cannot read `chat_messages` whose `chat_type='broker_owner'`. Profiles are read-restricted to: self, admin, or counterparties on the same fixture (used only for company name display in the broker UI; client-side queries never select phone/whatsapp for the wrong role).

**2. Application queries.** Owner-side screens explicitly omit `charterer_id` from selects. Charterer-side screens explicitly omit `owner_id` from selects (except the request form, which fetches `owner_id` from the vessel solely to populate the FK on the new fixture row, and never displays it).

**3. UI.** Every Charterer ↔ Owner-adjacent screen renders `<BrokerNotice />` — the standing reminder that all comms go through the broker. WhatsApp buttons on charterer screens deep-link only to the broker's WhatsApp; same for owner screens.

If you find a single screen that breaches this, it's a bug — file it and fix it.

---

## Verification checklist after deploy

Run through this once everything is wired up.

1. **Supabase init.** Open the deployed app. The login page should NOT show the red "Supabase keys are missing" banner. If it does, your `EXPO_PUBLIC_*` env vars aren't being picked up by the Expo bundler — check both Secrets and Environment Variables panes.
2. **Signup → role split.** Create one owner account and one charterer account from incognito tabs. Confirm owner lands on `/owner` and charterer on `/charterer`.
3. **RLS holds.** As owner A, add a vessel. As owner B (different account), confirm you cannot see owner A's vessels in `/owner`. As charterer, confirm you can see owner A's vessel in `/charterer` (status must be Open).
4. **Q88 upload.** As owner, add a vessel and upload a PDF. Confirm `q88_file_url` is populated and the bucket has a file under `q88-files/<owner_id>/...`.
5. **Public share.** As owner, click Share on a vessel — confirm the WhatsApp draft message contains the public URL. Open that URL in incognito (no login). Confirm only commercial fields are shown, no `q88_file_url`, no owner contact.
6. **Fixture request.** As charterer, click Select on a vessel and submit a request. Confirm:
   - Request lands in `/admin` Broker Desk under "New request"
   - Owner does NOT see the charterer's WhatsApp / contact name in `/owner/requests` or the request detail
   - Charterer does NOT see any owner contact info in `/charterer/my-requests` or the request detail
7. **Two chats.** As broker, open the request and start a `charterer_broker` chat ("Hello") and a `broker_owner` chat ("Hi"). As charterer, confirm only the `charterer_broker` thread is visible. As owner, confirm only the `broker_owner` thread is visible. (Try to URL-bash to the wrong type — `/chat/<id>?type=broker_owner` as a charterer — confirm it redirects.)
8. **PWA install.** Open the deployed web URL on iPhone Safari and Android Chrome. Confirm the "Add to Home Screen" prompt works and the launched app uses the navy splash.

If any of these fail, the most common culprits are listed in `../supabase-setup-walkthrough.md`.

---

## Things deliberately left for later

These are easy to bolt on once the core flow works:

- **Q88 OCR / AI extraction.** Upload + manual entry is in place. Add a server-side worker (Supabase Edge Function or external) that watches `q88-files` and writes parsed fields back into the vessel row. Keep manual fields editable so brokers/owners can correct extraction errors.
- **Email or push notifications** when a new request lands or a counter is sent.
- **Multi-tenancy / multi-broker** — currently any admin sees all requests. If you onboard other brokers, add a `broker_id` filter to admin queries and use it.
- **Refined date inputs** — currently free-text "YYYY-MM-DD". Swap in a date picker library when you're ready.
- **Charter party form library** — pre-fill ASBATANKVOY/BPVOY4/SHELLVOY6 templates as PDFs.

---

## License

Proprietary / internal. Do not redistribute the schema or screens without permission.
