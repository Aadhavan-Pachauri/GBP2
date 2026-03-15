# Web App (Vercel)

Next.js web UI for the backend API.

## Configure

Create `app/web/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://YOUR-NGROK-URL
```

If your ngrok URL changes, you can also set it in the UI:
- `Settings` → API base → Save

## Run locally

```bash
cd app/web
npm install
npm run dev
```
