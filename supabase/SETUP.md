# Tanker Q88 Portal — Supabase Setup Walkthrough

You're at the step where Replit needs `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Follow these steps in order.

## 1. Create a Supabase account & project

1. Go to https://supabase.com and click **Start your project** (sign in with GitHub is fastest).
2. Click **New project**.
3. Fill in:
   - **Name:** `tanker-q88-portal`
   - **Database password:** generate a strong one and **save it in your password manager** — you'll need it later for direct DB access. You won't paste this into Replit.
   - **Region:** pick the one closest to most of your users (e.g. `eu-west-1` if charterers/owners are mostly in Europe/Middle East, `us-east-1` for the Americas).
   - **Plan:** Free is fine to start.
4. Click **Create new project** and wait ~1–2 minutes while it provisions.

## 2. Grab the URL and anon key

Once the project is ready:

1. In the left sidebar, click the gear icon (**Project Settings**).
2. Click **API** (or **Data API** depending on the version).
3. You'll see two values you need:
   - **Project URL** — looks like `https://abcdefghij.supabase.co`. This is your `EXPO_PUBLIC_SUPABASE_URL`.
   - **anon / public key** — a long JWT starting with `eyJ...`. This is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Copy both into a scratchpad. **Do NOT copy the `service_role` key** — that one bypasses Row-Level Security and must never go into a client-side app.

## 3. Paste into Replit (TWO places, per the screenshot)

Replit needs these in two separate sections. This is normal for Expo — secrets are for the server build, env vars are bundled into the mobile app.

### a) Secrets pane (right side of your screenshot)

Click **+ New Secret** twice and add:

| Key                              | Value                          |
|----------------------------------|--------------------------------|
| `EXPO_PUBLIC_SUPABASE_URL`       | your Project URL               |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`  | your anon key                  |

### b) Environment Variables pane (the form below "Save Variables")

Paste the **same two values** with the **same keys** into the two rows shown in your screenshot. Then click **Save Variables**.

The `EXPO_PUBLIC_` prefix is required — Expo only bundles env vars with that prefix into the mobile/web app.

## 4. Verify it picked up

Tell the Replit agent:

> Variables are saved. Restart the dev server and confirm the Supabase client initializes without errors. Then show me the login page.

If it errors with "Invalid API key" or "Invalid URL", you most likely pasted the `service_role` key by mistake, or there's a stray space at the start/end of the value.

## 5. Run the database schema

Once the project is up:

1. In Supabase, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the `tanker-q88-schema.sql` file I generated alongside this walkthrough, copy the entire contents, paste into the SQL editor, and click **Run**.
4. You should see "Success. No rows returned" — this creates all your tables, Row-Level Security policies, and triggers.

## 6. Set up storage for Q88 file uploads

Still in Supabase:

1. Go to **Storage** in the left sidebar.
2. Click **New bucket**.
3. Name it `q88-files`.
4. Keep it **Private** (the app will generate signed URLs for sharing).
5. Click **Save**.

The schema file already includes the storage policies — they just need the bucket to exist.

## 7. Seed sample data (optional but recommended)

The schema file includes a commented-out section at the bottom with sample vessels. Once you have a real owner user signed up, uncomment that block, swap in your owner's UUID, and run it. That gives the charterer dashboard something to display during testing.

## What's next after this

Once Supabase is wired up, the next things to verify with the Replit agent:

1. Login page renders and you can sign up / log in.
2. Roles work: create one owner account and one charterer account, confirm they see different dashboards.
3. RLS is actually blocking — try (in the SQL editor under "Authenticated as user X") to select another owner's vessels. It should return zero rows.

Tell me when you're past step 4 (verification) and I'll help you tackle the next blocker — most likely the Q88 PDF upload + manual entry form, since extraction can come later.
