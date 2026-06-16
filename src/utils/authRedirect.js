export function buildAppBaseUrl(origin, basePath = '/') {
  if (!basePath || basePath === '/') return `${origin}/`;
  const path = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return `${origin}${path.endsWith('/') ? path : `${path}/`}`;
}

export function buildHashRouteRedirectUrl(origin, basePath, path = '/') {
  const hashPath = path.startsWith('/') ? path : `/${path}`;
  return `${buildAppBaseUrl(origin, basePath)}#${hashPath}`;
}

export const getAppBaseUrl = () =>
  buildAppBaseUrl(window.location.origin, import.meta.env.BASE_URL || '/');

export const getHashRouteRedirectUrl = (path = '/') =>
  buildHashRouteRedirectUrl(
    window.location.origin,
    import.meta.env.BASE_URL || '/',
    path,
  );

export const OAUTH_RETURN_TO_KEY = 'wc26-oauth-return-to';

export const rememberOAuthReturnTo = (path) => {
  if (!path || path === '/login' || path === '/register') return;
  try {
    window.sessionStorage.setItem(OAUTH_RETURN_TO_KEY, path);
  } catch {
    // Optional convenience only; onboarding still uses database state.
  }
};

export const readOAuthReturnTo = () => {
  try {
    return window.sessionStorage.getItem(OAUTH_RETURN_TO_KEY) || null;
  } catch {
    return null;
  }
};

export const clearOAuthReturnTo = () => {
  try {
    window.sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
  } catch {
    // Ignore storage failures.
  }
};

export const isSupabaseAuthCallback = () => {
  const rawHash = window.location.hash || '';
  const rawSearch = window.location.search || '';

  return (
    /(?:^|[?#/&])(access_token|refresh_token|token_hash|type|code)=/i.test(rawHash) ||
    /(?:^|[?&])(access_token|refresh_token|token_hash|type|code)=/i.test(rawSearch)
  );
};

export const hasRouterHashRoute = () => {
  const hash = window.location.hash || '';
  return /^#\/.+/.test(hash);
};

let oauthCallbackHandled = false;

export const resetOAuthCallbackHandled = () => {
  oauthCallbackHandled = false;
};

export const markOAuthCallbackHandled = () => {
  oauthCallbackHandled = true;
};

export const isOAuthCallbackHandled = () => oauthCallbackHandled;

export const shouldBlockRouterForOAuthCallback = ({
  loading = false,
  isAuthenticated = false,
} = {}) => {
  if (!isSupabaseAuthCallback()) return false;
  if (oauthCallbackHandled) return false;
  if (loading) return true;
  if (isAuthenticated) return true;
  return true;
};

export const clearSupabaseAuthCallbackParams = () => {
  const rawHash = window.location.hash || '';
  const rawSearch = window.location.search || '';
  const hadCallback =
    /(?:^|[?#/&])(access_token|refresh_token|token_hash|type|code)=/i.test(rawHash) ||
    /(?:^|[?&])(access_token|refresh_token|token_hash|type|code)=/i.test(rawSearch);

  if (!hadCallback) return;

  const cleanedHash = rawHash
    .replace(/[#&?](access_token|refresh_token|token_hash|type|code)=[^&#]*/gi, '')
    .replace(/^#&/, '#')
    .replace(/^#$/, '');

  const cleanedSearch = rawSearch
    .replace(/[?&](access_token|refresh_token|token_hash|type|code)=[^&#]*/gi, '')
    .replace(/^\?$/, '');

  const nextHash = cleanedHash && /^#\/.+/.test(cleanedHash)
    ? cleanedHash
    : '';

  const nextUrl = `${window.location.pathname}${cleanedSearch}${nextHash}`;
  const pageTitle = typeof document !== 'undefined' ? document.title : '';
  window.history.replaceState({}, pageTitle, nextUrl);
  markOAuthCallbackHandled();
};
