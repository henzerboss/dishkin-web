# Dishkin Recipes Website

Multilingual public recipe website for Dishkin. Stack matches `evsi.store` style: Next.js 15 App Router, Prisma, SQLite, Tailwind CSS, NextAuth credentials admin and a small custom Next server for CloudPanel.

## What is included

- Public multilingual pages: `/{locale}` and `/{locale}/recipes/{slug}`.
- Only recipes generated in the current locale are shown in that locale.
- Search, category filters, top/recent sorting.
- SEO: canonical metadata, Open Graph, `Recipe` JSON-LD, `robots.txt`, dynamic `sitemap.xml`, optimized images.
- Android/iOS install banner with Google Play/App Store links.
- Protected `/admin` page with permanent recipe deletion from the website only.
- API endpoint for the mobile app: `POST /api/v1/recipes/upsert`.
- Uploaded photos are stored under `public/uploads/recipes/YYYY/MM/`.

## Environment variables

Copy `.env.example` to `.env` and change every secret value:

```bash
cp .env.example .env
openssl rand -base64 32   # use for AUTH_SECRET
openssl rand -base64 32   # use for DISHKIN_SYNC_TOKEN
```

Important variables:

```env
NEXT_PUBLIC_SITE_URL=https://dishkin.com
DATABASE_URL="file:./data/dishkin.db"
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
AUTH_SECRET=long-random-secret
DISHKIN_SYNC_TOKEN=long-random-token
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/id6784972752
NEXT_PUBLIC_GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=store.evsi.recipesgenerator
```

The mobile app does not store this token. The app sends recipe updates to `evsi.store`, and `evsi.store` forwards them to `dishkin.com` with the server-only `DISHKIN_SYNC_TOKEN`.

Use the same `DISHKIN_SYNC_TOKEN` value on `evsi.store` and `dishkin.com`. Do not add it to EAS or to any `EXPO_PUBLIC_*` variable.

## Local development

```bash
npm ci
mkdir -p data public/uploads/recipes
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open:

- Public site: `http://localhost:3000/en`
- Admin: `http://localhost:3000/admin`

## Install on your CloudPanel server from Git

1. Create a Git repository from this folder and push it:

```bash
git init
git add .
git commit -m "Initial Dishkin website"
git branch -M main
git remote add origin git@github.com:YOUR_USER/dishkin-web.git
git push -u origin main
```

2. In CloudPanel, create a new Node.js site for `dishkin.com`.

3. Set the document/root directory to the project folder cloned from Git.

4. Set Node.js version to a modern LTS version compatible with Next.js 15, for example Node 20 or Node 22.

5. Add the environment variables from `.env.example` in CloudPanel or create `.env` in the project root.

6. In the project folder on the server, run:

```bash
npm ci
mkdir -p data public/uploads/recipes
npx prisma generate
npx prisma migrate deploy
npm run build
```

7. Set the app start command to:

```bash
npm run start
```

By default the custom `server.js` listens on `0.0.0.0:3000`, which matches the CloudPanel screenshot. If you change the application port in CloudPanel, set the same value in `.env`:

```env
PORT=3000
```

8. In Cloudflare, keep the DNS record for `dishkin.com` proxied or DNS-only as you prefer. After CloudPanel issues SSL, open `https://dishkin.com/en`.

## Updating the site later

```bash
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
# restart the Node.js app in CloudPanel
```

## API contract

The mobile app calls the safe proxy on `evsi.store`:

```http
POST https://evsi.store/api/dishkin/recipes/sync
X-Client-Token: <COOKLY_CLIENT_TOKEN>
Content-Type: application/json
```

Then `evsi.store` calls the private website endpoint:

```http
POST https://dishkin.com/api/v1/recipes/upsert
X-Dishkin-Sync-Token: <DISHKIN_SYNC_TOKEN>
Content-Type: application/json
```

Payload shape:

```json
{
  "locale": "en",
  "recipe": {
    "id": "local-recipe-id",
    "title": "Recipe title",
    "type": "generated",
    "authenticityPercent": 75,
    "cuisine": "Italian",
    "description": "Short description",
    "timeMinutes": 25,
    "difficulty": "easy",
    "servings": 2,
    "ingredients": [{ "name": "Pasta", "amount": "200 g", "status": "have" }],
    "steps": [{ "order": 1, "text": "Boil pasta." }],
    "nutrition": { "calories": 520, "protein": 18, "carbs": 80, "fat": 14 },
    "categories": ["Dinner"],
    "createdAt": 1782840000000
  },
  "rating": 5,
  "photoBase64": "optional-jpeg-base64",
  "photoMimeType": "image/jpeg"
}
```

## Security notes

- `/admin` is protected by NextAuth credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET`).
- The website sync API requires a server-only shared token from evsi.store, validates payload size, locale, recipe field lengths and image size. The token is never stored in the mobile app.
- Admin deletion is a hard delete in the website database and removes the website image file when present.
- The website never calls the app and cannot delete or modify anything inside the mobile app.
- Do not commit `.env`, database files or uploaded images.

## Load and scaling notes

The current setup is optimized for a small self-hosted VPS: indexed SQLite tables, compact server-rendered pages, lazy images and revalidation after updates. This minimizes queries and is enough for a typical content site.

No SQLite VPS setup can literally handle unlimited load. If traffic becomes very high, the architecture can be scaled without changing the app API by moving Prisma from SQLite to PostgreSQL, putting uploaded images on S3/R2, enabling Cloudflare cache rules for public pages/assets and adding a search engine such as Meilisearch for full-text search.

## PM2 on the VPS

For the current server setup, run only one PM2 process for this site under the `dishkin` user:

```bash
cd /home/dishkin/htdocs/dishkin.com
pm2 delete dishkin-web || true
PORT=3000 pm2 start npm --name dishkin-web --cwd /home/dishkin/htdocs/dishkin.com -- start
pm2 save
pm2 status
curl -I http://127.0.0.1:3000/en
```

If `pm2 status` shows two `dishkin-web` rows, delete and recreate the process as shown above. Two copies on the same port cause `EADDRINUSE: address already in use 0.0.0.0:3000`.

To enable reboot autostart without affecting `evsi.store`, create a separate PM2 service for the `dishkin` user only:

```bash
/home/dishkin/.nvm/versions/node/v22.23.1/lib/node_modules/pm2/bin/pm2 startup systemd -u dishkin --hp /home/dishkin
su - dishkin -c "/home/dishkin/.nvm/versions/node/v22.23.1/bin/pm2 save"
systemctl status pm2-dishkin
```

You should then have two independent services: `pm2-evsi.service` and `pm2-dishkin.service`.

## Notes about this fixed archive

This archive removes server-side user-agent detection from `src/app/[locale]/layout.tsx`. The Android/iOS install banner is now detected on the client in `src/components/StoreInstallBanner.tsx`, which avoids the `DYNAMIC_SERVER_USAGE` production error on `/en`.
