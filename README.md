# Image Puller

A Shopify embedded admin app that downloads product images by `details.product_style` metafield.

## What it does

- Accept a list of style numbers (comma- or line-delimited).
- Search the Shopify store for products with a matching `details.product_style` product metafield.
- Collect every product image.
- Return a ZIP of the images at either the original resolution or a requested max width/height/crop.

## Tech stack

- [React Router 7](https://reactrouter.com/) framework
- [Shopify app package for React Router](https://shopify.dev/docs/api/shopify-app-react-router)
- [Netlify](https://www.netlify.com/) hosting (via `@netlify/vite-plugin-react-router`)
- [Prisma](https://www.prisma.io/) with SQLite for session storage in development

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SHOPIFY_APP_URL` (e.g. `https://your-app.netlify.app`)
   - `SCOPES` (defaults to `read_products`)
   - `DATABASE_URL` (defaults to `file:./dev.sqlite` for local dev)

2. Register the app in the Shopify Partner Dashboard and paste the `client_id` into `shopify.app.toml`.

3. Make sure the `details.product_style` product metafield is created in the store and has **filtering enabled** for the `products` query filter to work.

## Local development

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Build

```bash
npm run build
```

## Netlify deploy

1. Connect the repo to a new Netlify site.
2. Set the build command to `npm run build` and publish directory to `build/client`.
3. Add the same environment variables from `.env` in the Netlify dashboard.
4. Update `SHOPIFY_APP_URL` and the Shopify app settings to the Netlify production URL.

## Notes

- Netlify Functions have a 60 second execution limit and a ~20 MB streamed response size. Very large image sets may need to be split into smaller batches.
- For production, replace the SQLite `DATABASE_URL` with a persistent PostgreSQL or other database the session store can use on Netlify.
