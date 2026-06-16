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

export {
  clearSupabaseAuthCallbackParams,
  isSupabaseAuthCallback,
} from './authCallback.js';
