# Production changes — 2026-07-24

## Recipe detail page

- Added share links for Telegram, WhatsApp, Facebook, X, Reddit and Pinterest (when a recipe image exists).
- Removed VK from the international share options.
- Added the native operating-system share sheet where the Web Share API is supported.
- Added a localized copy-link action.
- Increased the server-rendered similar recipe block from 4 to 8 recipes.
- Added automatic lazy loading in batches of 16, capped at 128 similar recipes total.
- Added a rate-limited read-only endpoint for lazy loading: `GET /api/v1/recipes/:id/similar`.
- Added Twitter card metadata and preserved existing Open Graph and Recipe JSON-LD metadata.

## SEO and crawlability

- Replaced the single oversized sitemap with a sitemap index at `/sitemap.xml`.
- Added a static sitemap plus separate recipe and category sitemap files.
- Limited every sitemap file to 45,000 URLs, below the 50,000-URL protocol limit.
- Added self-referencing canonical URLs for clean paginated catalog and category pages (`?page=N`).
- Added `noindex,follow` to catalog/category URLs containing search or sort parameters.
- Removed the default `sort=recent` parameter from ordinary pagination links, so clean page 2+ URLs remain indexable.
- Kept `robots.txt` pointed at `/sitemap.xml`.

## Safety and compatibility

- No Prisma schema changes.
- No database migration required.
- No environment-variable changes required.
- Existing recipe URLs, ratings, categories, app sync, admin pages and image paths are unchanged.
- Similar-recipe ranking still uses locale, category, cuisine, type, ingredients, rating and freshness.

## Deploy after `git pull`

```bash
cd /home/dishkin/htdocs/dishkin.com

git pull
npm ci
npm run build
pm2 restart dishkin-web
pm2 status

curl -I http://127.0.0.1:3000/en
curl -I http://127.0.0.1:3000/sitemap.xml
curl -s http://127.0.0.1:3000/sitemap.xml | head -30
```

`npm run build` already runs `prisma generate`. A Prisma migration is not needed for this update.

## Social sharing icon update

- Replaced text-only social network buttons with compact branded SVG icons.
- Added icons for Telegram, WhatsApp, Facebook, X, Reddit and Pinterest.
- Kept visible text on the native Share and Copy Link actions.
- Added accessible labels, native browser tooltips and keyboard focus styles.
- No new npm dependency was added.
