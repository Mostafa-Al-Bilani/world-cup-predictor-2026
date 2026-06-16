import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAppBaseUrl,
  buildHashRouteRedirectUrl,
  isSupabaseAuthCallback,
} from '../src/utils/authRedirect.js';

test.beforeEach(() => {
  globalThis.window = {
    location: {
      origin: 'http://localhost:5173',
      pathname: '/',
      search: '',
      hash: '',
    },
    history: {
      replaceState() {},
    },
    sessionStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
  };
});

test.afterEach(() => {
  delete globalThis.window;
});

test('builds localhost hash redirect for login', () => {
  assert.equal(
    buildHashRouteRedirectUrl('http://localhost:5173', '/', '/login'),
    'http://localhost:5173/#/login',
  );
});

test('builds GitHub Pages hash redirect with repository base path', () => {
  assert.equal(
    buildHashRouteRedirectUrl(
      'https://mostafa-al-bilani.github.io',
      '/world-cup-predictor-2026/',
      '/login',
    ),
    'https://mostafa-al-bilani.github.io/world-cup-predictor-2026/#/login',
  );
});

test('buildAppBaseUrl preserves localhost root', () => {
  assert.equal(buildAppBaseUrl('http://localhost:5173', '/'), 'http://localhost:5173/');
});

test('detects Supabase auth callback tokens in hash', () => {
  window.location.hash = '#/login#access_token=abc&refresh_token=def';
  assert.equal(isSupabaseAuthCallback(), true);
});

test('detects Supabase auth callback code in search params', () => {
  window.location.hash = '';
  window.location.search = '?code=abc123';
  assert.equal(isSupabaseAuthCallback(), true);
});
