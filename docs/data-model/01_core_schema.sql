-- District Plans — core schema (PRD §6.3). Supabase Postgres.
-- Conventions: uuid PKs, created_at/updated_at + deleted_at (soft delete) everywhere,
-- status columns as enums, state transitions enforced in Phase 2 via functions.

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type plan_status      as enum ('draft','voting','locked','booked','completed','cancelled','expired');
create type rsvp_status      as enum ('invited','joined','declined','left');
create type member_role      as enum ('organiser','member');
create type edge_source      as enum ('contacts','co-attendance','invite');
create type edge_status      as enum ('active','blocked','removed');
create type suggestion_kind  as enum ('night_bundle');
create type booking_category as enum ('dining','movie','event','ride');
create type booking_status   as enum ('pending','confirmed','failed','cancelled','refunded');
create type refund_status    as enum ('none','pending','refunded','failed');
create type split_status     as enum ('pending','authorised','captured','failed','refunded');
create type ride_status      as enum ('requested','confirmed','en_route','completed','cancelled');
create type invite_channel   as enum ('link','contact');
create type invite_status    as enum ('pending','accepted','declined','opted_out','expired','revoked');
create type budget_band      as enum ('₹','₹₹','₹₹₹','₹₹₹₹');
create type inventory_status as enum ('available','sold_out','cancelled');

-- ---------- helpers ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- users & graph ----------
create table users (
  id               uuid primary key default gen_random_uuid(), -- = auth.users.id in Supabase; FK deferred to Phase 2 (light auth)
  phone            text unique,
  name             text not null,
  city             text not null,
  home_area        text,
  persona          text,                      -- synthetic only; not in prod
  taste_profile_id uuid,                      -- set after taste_profiles insert
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table taste_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references users(id) on delete cascade,
  cuisine_vec      jsonb not null default '{}',
  genre_vec        jsonb not null default '{}',
  price_band       budget_band not null default '₹₹',
  fav_areas        text[] not null default '{}',
  dietary          text not null default 'none',
  time_pattern     jsonb not null default '{}',
  travel_tolerance_km int not null default 8,
  source           text not null default 'district',  -- 'synthetic' in fixtures
  last_built_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table users add constraint users_taste_fk foreign key (taste_profile_id) references taste_profiles(id) deferrable initially deferred;

create table social_edges (
  user_id     uuid not null references users(id) on delete cascade,
  friend_id   uuid not null references users(id) on delete cascade,
  source      edge_source not null,
  status      edge_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index social_edges_friend_idx on social_edges(friend_id);

-- ---------- plans ----------
create table plans (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references users(id),
  city         text not null,
  date_start   date not null,
  date_end     date not null,
  vibe         text,
  budget_band  budget_band not null default '₹₹',
  status       plan_status not null default 'draft',
  quorum       int  not null default 2 check (quorum >= 2),
  lock_rule    text not null default 'majority',    -- 'majority' | 'organiser_confirms' (open question §11)
  share_token  text not null unique default translate(encode(gen_random_bytes(9), 'base64'), '+/=', '-_'),
  invite_cap   int  not null default 12,             -- spam guardrail: max invites per plan
  expires_at   timestamptz,
  locked_at    timestamptz,
  locked_suggestion_id uuid,                          -- FK added after suggestions
  experiment_variant text,                            -- 'control' | 'treatment' (Phase 5)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  check (date_end >= date_start)
);
create index plans_creator_idx on plans(creator_id);
create index plans_status_idx  on plans(status) where deleted_at is null;

create table plan_members (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references plans(id) on delete cascade,
  user_id       uuid references users(id),            -- null while a link-invitee is pending
  display_name  text not null,
  rsvp_status   rsvp_status not null default 'invited',
  role          member_role not null default 'member',
  joined_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create unique index plan_members_unique_user on plan_members(plan_id, user_id) where user_id is not null and deleted_at is null;
create index plan_members_user_idx on plan_members(user_id);

create table invites (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references plans(id) on delete cascade,
  inviter_id     uuid not null references users(id),
  channel        invite_channel not null,
  token          text not null unique default translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_'),
  contact_hash   text,                                 -- sha256(phone) for contact invites; raw phone never stored pre-join
  invitee_user_id uuid references users(id),
  status         invite_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  responded_at   timestamptz
);
create index invites_plan_idx on invites(plan_id);
create index invites_contact_idx on invites(contact_hash);

-- opt-out registry: honoured instantly, feeds the primary guardrail metric
create table invite_optouts (
  contact_hash  text primary key,
  user_id       uuid references users(id),
  reason        text,                                  -- 'opt_out' | 'spam_report'
  created_at    timestamptz not null default now()
);

-- ---------- curation output ----------
create table suggestions (
  id                     uuid primary key default gen_random_uuid(),
  plan_id                uuid not null references plans(id) on delete cascade,
  kind                   suggestion_kind not null default 'night_bundle',
  title                  text not null,
  components             jsonb not null,               -- [{kind:'event'|'dining'|'movie'|'ride', ref, starts_at, ...}]
  est_cost_per_head      int not null check (est_cost_per_head >= 0),
  score                  numeric(6,3) not null default 0,
  rationale              text,
  availability_checked_at timestamptz,
  is_available           boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);
create index suggestions_plan_idx on suggestions(plan_id);
alter table plans add constraint plans_locked_suggestion_fk foreign key (locked_suggestion_id) references suggestions(id);

create table votes (
  plan_id       uuid not null references plans(id) on delete cascade,
  suggestion_id uuid not null references suggestions(id) on delete cascade,
  user_id       uuid not null references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (plan_id, user_id)                      -- one active vote per member; upsert to re-cast
);
create index votes_suggestion_idx on votes(suggestion_id);

-- ---------- money & logistics ----------
create table bookings (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references plans(id) on delete cascade,
  suggestion_id  uuid not null references suggestions(id),
  category       booking_category not null,
  inventory_ref  text not null,                        -- provider/inventory id (slot id, showtime id, event id)
  provider       text not null default 'mock',
  provider_ref   text,
  status         booking_status not null default 'pending',
  amount         int not null check (amount >= 0),     -- INR, total for group
  quoted_amount  int not null check (quoted_amount >= 0), -- price shown at vote time; must equal amount charged
  refund_status  refund_status not null default 'none',
  failure_reason text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index bookings_plan_idx on bookings(plan_id);

create table splits (
  id                  uuid primary key default gen_random_uuid(),
  plan_id             uuid not null references plans(id) on delete cascade,
  booking_id          uuid references bookings(id) on delete cascade,
  user_id             uuid not null references users(id),
  amount              int not null check (amount >= 0),
  payment_intent_ref  text,
  provider            text not null default 'mock',
  status              split_status not null default 'pending',
  failure_reason      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (plan_id, booking_id, user_id)
);
create index splits_user_idx on splits(user_id);

create table rides (                                    -- P1; designed now, unused until Phase 6
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references plans(id) on delete cascade,
  user_id      uuid not null references users(id),
  provider     text not null default 'mock',
  provider_ref text,
  status       ride_status not null default 'requested',
  share_token  text unique,                             -- opt-in share-my-trip
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- analytics (append-only) ----------
create table events (
  id                 bigint generated always as identity primary key,
  name               text not null,
  user_id            uuid,
  plan_id            uuid,
  props              jsonb not null default '{}',
  experiment_variant text,
  ts                 timestamptz not null default now()
);
create index events_name_ts_idx on events(name, ts);
create index events_plan_idx on events(plan_id);

-- ---------- updated_at triggers ----------
do $$ declare t text;
begin
  foreach t in array array['users','taste_profiles','social_edges','plans','plan_members','invites','suggestions','votes','bookings','splits','rides']
  loop execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t); end loop;
end $$;

-- ---------- data-layer invariants (state machine details land in Phase 2) ----------
-- votes only while the plan is voting; late votes after lock are rejected at the DB, not just the API
create or replace function votes_require_voting_status() returns trigger language plpgsql as $$
declare s plan_status;
begin
  select status into s from plans where id = new.plan_id;
  if s is distinct from 'voting' then
    raise exception 'plan % is % — voting closed', new.plan_id, s using errcode = 'check_violation';
  end if;
  if not exists (select 1 from suggestions where id = new.suggestion_id and plan_id = new.plan_id and deleted_at is null) then
    raise exception 'suggestion does not belong to plan' using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;
create trigger votes_require_voting before insert or update on votes for each row execute function votes_require_voting_status();

-- analytics is append-only
create or replace function reject_mutation() returns trigger language plpgsql as $$
begin raise exception 'events is append-only' using errcode = 'insufficient_privilege'; end $$;
create trigger events_immutable before update or delete on events for each row execute function reject_mutation();
