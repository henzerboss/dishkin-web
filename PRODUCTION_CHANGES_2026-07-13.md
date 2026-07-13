# dishkin.com — production changes (2026-07-13)

## What changed

- Added a paginated, cached public recipe catalog API:
  - `GET /api/v1/recipes`
  - `GET /api/v1/recipes/:id`
- Added language-aware catalog selection. English is returned only when the requested language has no recipes.
- Extended recipe rating API to support an anonymous per-install app voter ID while preserving existing browser-cookie and legacy app behavior.
- Added query indexes for catalog language, rating, update time, and title.
- Added bounded rate-limit cleanup to avoid unbounded in-memory bucket growth.

## Database migration

Run the normal Prisma production migration command used by this project. The new migration only creates indexes with `IF NOT EXISTS`; it does not delete or rewrite recipe or vote data.

```bash
npx prisma migrate deploy
```

Then build and restart the application using the existing production process.

## Compatibility

Existing website routes, browser voting, and the legacy recipe upsert API remain supported. Deploy this project before releasing the updated mobile app.
