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
6. Run the latest database migration if your project predates Google onboarding:
   ```text
   supabase/migrations/20260616120000_google_oauth_onboarding.sql
   ```
   Or re-run the relevant sections from `supabase/schema.sql`.

## Frontend environment

No Google secrets are required in the frontend. Keep only:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-public-anon-key>
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026
```

## Redirect behavior in this app

The app starts Google OAuth with:

```javascript
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}${basePath}#/login`
  }
})
```

Examples:

- Localhost:
  ```text
  http://localhost:5173/#/login
  ```
- GitHub Pages:
  ```text
  https://<github-username>.github.io/world-cup-predictor-2026/#/login
  ```

After Google redirects through Supabase, the app restores the session, completes username onboarding if needed, then champion onboarding if needed.

## Manual verification checklist

1. Google button appears on login and register.
2. Localhost Google sign-in returns to `/#/login` and creates a session.
3. GitHub Pages Google sign-in returns to `/world-cup-predictor-2026/#/login`.
4. New Google user is asked for a unique username before scoreboard access.
5. Existing email/password users keep their username and champion prediction.
6. Champion picker does not appear when a prediction row already exists.
7. Email/password login and registration still work.
