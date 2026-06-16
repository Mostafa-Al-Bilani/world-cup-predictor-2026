import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

test('Google OAuth migration allows null usernames for OAuth providers', () => {
  const migrationSource = readSource(
    'supabase/migrations/20260616120000_google_oauth_onboarding.sql',
  );
  const repairSource = readSource(
    'supabase/migrations/20260617120000_google_oauth_production_repair.sql',
  );

  assert.match(migrationSource, /alter column username drop not null/i);
  assert.match(repairSource, /alter column username drop not null/i);
});

test('handle_new_user leaves Google OAuth username null when metadata is missing', () => {
  const migrationSource = readSource(
    'supabase/migrations/20260617120000_google_oauth_production_repair.sql',
  );

  assert.match(
    migrationSource,
    /metadata_username text := nullif\(trim\(coalesce\(new\.raw_user_meta_data->>'username', ''\)\), ''\)/,
  );
  assert.match(migrationSource, /else\s+profile_username := null;/);
  assert.match(migrationSource, /on conflict \(id\) do nothing/);
});

test('profile trigger stores Google full name and avatar from provider metadata', () => {
  const migrationSource = readSource(
    'supabase/migrations/20260617120000_google_oauth_production_repair.sql',
  );

  assert.match(migrationSource, /raw_user_meta_data->>'name'/);
  assert.match(migrationSource, /raw_user_meta_data->>'picture'/);
  assert.match(migrationSource, /full_name, avatar_url/);
});

test('ensure_user_profile remains idempotent for linked identities', () => {
  const migrationSource = readSource(
    'supabase/migrations/20260617120000_google_oauth_production_repair.sql',
  );
  const profileServiceSource = readSource('src/services/profileService.js');

  assert.match(migrationSource, /if existing\.id is not null then\s+return existing;/);
  assert.match(migrationSource, /on conflict \(id\) do nothing/);
  assert.match(profileServiceSource, /ensure_user_profile/);
});

test('leaderboard sync skips users without usernames', () => {
  const migrationSource = readSource(
    'supabase/migrations/20260617120000_google_oauth_production_repair.sql',
  );

  assert.match(
    migrationSource,
    /if new\.username is null or trim\(new\.username\) = '' then[\s\S]*delete from public\.public_leaderboard_profiles/,
  );
});

test('auth.users trigger is recreated after handle_new_user replacement', () => {
  const migrationSource = readSource(
    'supabase/migrations/20260617120000_google_oauth_production_repair.sql',
  );

  assert.match(migrationSource, /drop trigger if exists on_auth_user_created on auth\.users;/);
  assert.match(migrationSource, /create trigger on_auth_user_created/);
});

test('schema.sql matches Google OAuth onboarding trigger behavior', () => {
  const schemaSource = readSource('supabase/schema.sql');
  const migrationSource = readSource(
    'supabase/migrations/20260617120000_google_oauth_production_repair.sql',
  );

  assert.match(schemaSource, /profile_username := null;/);
  assert.match(schemaSource, /alter column username drop not null/i);
  assert.match(migrationSource, /profile_username := null;/);
});
