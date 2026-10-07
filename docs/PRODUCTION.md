# Production deployment

## Recommended architecture

- App/backend: Render or Railway
- Database/Auth/Storage/Realtime: Supabase
- Session cache: Redis
- AI/OCR: OpenAI-compatible provider
- CAPTCHA: Cloudflare Turnstile
- Error tracking: Sentry (optional)
- Push: Web Push VAPID

## Supabase

Run:

```bash
npm run db:migrate
npm run db:seed
npm run supabase:seed-auth
npm run supabase:verify
```

Use the Supabase **Session pooler** connection string for `DATABASE_URL` on IPv4 deployments. Set `PGSSL=1`.

Configure Auth:
- Site URL = your production HTTPS domain.
- Redirect URLs include your production root URL.
- Enable Email provider.
- Enable Google provider and configure Google OAuth credentials.
- Configure Turnstile CAPTCHA in Supabase Auth when using Turnstile.

## Storage

Migrations create:
- `student-work`
- `learning-materials`
- `avatars`

Uploads use Supabase Storage when Supabase Auth is enabled. Do not expose the service-role key to browser code.

## Realtime

Migrations add `classes`, `assignments`, `submissions`, `exam_rooms`, and `notifications` to the `supabase_realtime` publication.

## Render / Railway

Connect the GitHub repository and branch `main`. Both providers can auto-deploy after every push. Set all production environment variables in the provider dashboard.

Health check: `/api/health`.

Both Render and Railway terminate TLS for custom domains. Add your domain in the provider dashboard, then update DNS and set `APP_PUBLIC_URL=https://your-domain.example`.

## Push notifications

Generate VAPID keys with the installed web-push package:

```bash
npx web-push generate-vapid-keys
```

Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a valid `VAPID_SUBJECT`.

## Backups

```bash
npm run db:backup
npm run db:restore -- backups/<backup-file>.json
```

Supabase paid plans provide managed database backups. Storage objects are separate from database backups, so important object storage should also have its own retention/export plan.

## CI / browser testing

```bash
npm test
npm run test:ui
```

GitHub Actions runs Node tests first, then Playwright Chromium tests.

## Security checklist

- Never commit `.env`.
- Browser receives only Supabase URL + publishable key.
- Service-role key stays server-side only.
- Run `npm run supabase:verify` after migrations.
- Keep RLS enabled on exposed tables.
- Use HTTPS in production.
- Rotate leaked credentials immediately.
