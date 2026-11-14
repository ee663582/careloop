create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'patient' check (role in ('patient','clinician')),
  full_name text not null default 'CARELOOP member',
  medical_id text unique,
  professional_id text unique,
  age integer check (age is null or age >= 18),
  body_type text check (body_type is null or body_type in ('Female','Male')),
  created_at timestamptz not null default now(),
  constraint profile_identifier_matches_role check (
    (role = 'patient' and medical_id is not null and professional_id is null) or
    (role = 'clinician' and professional_id is not null and medical_id is null)
  )
);

create table if not exists public.care_team_links (
  patient_id uuid not null references public.profiles(id) on delete cascade,
  clinician_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (patient_id, clinician_id)
);

create table if not exists public.symptom_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  locations text[] not null default '{}',
  location_uncertain boolean not null default false,
  description text not null,
  reported_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.care_team_links enable row level security;
alter table public.symptom_entries enable row level security;

create policy "read own profile or linked patient profile" on public.profiles for select to authenticated
using (id = auth.uid() or exists (
  select 1 from public.care_team_links l where l.patient_id = profiles.id and l.clinician_id = auth.uid()
));
create policy "patient updates own age and body reference" on public.profiles for update to authenticated
using (id = auth.uid() and role = 'patient') with check (id = auth.uid() and role = 'patient');
create policy "patient reads own team links" on public.care_team_links for select to authenticated
using (patient_id = auth.uid() or clinician_id = auth.uid());
create policy "patient inserts own symptoms" on public.symptom_entries for insert to authenticated
with check (patient_id = auth.uid());
create policy "patient and linked clinician read symptoms" on public.symptom_entries for select to authenticated
using (patient_id = auth.uid() or exists (
  select 1 from public.care_team_links l where l.patient_id = symptom_entries.patient_id and l.clinician_id = auth.uid()
));
create policy "patient updates own symptoms" on public.symptom_entries for update to authenticated
using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "patient deletes own symptoms" on public.symptom_entries for delete to authenticated
using (patient_id = auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (age, body_type) on public.profiles to authenticated;
grant select on public.care_team_links to authenticated;
grant select, insert, update, delete on public.symptom_entries to authenticated;

create or replace function public.create_patient_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare new_id text;
begin
  new_id := 'CL-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
  insert into public.profiles (id, role, full_name, medical_id)
  values (new.id, 'patient', coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'CARELOOP member'), new_id);
  return new;
end;
$$;
drop trigger if exists careloop_auth_user_created on auth.users;
create trigger careloop_auth_user_created after insert on auth.users
for each row execute function public.create_patient_profile();
