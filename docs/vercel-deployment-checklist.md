# Vercel Deployment Checklist

This runbook is for shipping `scheduler-app` to the linked Vercel project in `.vercel/project.json` (`automated-schedular`).

## Current Readiness Snapshot

- `npm run build` is the release gate and must pass before Preview or Production rollout.
- `npm run lint` is still noisy across the repo and is tracked as follow-up cleanup, not as a deployment blocker.
- The Next.js 16 middleware deprecation has been handled by moving route protection to [`src/proxy.ts`](../src/proxy.ts).
- Scratch release artifacts are ignored so Preview reviews focus on shipped behavior only.

## Required Environment Variables

Confirm both Vercel Preview and Vercel Production have the values this branch needs:

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `AUTH_URL` or `NEXTAUTH_URL`
- `AUTH_TRUST_HOST`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `NEXT_PUBLIC_APP_URL`

Optional Supabase variables may still be present, but this branch's deployment-critical server paths are driven by Prisma, auth, and SMTP.

## Preview Rollout

1. Pull the Vercel Preview environment locally if needed.
   ```powershell
   npx vercel pull --environment=preview
   ```
2. Confirm Preview and Production env vars are populated.
   ```powershell
   npx vercel env ls preview
   npx vercel env ls production
   ```
3. Build locally in a production-like environment.
   ```powershell
   npm run build
   ```
4. Deploy the branch to Preview.
   ```powershell
   npx vercel deploy
   ```

## Database Rollout

This branch adds only query indexes. They are additive and should be applied through Prisma migrations, not `db push`.

1. Ensure the new migration is present in source control:
   [`prisma/migrations/20260319173000_add_scheduler_indexes/migration.sql`](../prisma/migrations/20260319173000_add_scheduler_indexes/migration.sql)
2. Apply migrations in the target environment:
   ```powershell
   npx prisma migrate deploy
   ```
3. If you need to inspect migration state before rollout:
   ```powershell
   npx prisma migrate status
   ```

## Preview Smoke Test

Validate the branch on the Preview URL before merging to `main`:

- Login works and unauthenticated users are redirected away from `/admin`.
- `/admin/roster` loads, switches month, and renders roster summaries.
- Excel export downloads successfully and uses `/roster-template.xlsx`.
- PDF export attempts `/api/roster-print/pdf`.
- If server PDF export fails, the app opens `/roster-print?month=YYYY-MM` so the user can save via browser print.
- Roster import still completes and refreshes the grid.
- Publish flow works without accidentally using production SMTP credentials in Preview.
- Staff schedule pages still load for published data.

## Production Rollout

1. Merge the validated branch into `main`.
2. Apply `npx prisma migrate deploy` against the production database.
3. Trigger or observe the Vercel Production deployment from `main`.
4. Run a quick live smoke test:
   - admin login
   - roster load
   - one export path
   - one publish path
   - one staff schedule page

## Follow-up Work

- Reduce repo-wide lint failures so `npm run lint` can become a future release gate.
- Revisit the server-side PDF route if Preview shows Chromium packaging/runtime issues on Vercel.
- Keep environment values out of committed `.env` files and rotate any secrets that were ever checked into local config.
