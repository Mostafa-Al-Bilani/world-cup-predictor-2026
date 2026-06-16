# Authentication

## Registration

Registration collects:

- email;
- username;
- password;
- World Cup champion selection.

Supabase Auth creates the account. A profile row is created automatically.

When email confirmation is required, the selected champion can be stored temporarily in session storage and submitted after confirmation and login.

## Password policy

New passwords must:

- contain at least 10 characters;
- include at least one uppercase letter;
- include at least one lowercase letter;
- include at least one number.

Client-side validation follows the configured Supabase password policy. Keep both policies aligned when changing authentication settings.

The login form requires a non-empty current password but does not reapply registration complexity rules to an existing account password.

## Team-list loading during registration

Registration requires a valid champion selection.

If the World Cup team list cannot be loaded:

- registration remains blocked;
- the form displays an explicit warning;
- the user can select **Retry loading teams**;
- the previously entered form values remain intact.

Do not replace this failure state with a fabricated team list.

## Login

The login form uses Supabase email and password authentication.

Users can also choose **Continue with Google** on both the login and registration screens. Google sign-in uses the same Supabase OAuth action in both places and returns through the configured hash routes.

Google users without a chosen username are redirected to `#/setup-username` before accessing scoreboard features. See [Google OAuth Setup](./google-oauth-setup.md) for dashboard configuration.

Users with unconfirmed email addresses receive a safe message and can resend the confirmation email.

Authentication form focus and scrolling use cancellable timers so route changes or component unmounts do not leave stale focus callbacks.

## Email confirmation

When confirmation is required:

1. the account is created;
2. the selected champion is stored temporarily;
3. the form displays a confirmation message;
4. the user can resend the confirmation email;
5. the resend button shows a busy state;
6. after confirmation and login, the champion gate completes the pending selection.

## Champion gate

Authenticated non-admin users complete onboarding in this order:

1. ensure a profile row exists;
2. choose a unique username when missing (`#/setup-username`);
3. choose a champion prediction when no row exists and predictions are still open (`#/champion-pick`).

The champion picker uses `public.world_cup_winner_predictions` as the source of truth. Users with an existing prediction are never prompted again.

Admins are not forced through onboarding gates.

## Sign out

Sign-out is guarded against duplicate clicks.

While the request is running:

- the button is disabled;
- its label changes to `Logging out...`;
- repeated requests are ignored;
- the mobile navigation closes when sign-out finishes.

## Confirmation dialogs

Reusable confirmation dialogs support:

- keyboard focus on open;
- Escape to close when not busy;
- backdrop click to close when not busy;
- disabled actions while the operation is running;
- focus restoration and cleanup;
- dialog semantics for assistive technology.

These dialogs must not allow duplicate destructive or administrative submissions.

## Password recovery

Flow:

1. open `#/forgot-password`;
2. submit the account email;
3. receive a Supabase recovery email;
4. open the link in the same browser;
5. the application detects the recovery session;
6. the user is redirected to `#/reset-password`;
7. the user sets a password that satisfies the current policy;
8. the user is signed out;
9. the user logs in with the new password.

## Supabase Site URL

Use:

```text
https://<github-username>.github.io/<repository-name>/
```

## Redirect URLs

Add:

```text
http://localhost:5173/
http://localhost:5173/#/reset-password
https://<github-username>.github.io/<repository-name>/
https://<github-username>.github.io/<repository-name>/#/reset-password
```

## GitHub Pages fallback

`public/404.html` converts clean paths back into HashRouter routes.

If the repository name changes, update:

- `VITE_GITHUB_REPOSITORY_NAME`;
- the repository base inside `public/404.html`.

## Confirmation email troubleshooting

- Use the resend-confirmation action.
- Wait for the current resend request to finish before trying again.
- Check spam and junk folders.
- Review Supabase Auth email logs.
- Verify confirmation emails are enabled.
- Verify redirect URLs exactly match the deployment.
- Configure custom SMTP when the default sender is delayed or filtered.

## Recovery troubleshooting

- Confirm the new password satisfies the 10-character, uppercase, lowercase, and numeric policy.
- Request a new recovery email.
- Open the most recent recovery link.
- Use the same browser.
- Verify the base URL and reset route are allowed.
- Confirm the application detects the Supabase recovery event.
