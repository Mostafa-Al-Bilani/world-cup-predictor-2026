# Database Reference

## Core tables

### `profiles`

Stores:

- user ID;
- email;
- username;
- admin flag;
- combined score totals;
- winner points;
- exact-score points;
- champion points;
- bracket points;
- correct finished predictions;
- finished prediction count.

### `matches`

Stores:

- fixture number;
- teams;
- kickoff;
- stage;
- status;
- score;
- result;
- venue, city, and host country;
- provider metadata;
- elapsed time;
- provider status detail;
- synced goal events;
- halftime score;
- synchronization timestamp.

Important live columns:

```text
elapsed
status_detail
goal_events
halftime_team_a_score
halftime_team_b_score
provider_name
provider_fixture_id
last_synced_at
```

`goal_events` is JSONB. Each normalized entry can contain:

```json
{
  "side": "team_a",
  "minute": "34'",
  "clock": 2040,
  "player": "Player Name",
  "own_goal": false,
  "penalty": false
}
```

Notes:

- `side` is normalized to `team_a` or `team_b`;
- `minute` is provider display text;
- `clock` is the provider numeric clock where available;
- `player` may be null when ESPN omits athlete data;
- shootout attempts are excluded from ordinary goal events;
- the frontend renders this timeline only during a live match phase.

### `predictions`

Stores one prediction per user per match:

- predicted result;
- predicted Team A score;
- predicted Team B score;
- correctness;
- winner points;
- exact-score points;
- total match points.

The unique constraint is:

```text
(user_id, match_id)
```

### `world_cup_winner_predictions`

Stores one locked champion pick per user.

### `stage_predictions`

Stores one prediction per user per bracket stage.

### `stage_prediction_windows`

Stores opening and locking timestamps for bracket stages.

### Group tables

```text
groups
group_members
group_invitations
```

### Synchronization tables

```text
sync_logs
public_latest_successful_sync
```

### Public leaderboard table

```text
public_leaderboard_profiles
```

## Public-safe views

```text
leaderboard_profiles
latest_successful_sync
```

These views expose public data without exposing private profile email or admin fields.

## Important scoring functions

```text
recalculate_match_points(target_match_id uuid)
recalculate_profile_totals(target_user_id uuid)
recalculate_champion_points()
recalculate_stage_prediction_points(target_stage text default null)
```

## User-facing prediction functions

```text
set_world_cup_winner_prediction(team_name text)
save_stage_prediction(target_stage text, selected_teams text[])
```

## Group functions

```text
create_private_group(group_name text, group_description text)
join_group_by_invite_code(invite_code text)
invite_group_member(target_group_id uuid, target_user_id uuid)
respond_group_invitation(invitation_id uuid, response_status text)
remove_group_member(target_group_id uuid, target_user_id uuid)
leave_group(target_group_id uuid)
regenerate_group_invite_code(target_group_id uuid)
update_group_details(target_group_id uuid, group_name text, group_description text)
update_group_live_predictions_setting(target_group_id uuid, enabled boolean)
get_live_group_predictions(target_group_id uuid)
search_profiles_for_invite(target_group_id uuid, search_query text)
delete_private_group(target_group_id uuid)
```

## Bracket window functions

```text
refresh_stage_prediction_windows()
stage_prediction_lock_at(stage_name text)
```

## Match scoring

For a finished match:

```text
winner_points =
  predicted_result == final_result ? 1 : 0

exact_score_points =
  winner_points == 1
  and predicted scores match final scores
  ? 1
  : 0
```

## Profile total

```text
total_points =
  match_winner_points
  + exact_score_points
  + champion_points
  + bracket_points
```

## Accuracy

```text
accuracy =
  correct finished predictions
  / finished predictions
```

Future predictions are not counted in the denominator.

## RLS summary

### Public

Can read:

- matches;
- public leaderboard;
- latest successful sync;
- bracket windows.

### Authenticated users

Can:

- read and update permitted personal prediction data;
- read private groups they belong to;
- read their invitations;
- execute granted champion, bracket, and group RPC functions.

### Admins

Can:

- manage matches;
- inspect sync logs;
- perform administrative scoring operations.

### Service role

Can:

- update provider data, including `goal_events`;
- insert logs;
- execute protected scoring functions.

## Trigger responsibilities

Triggers enforce or synchronize:

- profile creation;
- public leaderboard rows;
- public latest-sync row;
- prediction lock rules;
- score completeness;
- score/result consistency;
- profile totals;
- bracket windows.

## Schema upgrade note

Existing projects must rerun the latest `supabase/schema.sql` to add:

```text
matches.goal_events jsonb
```

The schema uses:

```sql
alter table public.matches
add column if not exists goal_events jsonb;
```

Deploy the updated Edge Function only after the database accepts this column.

## Security notes

- Do not grant browser users direct write access to trusted point fields.
- Do not expose `profiles.email` publicly.
- Do not disable RLS to work around application errors.
- Use RPC functions for sensitive multi-step operations.
- Keep function `search_path` hardened.
