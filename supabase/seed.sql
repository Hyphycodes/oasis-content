insert into public.locations (id, name, slug, address, timezone, operating_hours, is_active)
values ('00000000-0000-4000-8000-000000000003', 'Oasis Development Preview', 'development-preview', 'Development-only venue — not a real Oasis address', 'America/Chicago', '{}', true)
on conflict (id) do nothing;

insert into public.event_templates (name, description, defaults)
values
  ('DJ Night', 'High-energy nightlife event', '{"duration_hours":4,"age_restriction":"21+","destinations":["website","tickets","oasis_links","instagram","facebook","google_business"]}'),
  ('Banda Saturday', 'Live banda performance', '{"duration_hours":5,"age_restriction":"18+","destinations":["website","tickets","oasis_links","instagram","facebook","google_business"]}'),
  ('Brunch', 'Easygoing daytime brunch', '{"duration_hours":5,"ticket_mode":"free_rsvp","destinations":["website","oasis_links","instagram","facebook","google_business"]}'),
  ('Paint & Sip', 'Guided creative workshop', '{"duration_hours":2.5,"capacity":42,"destinations":["website","tickets","oasis_links","instagram","facebook"]}')
on conflict (name) do nothing;

-- Development-only operational examples. Never run `supabase db reset` against production.
insert into public.events (id, slug, title, eyebrow, short_description, description, status, ticket_status, starts_at, ends_at, capacity, age_restriction, primary_location_id)
values
  ('10000000-0000-4000-8000-000000000001', 'seed-paint-and-sip', 'Paint & Sip: Desert Botanicals', 'Guided workshop', 'A safe development example for the complete workshop workflow.', 'A guided local-development workshop with materials and a welcome drink included.', 'ready', 'draft', now() + interval '14 days', now() + interval '14 days 2 hours 30 minutes', 42, '21+', '00000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000002', 'seed-dj-night', 'Friday DJ Night', 'Oasis after dark', 'A safe development example for a ticketed DJ night.', 'A development-only DJ night used to test publishing, tickets, campaigns, and door operations.', 'draft', 'draft', now() + interval '21 days', now() + interval '21 days 4 hours', 220, '21+', '00000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

insert into public.event_locations (event_id, location_id)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003')
on conflict do nothing;

insert into public.ticket_types (id, event_id, name, description, price_cents, capacity, max_per_order)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Workshop admission', 'Materials and welcome drink included', 3800, 42, 6),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'General admission', 'One admission to Friday DJ Night', 1800, 220, 8)
on conflict (id) do nothing;

insert into public.content_items (id, event_id, location_id, title, body, status, content_type)
values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Paint & Sip launch', 'Development sample: gather, paint desert botanicals, and make a night of it at Oasis.', 'draft', 'social')
on conflict (id) do nothing;

insert into public.customers (id, email, phone, first_name, last_name, source, tags)
values ('40000000-0000-4000-8000-000000000001', 'sample.customer@example.com', null, 'Sample', 'Customer', 'development_seed', array['development'])
on conflict (id) do nothing;

insert into public.promoters (id, name, email, social_handle, notes, default_comp_limit, is_active)
values ('50000000-0000-4000-8000-000000000001', 'Sample Promoter', 'sample.promoter@example.com', '@samplepromoter', 'Development sample promoter', 4, true)
on conflict (id) do nothing;

insert into public.promoter_links (id, promoter_id, event_id, code, destination_url)
values ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'sample-dj', '/e/seed-dj-night?ref=sample-dj')
on conflict (id) do nothing;
