-- Row Level Security. Roles follow Supabase: anon / authenticated / service_role.
-- Server code that must act across users (booking, lock, invite-by-token) uses service_role;
-- everything user-facing goes through authenticated + these policies.

-- membership helper (security definer so it can read plan_members regardless of caller's policies)
create or replace function is_plan_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from plan_members m
    where m.plan_id = p and m.user_id = auth.uid() and m.deleted_at is null
      and m.rsvp_status in ('invited','joined')
  ) or exists (select 1 from plans where id = p and creator_id = auth.uid());
$$;
create or replace function is_plan_organiser(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plans where id = p and creator_id = auth.uid())
      or exists (select 1 from plan_members m where m.plan_id = p and m.user_id = auth.uid() and m.role = 'organiser' and m.deleted_at is null);
$$;

do $$ declare t text;
begin
  foreach t in array array['users','taste_profiles','social_edges','plans','plan_members','invites','invite_optouts',
                           'suggestions','votes','bookings','splits','rides','events',
                           'inventory_dining','inventory_dining_slots','inventory_events','inventory_movies']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant select on inventory_dining, inventory_dining_slots, inventory_events, inventory_movies to anon;

-- users: see yourself, your friends, and co-members of your plans
create policy users_select on users for select to authenticated using (
  id = auth.uid()
  or exists (select 1 from social_edges e where e.user_id = auth.uid() and e.friend_id = users.id and e.status = 'active')
  or exists (select 1 from plan_members m join plan_members me on me.plan_id = m.plan_id
             where m.user_id = users.id and me.user_id = auth.uid() and m.deleted_at is null and me.deleted_at is null)
);
create policy users_update_self on users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- taste: strictly your own (curation reads aggregates via service_role)
create policy taste_self on taste_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- graph: your own edges
create policy edges_self on social_edges for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- plans: members read; creator inserts/updates (state transitions happen in functions later)
-- creator_id checked inline (not via helper) so INSERT ... RETURNING can see its own new row
create policy plans_select on plans for select to authenticated using (creator_id = auth.uid() or is_plan_member(id));
create policy plans_insert on plans for insert to authenticated with check (creator_id = auth.uid());
create policy plans_update on plans for update to authenticated using (is_plan_organiser(id)) with check (is_plan_organiser(id));

-- members: visible to fellow members; organiser manages; a member may leave (update own row)
create policy members_select on plan_members for select to authenticated using (is_plan_member(plan_id));
create policy members_insert on plan_members for insert to authenticated with check (is_plan_organiser(plan_id) or user_id = auth.uid());
create policy members_update on plan_members for update to authenticated using (is_plan_organiser(plan_id) or user_id = auth.uid());

-- invites: organiser/inviter sees + creates; invitee sees their own once linked
create policy invites_select on invites for select to authenticated using (is_plan_organiser(plan_id) or inviter_id = auth.uid() or invitee_user_id = auth.uid());
create policy invites_insert on invites for insert to authenticated with check (is_plan_member(plan_id) and inviter_id = auth.uid());
create policy invites_update on invites for update to authenticated using (is_plan_organiser(plan_id) or invitee_user_id = auth.uid());

-- opt-outs: you can register your own; reads are service-only
create policy optouts_insert on invite_optouts for insert to authenticated with check (user_id = auth.uid() or user_id is null);

-- suggestions: members read (writes are service_role via curation)
create policy suggestions_select on suggestions for select to authenticated using (is_plan_member(plan_id));

-- votes: members read tallies; cast/re-cast only your own
create policy votes_select on votes for select to authenticated using (is_plan_member(plan_id));
create policy votes_upsert on votes for insert to authenticated with check (user_id = auth.uid() and is_plan_member(plan_id));
create policy votes_recast on votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and is_plan_member(plan_id));
create policy votes_withdraw on votes for delete to authenticated using (user_id = auth.uid());

-- bookings: members read; writes are service_role (booking service)
create policy bookings_select on bookings for select to authenticated using (is_plan_member(plan_id));

-- splits: you see your own share and, if organiser, everyone's status
create policy splits_select on splits for select to authenticated using (user_id = auth.uid() or is_plan_organiser(plan_id));

-- rides: your own, plus share-token reads handled server-side
create policy rides_self on rides for select to authenticated using (user_id = auth.uid());

-- analytics: clients may append their own events, never read
create policy events_insert on events for insert to authenticated, anon with check (user_id is null or user_id = auth.uid());

-- inventory: public read
create policy inv_dining_read on inventory_dining for select to anon, authenticated using (true);
create policy inv_slots_read  on inventory_dining_slots for select to anon, authenticated using (true);
create policy inv_events_read on inventory_events for select to anon, authenticated using (true);
create policy inv_movies_read on inventory_movies for select to anon, authenticated using (true);
