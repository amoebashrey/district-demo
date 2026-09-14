-- Inventory stub. In prod this is District's internal ticketing/dining inventory behind an interface;
-- in the prototype it is seeded from fixtures/out and read by the rules-based candidate generator (§6.5 stage 1).

create table inventory_dining (
  id                uuid primary key,
  city              text not null,
  area              text not null,
  lat               double precision not null,
  lng               double precision not null,
  name              text not null,
  cuisines          text[] not null,
  price_band        budget_band not null,
  avg_cost_per_head int not null,
  dietary_ok        text[] not null default '{}',
  rating            numeric(2,1) not null,
  vibe_tags         text[] not null default '{}',
  created_at        timestamptz not null default now()
);
create index inventory_dining_city_idx on inventory_dining(city, price_band);

create table inventory_dining_slots (
  id            uuid primary key,
  venue_id      uuid not null references inventory_dining(id) on delete cascade,
  starts_at     timestamptz not null,
  capacity_left int not null check (capacity_left >= 0),
  status        inventory_status not null default 'available'
);
create index inventory_dining_slots_venue_time_idx on inventory_dining_slots(venue_id, starts_at);
create index inventory_dining_slots_time_idx on inventory_dining_slots(starts_at) where status = 'available';

create table inventory_events (
  id               uuid primary key,
  city             text not null,
  area             text not null,
  lat              double precision not null,
  lng              double precision not null,
  title            text not null,
  category         text not null,
  genre_tags       text[] not null default '{}',
  starts_at        timestamptz not null,
  duration_min     int not null,
  price_per_ticket int not null,
  tickets_left     int not null check (tickets_left >= 0),
  status           inventory_status not null default 'available',
  vibe_tags        text[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index inventory_events_city_time_idx on inventory_events(city, starts_at);

create table inventory_movies (
  id               uuid primary key,
  city             text not null,
  area             text not null,
  lat              double precision not null,
  lng              double precision not null,
  title            text not null,
  genre_tags       text[] not null default '{}',
  language         text not null,
  cinema           text not null,
  starts_at        timestamptz not null,
  duration_min     int not null,
  price_per_ticket int not null,
  seats_left       int not null check (seats_left >= 0),
  status           inventory_status not null default 'available',
  created_at       timestamptz not null default now()
);
create index inventory_movies_city_time_idx on inventory_movies(city, starts_at);
