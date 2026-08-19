-- Oasis Admin foundation
-- Apply with `supabase db push` after linking a Supabase project.

create extension if not exists pgcrypto;

create type public.app_role as enum ('door', 'staff', 'manager', 'owner');
create type public.event_status as enum ('draft', 'ready', 'published', 'cancelled', 'completed');
create type public.ticket_status as enum ('draft', 'on_sale', 'paused', 'sold_out', 'ended');
create type public.order_status as enum ('pending', 'paid', 'refunded', 'partially_refunded', 'cancelled');
create type public.publish_status as enum ('pending', 'queued', 'processing', 'succeeded', 'failed', 'disabled');
create type public.content_status as enum ('draft', 'ready', 'scheduled', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key public.app_role not null unique,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

insert into public.roles (key, name, description) values
  ('door', 'Door', 'Scans tickets and searches the active event roster.'),
  ('staff', 'Event / Content Staff', 'Creates events and content, publishes, and sees basic sales.'),
  ('manager', 'Manager', 'Manages guests, refunds, analytics, campaigns, menu, and templates.'),
  ('owner', 'Owner / Admin', 'Manages locations, team access, integrations, and sensitive settings.')
on conflict (key) do nothing;

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text not null,
  phone text,
  website_url text,
  timezone text not null default 'America/Chicago',
  operating_hours jsonb not null default '{}'::jsonb,
  google_business_location_name text,
  meta_page_id text,
  meta_instagram_account_id text,
  reservation_url text,
  menu_url text,
  maps_url text,
  default_event_settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  defaults jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text,
  short_description text,
  description text,
  status public.event_status not null default 'draft',
  ticket_status public.ticket_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  doors_at timestamptz,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  capacity integer not null default 0 check (capacity >= 0),
  tickets_sold integer not null default 0 check (tickets_sold >= 0),
  reserved_count integer not null default 0 check (reserved_count >= 0),
  checked_in_count integer not null default 0 check (checked_in_count >= 0),
  gross_revenue_cents integer not null default 0 check (gross_revenue_cents >= 0),
  age_restriction text,
  hero_image_url text,
  hero_image_alt text,
  primary_location_id uuid references public.locations(id) on delete restrict,
  template_id uuid references public.event_templates(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_event_range check (ends_at > starts_at),
  constraint valid_event_sales check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at),
  constraint capacity_not_oversold check (tickets_sold + reserved_count <= capacity)
);

create table public.event_locations (
  event_id uuid not null references public.events(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (event_id, location_id)
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  fee_cents integer not null default 0 check (fee_cents >= 0),
  capacity integer not null check (capacity >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  min_per_order integer not null default 1 check (min_per_order > 0),
  max_per_order integer not null default 10 check (max_per_order >= min_per_order),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  is_hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_type_not_oversold check (sold_count <= capacity)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  first_name text,
  last_name text,
  marketing_email_consent boolean not null default false,
  marketing_sms_consent boolean not null default false,
  source text,
  tags text[] not null default '{}',
  notes text,
  total_spend_cents integer not null default 0,
  visit_count integer not null default 0,
  last_seen_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_contact check (email is not null or phone is not null)
);

create unique index customers_email_unique on public.customers (lower(email)) where email is not null and archived_at is null;
create unique index customers_phone_unique on public.customers (phone) where phone is not null and archived_at is null;

create table public.promoters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  social_handle text,
  notes text,
  commission_metadata jsonb not null default '{}'::jsonb,
  default_comp_limit integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promoter_links (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.promoters(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  code text not null unique,
  destination_url text not null,
  click_count integer not null default 0,
  conversion_count integer not null default 0,
  revenue_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  event_id uuid not null references public.events(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  promoter_link_id uuid references public.promoter_links(id) on delete set null,
  promo_code_id uuid references public.promo_codes(id) on delete set null,
  status public.order_status not null default 'pending',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  fee_cents integer not null default 0,
  total_cents integer not null default 0,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  secure_order_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  code text not null unique default encode(gen_random_bytes(18), 'hex'),
  attendee_name text,
  status text not null default 'valid' check (status in ('valid', 'checked_in', 'void', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  checked_in_by uuid references public.profiles(id) on delete set null,
  device_label text,
  checked_in_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete set null
);

create unique index one_active_checkin_per_ticket on public.ticket_checkins (ticket_id) where reversed_at is null;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  reason text,
  stripe_refund_id text unique,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  email text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'waiting' check (status in ('waiting', 'invited', 'converted', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index waitlist_one_active_entry_per_email on public.waitlist_entries (event_id, lower(email)) where status in ('waiting', 'invited');

create table public.guest_groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  promoter_id uuid references public.promoters(id) on delete set null,
  comp_limit integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_group_id uuid references public.guest_groups(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  email text,
  phone text,
  party_size integer not null default 1 check (party_size > 0),
  guest_type text not null default 'guest' check (guest_type in ('guest', 'owner_guest', 'comp', 'influencer', 'promoter', 'artist', 'staff', 'partner', 'vip', 'other')),
  notes text,
  checked_in_count integer not null default 0 check (checked_in_count >= 0 and checked_in_count <= party_size),
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  event_type text not null check (event_type in ('view', 'rsvp', 'purchase', 'check_in', 'refund', 'email_open', 'link_click')),
  source text,
  value_cents integer,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null unique,
  public_url text,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  width integer,
  height integer,
  duration_seconds numeric,
  alt_text text,
  tags text[] not null default '{}',
  drive_file_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  title text not null,
  body text,
  status public.content_status not null default 'draft',
  content_type text not null default 'social' check (content_type in ('social', 'email', 'website', 'announcement')),
  primary_media_asset_id uuid references public.media_assets(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_variants (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  destination text not null,
  copy text not null,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_item_id, destination)
);

create table public.publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  status public.publish_status not null default 'pending',
  workflow_run_id text unique,
  idempotency_key text not null unique,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint publishing_job_object check (num_nonnulls(event_id, content_item_id) = 1)
);

create table public.publishing_destinations (
  id uuid primary key default gen_random_uuid(),
  publishing_job_id uuid not null references public.publishing_jobs(id) on delete cascade,
  destination text not null check (destination in ('website', 'tickets', 'oasis_links', 'google_drive', 'instagram', 'facebook', 'google_business')),
  status public.publish_status not null default 'pending',
  external_id text,
  external_url text,
  idempotency_key text not null unique,
  attempt_count integer not null default 0,
  last_error_code text,
  last_error_message text,
  last_attempted_at timestamptz,
  succeeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (publishing_job_id, destination)
);

create table public.campaign_schedules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete cascade,
  name text not null,
  preset_key text,
  timezone text not null default 'America/Chicago',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_object check (num_nonnulls(event_id, content_item_id) >= 1)
);

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  campaign_schedule_id uuid not null references public.campaign_schedules(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete cascade,
  destination text not null,
  scheduled_for timestamptz not null,
  status public.publish_status not null default 'pending',
  publishing_job_id uuid references public.publishing_jobs(id) on delete set null,
  workflow_run_id text,
  external_id text,
  attempt_count integer not null default 0,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete cascade,
  name text not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_section_id uuid not null references public.menu_sections(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_asset_id uuid references public.media_assets(id) on delete set null,
  dietary_tags text[] not null default '{}',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete cascade,
  key text not null,
  title text,
  body text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, key)
);

create unique index site_content_scope_key_unique
on public.site_content (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'resend', 'meta', 'google_business', 'google_drive', 'openai')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'needs_attention')),
  external_account_label text,
  encrypted_config jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, provider)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  object_type text not null,
  object_id text not null,
  location_id uuid references public.locations(id) on delete set null,
  changes jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in ('page_view', 'link_click', 'event_view', 'checkout_start', 'purchase', 'check_in')),
  visitor_id text,
  customer_id uuid references public.customers(id) on delete set null,
  oasis_event_id uuid references public.events(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  source text,
  referrer text,
  path text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.processed_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  payload_sha256 text,
  processed_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create index events_starts_at_idx on public.events (starts_at) where archived_at is null;
create index events_location_idx on public.events (primary_location_id, starts_at) where archived_at is null;
create index ticket_types_event_idx on public.ticket_types (event_id, sort_order);
create index orders_event_created_idx on public.orders (event_id, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index tickets_event_status_idx on public.tickets (event_id, status);
create index guests_event_idx on public.guests (event_id, checked_in_at);
create index customer_events_customer_idx on public.customer_events (customer_id, occurred_at desc);
create index customer_events_event_idx on public.customer_events (event_id, occurred_at desc);
create index content_items_event_idx on public.content_items (event_id, created_at desc);
create index media_assets_event_idx on public.media_assets (event_id, created_at desc) where archived_at is null;
create index publishing_jobs_event_idx on public.publishing_jobs (event_id, created_at desc);
create index scheduled_posts_due_idx on public.scheduled_posts (scheduled_for) where status = 'pending';
create index audit_log_object_idx on public.audit_log (object_type, object_id, created_at desc);
create index analytics_events_name_time_idx on public.analytics_events (event_name, occurred_at desc);
create index analytics_events_oasis_event_idx on public.analytics_events (oasis_event_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','locations','event_templates','events','ticket_types','customers','promoters','orders','tickets',
    'refunds','waitlist_entries','guests','media_assets','content_items','content_variants','publishing_destinations',
    'campaign_schedules','scheduled_posts','menus','menu_sections','menu_items','site_content','integrations'
  ] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select (
    select r.key
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
    order by case r.key when 'owner' then 4 when 'manager' then 3 when 'staff' then 2 else 1 end desc
    limit 1
  )
  ;
$$;

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and case
        when required_role = 'owner' then r.key = 'owner'
        when required_role = 'manager' then r.key in ('manager', 'owner')
        when required_role = 'staff' then r.key in ('staff', 'manager', 'owner')
        when required_role = 'door' then r.key in ('door', 'manager', 'owner')
        else false
      end
  );
$$;

create or replace function public.reserve_ticket_inventory(p_ticket_type_id uuid, p_quantity integer)
returns public.ticket_types
language plpgsql
security definer
set search_path = public
as $$
declare reserved public.ticket_types;
declare target_event_id uuid;
begin
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  select event_id into target_event_id from public.ticket_types where id = p_ticket_type_id for update;
  update public.events
  set reserved_count = reserved_count + p_quantity
  where id = target_event_id and tickets_sold + reserved_count + p_quantity <= capacity;
  if not found then raise exception 'Event capacity is no longer available in that quantity'; end if;
  update public.ticket_types
  set sold_count = sold_count + p_quantity
  where id = p_ticket_type_id
    and sold_count + p_quantity <= capacity
    and (sale_starts_at is null or sale_starts_at <= now())
    and (sale_ends_at is null or sale_ends_at >= now())
  returning * into reserved;
  if reserved.id is null then
    update public.events set reserved_count = greatest(0, reserved_count - p_quantity) where id = target_event_id;
    raise exception 'Tickets are no longer available in that quantity';
  end if;
  return reserved;
end;
$$;

create or replace function public.release_ticket_inventory(p_ticket_type_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ticket_types
  set sold_count = greatest(0, sold_count - greatest(0, p_quantity))
  where id = p_ticket_type_id;
  update public.events e
  set reserved_count = greatest(0, reserved_count - greatest(0, p_quantity))
  where e.id = (select event_id from public.ticket_types where id = p_ticket_type_id);
end;
$$;

create or replace function public.record_promoter_click(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promoter_links
  set click_count = click_count + 1
  where code = p_code;
$$;

create or replace function public.fulfill_paid_order(p_order_id uuid, p_payment_intent_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare item record;
declare ticket_index integer;
declare created_count integer := 0;
begin
  update public.orders
  set status = 'paid', stripe_payment_intent_id = p_payment_intent_id, paid_at = coalesce(paid_at, now())
  where id = p_order_id and status = 'pending';
  if not found then return 0; end if;

  for item in select * from public.order_items where order_id = p_order_id loop
    for ticket_index in 1..item.quantity loop
      insert into public.tickets (order_id, order_item_id, event_id, ticket_type_id, customer_id)
      select p_order_id, item.id, o.event_id, item.ticket_type_id, o.customer_id
      from public.orders o where o.id = p_order_id;
      created_count := created_count + 1;
    end loop;
  end loop;

  update public.events e
  set tickets_sold = tickets_sold + created_count,
      reserved_count = greatest(0, reserved_count - created_count),
      gross_revenue_cents = gross_revenue_cents + (select total_cents from public.orders where id = p_order_id)
  where e.id = (select event_id from public.orders where id = p_order_id);
  update public.customers c
  set total_spend_cents = total_spend_cents + (select total_cents from public.orders where id = p_order_id),
      last_seen_at = now()
  where c.id = (select customer_id from public.orders where id = p_order_id);
  insert into public.customer_events (customer_id, event_id, event_type, source, value_cents, metadata)
  select o.customer_id, o.event_id, 'purchase', case when o.promoter_link_id is null then 'direct' else 'promoter' end, o.total_cents, jsonb_build_object('orderId',o.id)
  from public.orders o where o.id = p_order_id and o.customer_id is not null;
  insert into public.analytics_events (event_name, customer_id, oasis_event_id, source, properties)
  select 'purchase', o.customer_id, o.event_id, case when o.promoter_link_id is null then 'direct' else 'promoter' end, jsonb_build_object('orderId',o.id,'revenueCents',o.total_cents,'ticketCount',created_count)
  from public.orders o where o.id = p_order_id;
  update public.promoter_links pl
  set conversion_count = conversion_count + 1,
      revenue_cents = revenue_cents + (select total_cents from public.orders where id = p_order_id)
  where pl.id = (select promoter_link_id from public.orders where id = p_order_id);
  return created_count;
end;
$$;

create or replace function public.check_in_ticket(p_code text, p_device_label text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target public.tickets;
declare existing_checkin public.ticket_checkins;
declare customer_name text;
declare ticket_type_name text;
begin
  if not (public.has_role('door') or public.has_role('staff')) then raise exception 'Not authorized'; end if;
  select * into target from public.tickets where code = p_code for update;
  if target.id is null then return jsonb_build_object('result','invalid'); end if;
  if target.status = 'refunded' then return jsonb_build_object('result','refunded'); end if;
  if target.status = 'void' then return jsonb_build_object('result','invalid'); end if;
  select * into existing_checkin from public.ticket_checkins where ticket_id = target.id and reversed_at is null limit 1;
  if existing_checkin.id is not null then return jsonb_build_object('result','already_used','checkedInAt',existing_checkin.checked_in_at); end if;

  insert into public.ticket_checkins (ticket_id, event_id, checked_in_by, device_label)
  values (target.id, target.event_id, auth.uid(), p_device_label);
  update public.tickets set status = 'checked_in' where id = target.id;
  update public.events set checked_in_count = checked_in_count + 1 where id = target.event_id;
  update public.customers set visit_count = visit_count + 1, last_seen_at = now() where id = target.customer_id;
  insert into public.customer_events (customer_id, event_id, event_type, source, metadata)
  select target.customer_id, target.event_id, 'check_in', 'door', jsonb_build_object('ticketId',target.id) where target.customer_id is not null;
  insert into public.analytics_events (event_name, customer_id, oasis_event_id, source, properties)
  values ('check_in', target.customer_id, target.event_id, 'door', jsonb_build_object('ticketId',target.id));
  select trim(concat_ws(' ', c.first_name, c.last_name)) into customer_name from public.customers c where c.id = target.customer_id;
  select tt.name into ticket_type_name from public.ticket_types tt where tt.id = target.ticket_type_id;
  insert into public.audit_log (actor_id, action, object_type, object_id, changes)
  values (auth.uid(), 'ticket.checked_in', 'ticket', target.id::text, jsonb_build_object('device', p_device_label));
  return jsonb_build_object('result','valid','name',coalesce(nullif(customer_name,''),target.attendee_name,'Guest'),'ticketType',ticket_type_name,'checkedInAt',now());
end;
$$;

create or replace function public.check_in_guest(p_guest_id uuid, p_quantity integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target public.guests;
declare accepted integer;
begin
  if not (public.has_role('door') or public.has_role('staff')) then raise exception 'Not authorized'; end if;
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  select * into target from public.guests where id = p_guest_id for update;
  if target.id is null then return jsonb_build_object('result','invalid'); end if;
  accepted := least(p_quantity, target.party_size - target.checked_in_count);
  if accepted <= 0 then return jsonb_build_object('result','already_used','name',target.name,'checkedInAt',target.checked_in_at); end if;
  update public.guests set checked_in_count = checked_in_count + accepted, checked_in_at = case when checked_in_count + accepted = party_size then now() else checked_in_at end, checked_in_by = auth.uid() where id = target.id;
  update public.events set checked_in_count = checked_in_count + accepted where id = target.event_id;
  update public.customers set visit_count = visit_count + accepted, last_seen_at = now() where id = target.customer_id;
  insert into public.customer_events (customer_id, event_id, event_type, source, metadata)
  select target.customer_id, target.event_id, 'check_in', 'guest_list', jsonb_build_object('guestId',target.id,'quantity',accepted) where target.customer_id is not null;
  insert into public.analytics_events (event_name, customer_id, oasis_event_id, source, properties)
  values ('check_in', target.customer_id, target.event_id, 'guest_list', jsonb_build_object('guestId',target.id,'quantity',accepted));
  insert into public.audit_log (actor_id, action, object_type, object_id, changes)
  values (auth.uid(), 'guest.checked_in', 'guest', target.id::text, jsonb_build_object('quantity',accepted));
  return jsonb_build_object('result','valid','name',target.name,'ticketType',concat(accepted,' guest',case when accepted = 1 then '' else 's' end),'checkedInAt',now(),'remaining',target.party_size - target.checked_in_count - accepted);
end;
$$;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.locations enable row level security;
alter table public.event_templates enable row level security;
alter table public.events enable row level security;
alter table public.event_locations enable row level security;
alter table public.ticket_types enable row level security;
alter table public.customers enable row level security;
alter table public.promoters enable row level security;
alter table public.promoter_links enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_checkins enable row level security;
alter table public.refunds enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.guest_groups enable row level security;
alter table public.guests enable row level security;
alter table public.customer_events enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_items enable row level security;
alter table public.content_variants enable row level security;
alter table public.publishing_jobs enable row level security;
alter table public.publishing_destinations enable row level security;
alter table public.campaign_schedules enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.menus enable row level security;
alter table public.menu_sections enable row level security;
alter table public.menu_items enable row level security;
alter table public.site_content enable row level security;
alter table public.integrations enable row level security;
alter table public.audit_log enable row level security;
alter table public.analytics_events enable row level security;
alter table public.processed_webhooks enable row level security;

create policy "authenticated team can read profiles" on public.profiles for select to authenticated using (true);
create policy "users can update their profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "roles are readable" on public.roles for select to authenticated using (true);
create policy "owners manage roles" on public.user_roles for all to authenticated using (public.has_role('owner')) with check (public.has_role('owner'));
create policy "users read their roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role('owner'));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'event_templates','events','event_locations','ticket_types','promo_codes',
    'waitlist_entries','media_assets',
    'content_items','content_variants','publishing_jobs','publishing_destinations','campaign_schedules','scheduled_posts','menus',
    'menu_sections','menu_items','site_content','audit_log'
  ] loop
    execute format('create policy "team read %I" on public.%I for select to authenticated using (true)', table_name, table_name);
    execute format('create policy "staff write %I" on public.%I for insert to authenticated with check (public.has_role(''staff''))', table_name, table_name);
    execute format('create policy "staff update %I" on public.%I for update to authenticated using (public.has_role(''staff'')) with check (public.has_role(''staff''))', table_name, table_name);
  end loop;
end;
$$;

create policy "team read locations" on public.locations for select to authenticated using (true);
create policy "owners create locations" on public.locations for insert to authenticated with check (public.has_role('owner'));
create policy "owners update locations" on public.locations for update to authenticated using (public.has_role('owner')) with check (public.has_role('owner'));
create policy "owners delete locations" on public.locations for delete to authenticated using (public.has_role('owner'));

create policy "managers manage refunds" on public.refunds for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers read refunds" on public.refunds for select to authenticated using (public.has_role('manager'));
create policy "managers manage customers" on public.customers for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage customer activity" on public.customer_events for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage promoters" on public.promoters for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage promoter links" on public.promoter_links for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage guest groups" on public.guest_groups for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage guests" on public.guests for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "door reads active guests" on public.guests for select to authenticated using (public.has_role('door') and exists (select 1 from public.events e where e.id = event_id and e.starts_at > now() - interval '12 hours' and e.starts_at < now() + interval '36 hours'));
create policy "door reads active tickets" on public.tickets for select to authenticated using (public.has_role('door') and exists (select 1 from public.events e where e.id = event_id and e.starts_at > now() - interval '12 hours' and e.starts_at < now() + interval '36 hours'));
create policy "managers manage orders" on public.orders for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage order items" on public.order_items for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage tickets" on public.tickets for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers manage checkins" on public.ticket_checkins for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy "managers delete menu items" on public.menu_items for delete to authenticated using (public.has_role('manager'));
create policy "managers delete menu sections" on public.menu_sections for delete to authenticated using (public.has_role('manager'));
create policy "managers delete site content drafts" on public.site_content for delete to authenticated using (public.has_role('manager'));
create policy "owners manage integrations" on public.integrations for all to authenticated using (public.has_role('owner')) with check (public.has_role('owner'));
create policy "managers view integration health" on public.integrations for select to authenticated using (public.has_role('manager'));
create policy "public records safe analytics events" on public.analytics_events for insert to anon, authenticated with check (event_name in ('page_view','link_click','event_view','checkout_start'));
create policy "managers read analytics events" on public.analytics_events for select to authenticated using (public.has_role('manager'));

-- Public read access is intentionally limited to published event and menu content.
create policy "public reads published events" on public.events for select to anon using (status = 'published' and archived_at is null);
create policy "public reads event locations" on public.event_locations for select to anon using (exists (select 1 from public.events e where e.id = event_id and e.status = 'published' and e.archived_at is null));
create policy "public reads locations" on public.locations for select to anon using (is_active);
create policy "public reads on-sale ticket types" on public.ticket_types for select to anon using (exists (select 1 from public.events e where e.id = event_id and e.status = 'published') and not is_hidden);
create policy "public reads published menus" on public.menus for select to anon using (is_published);
create policy "public reads published menu sections" on public.menu_sections for select to anon using (exists (select 1 from public.menus m where m.id = menu_id and m.is_published));
create policy "public reads available menu items" on public.menu_items for select to anon using (is_available and exists (select 1 from public.menu_sections s join public.menus m on m.id = s.menu_id where s.id = menu_section_id and m.is_published));
create policy "public reads site content" on public.site_content for select to anon using (is_published);

create or replace view public.event_economics
with (security_invoker = true)
as
select
  e.id,
  e.title,
  e.starts_at,
  e.primary_location_id,
  e.capacity,
  e.tickets_sold,
  e.checked_in_count,
  e.gross_revenue_cents,
  case when e.capacity > 0 then round((e.tickets_sold::numeric / e.capacity) * 100, 1) else 0 end as sell_through_percent,
  case when e.tickets_sold > 0 then round((e.checked_in_count::numeric / e.tickets_sold) * 100, 1) else 0 end as show_rate_percent,
  coalesce((select sum(r.amount_cents) from public.refunds r join public.orders o on o.id = r.order_id where o.event_id = e.id and r.status = 'succeeded'), 0) as refunded_cents,
  coalesce((select count(*) from public.orders o where o.event_id = e.id and o.status in ('paid','partially_refunded')), 0) as paid_orders,
  coalesce((select count(*) from public.analytics_events a where a.oasis_event_id = e.id and a.event_name = 'event_view'), 0) as event_views,
  coalesce((select count(*) from public.analytics_events a where a.oasis_event_id = e.id and a.event_name = 'checkout_start'), 0) as checkout_starts
from public.events e
where e.archived_at is null;

revoke all on function public.reserve_ticket_inventory(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_ticket_inventory(uuid, integer) to service_role;
revoke all on function public.release_ticket_inventory(uuid, integer) from public, anon, authenticated;
grant execute on function public.release_ticket_inventory(uuid, integer) to service_role;
revoke all on function public.record_promoter_click(text) from public, anon, authenticated;
grant execute on function public.record_promoter_click(text) to service_role;
revoke all on function public.fulfill_paid_order(uuid, text) from public, anon, authenticated;
grant execute on function public.fulfill_paid_order(uuid, text) to service_role;
revoke all on function public.check_in_ticket(text, text) from public, anon;
grant execute on function public.check_in_ticket(text, text) to authenticated;
revoke all on function public.check_in_guest(uuid, integer) from public, anon;
grant execute on function public.check_in_guest(uuid, integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oasis-media', 'oasis-media', true, 104857600, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime'])
on conflict (id) do nothing;

create policy "public reads oasis media" on storage.objects for select using (bucket_id = 'oasis-media');
create policy "team uploads oasis media" on storage.objects for insert to authenticated with check (bucket_id = 'oasis-media' and public.has_role('staff'));
create policy "team updates oasis media" on storage.objects for update to authenticated using (bucket_id = 'oasis-media' and public.has_role('staff'));
create policy "managers delete oasis media" on storage.objects for delete to authenticated using (bucket_id = 'oasis-media' and public.has_role('manager'));
