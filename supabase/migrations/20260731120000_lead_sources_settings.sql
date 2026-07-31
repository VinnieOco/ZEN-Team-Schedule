-- Configurable lead sources on company settings.
-- Drop the hard source CHECK so custom source ids can be stored on leads.

alter table public.company_settings
  add column if not exists lead_sources jsonb not null default '[]'::jsonb;

update public.company_settings
set lead_sources = '[
  {"id":"architect","label":"Architect"},
  {"id":"past_client","label":"Past client"},
  {"id":"referral","label":"Referral"},
  {"id":"web","label":"Web"},
  {"id":"other","label":"Other"}
]'::jsonb
where lead_sources = '[]'::jsonb
   or lead_sources is null
   or jsonb_typeof(lead_sources) <> 'array'
   or jsonb_array_length(lead_sources) = 0;

alter table public.leads drop constraint if exists leads_source_check;
