# Deploy skyprep-admin (Vercel)

Staff admin SPA (Vite + React). Calls:

- **skyprep-classroom-backend** — auth, users, invitations (`VITE_API_BASE_URL`)
- **skyprep-test-backend** — Tests menu (`VITE_TEST_BANK_API_BASE_URL` + `VITE_TEST_BANK_API_KEY`)

| | Staging | Production |
|---|---------|------------|
| **Branch** | `develop` | `main` |
| **Vercel scope** | Preview | Production |
| **Env template** | `.env.staging.example` | `.env.production.example` |
| **Suggested domain** | `admin-dev.skyprepaero.com` | `admin.skyprepaero.com` |

Deploy **classroom-backend** and **test-backend** staging before admin staging.

---

## Staging

1. Vercel → import **skyprep-admin** → Framework **Vite**, Build `npm run build`, Output `dist`.
2. **Preview** env vars from `.env.staging.example`.
3. `VITE_TEST_BANK_API_KEY` must match **test-backend** Preview and differ from production.
4. Push `develop` → deploy.
5. Set classroom-backend Preview `ADMIN_FRONTEND_URL` to this app’s URL → redeploy backend.

## Production

1. **Production** env vars from `.env.production.example` (new API key for test-bank).
2. Merge `develop` → `main`, push.
3. Domain `admin.skyprepaero.com`.
4. Backend `ADMIN_FRONTEND_URL` = production admin URL.

---

## Notes

- `VITE_API_BASE_URL` and `VITE_TEST_BANK_API_BASE_URL` must include **`/api/v1`**.
- `VITE_TEST_BANK_API_KEY` is embedded in the client bundle (required for direct test-bank calls from the Tests UI).
- Local: `cp .env.example .env` then `npm run dev`.
