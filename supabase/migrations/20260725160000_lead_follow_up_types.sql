-- Configurable follow-up types (phone call, email, site visit, …) on company settings,
-- plus a type id on each lead follow-up row.

alter table public.company_settings
  add column if not exists lead_follow_up_types jsonb not null default '[]'::jsonb;

update public.company_settings
set lead_follow_up_types = '[
  {"id":"phone_call","label":"Phone call"},
  {"id":"email","label":"Email"},
  {"id":"site_visit","label":"Site visit"}
]'::jsonb
where lead_follow_up_types = '[]'::jsonb
   or lead_follow_up_types is null
   or jsonb_typeof(lead_follow_up_types) <> 'array'
   or jsonb_array_length(lead_follow_up_types) = 0;

alter table public.lead_follow_ups
  add column if not exists follow_up_type_id text;
