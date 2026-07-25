-- Configurable lead pipeline stages on company settings.
-- Drop the hard status CHECK so custom stage ids can be stored on leads.

alter table public.company_settings
  add column if not exists lead_stages jsonb not null default '[]'::jsonb;

update public.company_settings
set lead_stages = '[
  {"id":"new","label":"New","kind":"open"},
  {"id":"qualifying","label":"Qualifying","kind":"open"},
  {"id":"proposal_sent","label":"Proposal sent","kind":"open"},
  {"id":"won","label":"Won","kind":"won"},
  {"id":"lost","label":"Lost","kind":"lost"}
]'::jsonb
where lead_stages = '[]'::jsonb
   or lead_stages is null
   or jsonb_typeof(lead_stages) <> 'array'
   or jsonb_array_length(lead_stages) = 0;

alter table public.leads drop constraint if exists leads_status_check;
