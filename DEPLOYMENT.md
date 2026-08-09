# Deployment

CodePilot AI is a TanStack Start SSR application. Its UI and server functions are
one application: deploy the complete application to **either Vercel or Render**.
The repository contains build configuration for both providers.

> A Vercel static frontend plus a separate Render API is not an available
> configuration for this codebase. The authenticated GitHub and review actions
> use TanStack Start same-origin `/_serverFn/*` RPC routes. Splitting them needs
> a deliberate API extraction and a client migration; deploying both copies
> without that migration creates two independent backends.

## Environment variables

Copy `.env.example` locally and set the following values in the selected host:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; required by GitHub connections)
- `LOVABLE_API_KEY` or `OPENAI_API_KEY` (server-only; required by code review)
- `OPENAI_BASE_URL`, `OPENAI_MODEL` if you are using an OpenAI-compatible API host
- `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_TOKEN_ENC_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `OPENAI_API_KEY`, GitHub
secrets, or the encryption key as `VITE_*` variables. Keep `GITHUB_TOKEN_ENC_KEY`
stable: changing it makes already stored GitHub tokens unreadable.

## Render

Create a Blueprint from this repository; `render.yaml` supplies the commands.
For a manual Web Service, use Node 22, build command `npm ci && npm run build:render`,
and start command `node .output/server/index.mjs`. Render provides `PORT`
automatically. Use `GET /api/health` as the health check path.

## Vercel

Import this repository with Framework Preset **Other**. `vercel.json` uses
`npm ci` and `npm run build:vercel`, which emits the Vercel Build Output API and
handles SSR and deep links. Configure every environment variable listed above,
including the server-only values, because Vercel hosts the server functions.

## Provider dashboard configuration

- In Supabase Auth, set the Site URL and redirect URLs to the deployed app URL
  (and your local development URL). Enable and configure Google there if using
  Google sign-in.
- In GitHub OAuth App settings, set the authorization callback URL to
  `https://<your-app-domain>/api/public/github/callback`.
- Apply the SQL migrations in `supabase/migrations` to the target Supabase project
  before enabling the deployment.
