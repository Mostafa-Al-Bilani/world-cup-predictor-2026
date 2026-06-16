# Google OAuth Setup

This project uses Supabase Auth for Google sign-in. Configure both Google Cloud Console and Supabase before testing in production or GitHub Pages.

## Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project for World Cup Predictor 2026.
3. Configure the OAuth consent screen:
   - User type: External (unless you use Google Workspace internally)
   - App name, support email, and developer contact
   - Add scopes: `email`, `profile`, `openid`
4. Create credentials:
   - APIs & Services → Credentials → Create credentials → OAuth client ID
   - Application type: **Web application**
5. Copy the generated:
   - **Client ID**
   - **Client Secret**
6. Authorized redirect URIs:
   - Add the Supabase callback URL from your project:
     ```text
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Find the exact value in Supabase → Authentication → Providers → Google.

Do **not** put the Google Client Secret in Vite environment variables. Enter it only in Supabase.

## Supabase

1. Open your Supabase project.
2. Authentication → Providers → Google.
3. Enable Google.
4. Paste:
   - Google **Client ID**
   - Google **Client Secret**
5. Authentication → URL Configuration:
   - **Site URL** (production):
     ```text
     https://<github-username>.github.io/world-cup-predictor-2026/
     ```
   - **Additional Redirect URLs**:
     ```text
     http://localhost:5173/
     http://localhost:5173/#/login
     http://localhost:5173/#/register
     https://<github-username>.github.io/world-cup-predictor-2026/
     https://<github-username>.github.io/world-cup-predictor-2026/#/login
     https://<github-username>.github.io/world-cup-predictor-2026/#/register
     ```
6. Run the latest database migrations if your project predates Google onboarding:
   ```text
   supabase/migrations/20260616120000_google_oauth_onboarding.sql
   supabase/migrations/20260617120000_google_oauth_production_repair.sql
   ```
   Or re-run the relevant sections from `supabase/schema.sql`.

### Verify the migration in production

Run this read-only SQL in Supabase → SQL Editor:

```sql
select
  column_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'username';

select
  tgname as trigger_name,
  proname as function_name
from pg_trigger
join pg_proc on pg_proc.oid = pg_trigger.tgfoid
join pg_class on pg_class.oid = pg_trigger.tgrelid
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'auth'
  and pg_class.relname = 'users'
  and tgname = 'on_auth_user_created';
```

Expected:

- `profiles.username` → `is_nullable = YES`
- `on_auth_user_created` trigger → `handle_new_user`

If Google OAuth returns `error_code=unexpected_failure` with `Database error saving new user`, the migration was not applied or the trigger still inserts a required username for OAuth users.

## Callback error diagnosis

When Google consent succeeds but Supabase cannot create the user, Supabase redirects back with a hash such as:

```text
#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user
```

The app now blocks `HashRouter` and shows:

- a safe user-facing message
- the Supabase `error_code`
- an operator hint when the failure is database- or OAuth-configuration-related

Common causes:

1. **Database error saving new user** → apply the Google OAuth migrations above.
2. **OAuth code exchange failure** → verify Google Client ID, matching client secret, and exact Supabase callback URI in Google Cloud Console.
3. **No user in Supabase Authentication → Users** after consent → the failure happened before Supabase persisted the auth user; check Supabase Auth logs and the migration verification SQL above.

## Frontend environment

No Google secrets are required in the frontend. Keep only:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-public-anon-key>
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026
```

## Redirect behavior in this app

The app starts Google OAuth with the application base URL only (no hash route):

```javascript
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: getAppBaseUrl(),
  },
})
```

Examples:

- Localhost:
  ```text
  http://localhost:5173/
  ```
- GitHub Pages:
  ```text
  https://<github-username>.github.io/world-cup-predictor-2026/
  ```

Supabase appends OAuth tokens or codes to the return URL. The app waits for session restoration, then navigates internally to username setup, champion pick, or the remembered destination. Post-login destinations are stored in sessionStorage before OAuth starts.

## Manual verification checklist

1. Google button appears on login and register.
2. Localhost Google sign-in returns to `/` and creates a session without showing the 404 page.
3. GitHub Pages Google sign-in returns to `/world-cup-predictor-2026/` and routes internally after session restore.
4. New Google user is asked for a unique username before scoreboard access.
5. Existing email/password users keep their username and champion prediction.
6. Champion picker does not appear when a prediction row already exists.
7. Email/password login and registration still work.
