# Authentication

## Registration

Registration collects:

- email;
- username;
- password;
- champion selection.

Supabase Auth creates the account. A profile row is created automatically.

When email confirmation is required, the selected champion can be stored temporarily in session storage and submitted after confirmation and login.

## Login

The login form uses Supabase email and password authentication.

Users with unconfirmed email addresses receive a safe user-facing message and can resend the confirmation email.

## Champion gate

Authenticated non-admin users without a champion prediction are redirected to:

```text
#/champion-pick
```

The champion pick locks after submission.

## Password recovery

Flow:

1. open `#/forgot-password`;
2. submit the account email;
3. receive a Supabase recovery email;
4. open the link in the same browser;
5. the application detects the recovery session;
6. the user is redirected to `#/reset-password`;
7. the user sets a new password;
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
http://localhost:5173/#/login
http://localhost:5173/#/reset-password
https://<github-username>.github.io/<repository-name>/
https://<github-username>.github.io/<repository-name>/#/login
https://<github-username>.github.io/<repository-name>/#/reset-password
```

## GitHub Pages fallback

`public/404.html` converts clean paths back into HashRouter routes.

If the repository name changes, update:

- `VITE_GITHUB_REPOSITORY_NAME`;
- the repository base inside `public/404.html`.

## Confirmation email troubleshooting

- Use the resend-confirmation action.
- Check spam and junk folders.
- Review Supabase Auth email logs.
- Verify confirmation emails are enabled.
- Verify redirect URLs exactly match the deployment.
- Configure custom SMTP when the default sender is delayed or filtered.

## Recovery troubleshooting

- Request a new recovery email.
- Open the most recent recovery link.
- Use the same browser.
- Verify the base URL and reset route are allowed.
- Confirm the application detects the Supabase recovery event.
