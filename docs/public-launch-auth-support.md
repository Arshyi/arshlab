# ARSHLAB Public Launch Auth And Support Notes

ARSHLAB v13.1.0 polishes public account entry points and adds optional creator support. This release does not change scanner engines, OCR, molecular compiler internals, chemistry engines, middleware, Supabase schema, or solver calculations.

## Environment Variables

Authentication uses the existing public Supabase variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a fallback

App URL redirects use:

- `ARSHLAB_SITE_URL` for server-side redirects
- `NEXT_PUBLIC_ARSHLAB_SITE_URL` or `NEXT_PUBLIC_SITE_URL` for client-side auth redirect hints
- `VERCEL_URL` as a server fallback when available

Creator support uses:

- `ARSHLAB_SUPPORT_URL`
- `NEXT_PUBLIC_ARSHLAB_SUPPORT_URL` as an optional fallback

Do not store service-role keys in frontend variables.

## Supabase Dashboard Settings

Before public launch, configure Supabase Auth so users return to ARSHLAB, not the Supabase dashboard.

Set **Site URL** to the production ARSHLAB URL, for example:

- `https://arshlab.vercel.app`

Add **Redirect URLs** for production and local development:

- `https://arshlab.vercel.app/auth/callback`
- `http://localhost:3000/auth/callback`

If a custom domain is used, add that callback too:

- `https://your-domain.example/auth/callback`

Update Supabase email templates so the wording and links describe ARSHLAB account access. The email should tell users they are confirming an ARSHLAB account, not requesting Supabase project or dashboard access.

## Public Auth Routes

- `/auth/sign-in` focuses the sign-in form.
- `/auth/sign-up` focuses the sign-up form.
- `/auth/callback` exchanges Supabase auth codes server-side and redirects to `/account`.
- `/account` remains the signed-in account dashboard and fallback auth page.

User-facing callback states include:

- Confirmed email
- Email confirmation pending
- Expired or invalid link
- Wrong or missing redirect callback code
- Supabase not configured
- Generic callback exchange failure

## Creator Support Policy

ARSHLAB support is intentionally non-intrusive:

- No popups
- No nags
- No premium feature unlocks
- No priority access
- No grades, tutoring, or advantage claims
- No in-app stored payment data

The `/support` page opens the configured third-party provider only if a support URL exists.
