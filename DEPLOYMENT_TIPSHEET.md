# Deployment Tip Sheet (Cloudflare Pages)

## What you’re deploying
- A React + TypeScript (Vite) app.
- Knowledge base is static JSON under `public/kb/` and will be served at `/kb/*`.

## Local run (optional)
1) Install Node.js (LTS recommended).
2) In the project folder:
   - `npm install`
   - `npm run dev`
3) Open the printed localhost URL.

## Cloudflare Pages deployment (Git = source of truth)
1) Push this folder to a GitHub repo.
2) Cloudflare Dashboard → Pages → Create project → Connect to GitHub repo.
3) Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
4) Deploy.

## Verify KB is served
After deploy, confirm these URLs work:
- `https://<your-site>/kb/manifest.json`
- `https://<your-site>/kb/search_index.json`

## How KB updates work (no admin panel needed)
1) Edit `public/kb/sources.json` and `public/kb/source_sections.json`.
2) Bump `kb_version` and add a changelog entry in `public/kb/manifest.json`.
3) Commit + push → Pages redeploys.

## Cache safety
- The app cache-busts `manifest.json` by adding `?v=timestamp` at runtime.
- Tree files (future) should be versioned filenames.

## Printing
- Open Packet Draft → “Preview / Print Packet” (opens `/packet`).
- Use browser Print → Save as PDF.

## Common gotchas
- Don’t open `dist/index.html` by double-click (file://). Use Cloudflare Pages URL or `npm run preview`.
- If the GitHub repo doesn’t appear in Cloudflare: GitHub Settings → Installed GitHub Apps → Cloudflare Pages → Configure repository access.
