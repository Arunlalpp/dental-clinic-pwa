-- ============================================================================
-- Dental Clinic PWA — Foundation Migration (Phase 0)
-- Supabase / PostgreSQL
--
-- Contents:
--   1. Extensions
--   2. Enums
--   3. Tables
--   4. Helper functions (role checks, phone normalization, timestamps)
--   5. Indexes (search + foreign keys + hot paths)
--   6. Triggers (profile creation, patient number, normalized phone, updated_at)
--   7. Row Level Security policies
--   8. Storage bucket + policies (private patient documents)
--
-- Run this in the Supabase SQL editor, or via `supabase db push` as a migration.
-- Idempotent-ish: uses IF NOT EXISTS / DROP ... IF EXISTS where practical so it
-- can be re-applied during development.
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy name/phone search


-- ============================================================================
-- 2. ENUMS
-- ============================================================================
do $$ begin
  create type public.user_role as enum
    ('owner', 'admin', 'receptionist', 'dentist', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gender_type as enum
    ('male', 'female', 'other', 'prefer_not_to_say');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum
    ('scheduled', 'confirmed', 'checked_in', 'in_treatment',
     'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_type as enum
    ('consultation', 'dental_cleaning', 'root_canal', 'tooth_extraction',
     'dental_filling', 'braces_consultation', 'implant_consultation',
     'follow_up', 'emergency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.treatment_status as enum
    ('planned', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum
    ('cash', 'upi', 'card', 'bank_transfer', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum
    ('pending', 'partial', 'paid', 'refunded');
exception when duplicate_object then null; end $$;


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ---- profiles ---- (one row per auth user; the staff directory) -----------
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  name        text not null,
  email       text,
  role        public.user_role not null default 'staff',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---- patients -------------------------------------------------------------
create sequence if not exists public.patient_number_seq;

create table if not exists public.patients (
  id                uuid primary key default gen_random_uuid(),
  patient_number    text unique,                 -- auto-filled by trigger (P000001)
  full_name         text not null,
  phone             text not null,               -- as entered / displayed
  normalized_phone  text not null,               -- digits only; the unique key
  email             text,
  date_of_birth     date,
  gender            public.gender_type,
  address           text,
  medical_notes     text,
  allergies         text,
  emergency_contact text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint patients_normalized_phone_key unique (normalized_phone)
);

-- ---- dentists -------------------------------------------------------------
create table if not exists public.dentists (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  specialization text,
  license_number text,
  bio            text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---- appointments ---------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients(id) on delete cascade,
  dentist_id       uuid references public.dentists(id) on delete set null,
  appointment_date date not null,
  start_time       time not null,
  end_time         time,
  appointment_type public.appointment_type not null default 'consultation',
  status           public.appointment_status not null default 'scheduled',
  reason           text,
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- prevent exact double-booking of the same dentist/date/time
  constraint appointments_no_double_book
    unique (dentist_id, appointment_date, start_time)
);

-- ---- treatments -----------------------------------------------------------
create table if not exists public.treatments (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  dentist_id     uuid references public.dentists(id) on delete set null,
  treatment_name text not null,
  tooth_number   text,                            -- text: supports FDI codes / ranges
  diagnosis      text,
  status         public.treatment_status not null default 'planned',
  notes          text,
  treatment_date date,
  cost           numeric(12,2) not null default 0 check (cost >= 0),
  follow_up_date date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---- payments -------------------------------------------------------------
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid not null references public.patients(id) on delete cascade,
  appointment_id        uuid references public.appointments(id) on delete set null,
  treatment_id          uuid references public.treatments(id) on delete set null,
  amount                numeric(12,2) not null check (amount >= 0),
  payment_method        public.payment_method not null default 'cash',
  payment_status        public.payment_status not null default 'paid',
  transaction_reference text,
  payment_date          date not null default current_date,
  notes                 text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now()
);

-- ---- prescriptions --------------------------------------------------------
create table if not exists public.prescriptions (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  dentist_id     uuid references public.dentists(id) on delete set null,
  medicine_name  text not null,
  dosage         text,
  frequency      text,
  duration       text,
  instructions   text,
  created_at     timestamptz not null default now()
);

-- ---- documents ------------------------------------------------------------
create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  file_name      text not null,
  file_url       text not null,                   -- storage path in 'patient-documents'
  file_type      text,
  uploaded_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ---- notifications --------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  message    text,
  type       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---- audit_logs -----------------------------------------------------------
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,                       -- e.g. 'patient.created'
  entity     text not null,                       -- e.g. 'patient'
  entity_id  uuid,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================
-- Must come after TABLES: current_app_role/is_admin/is_staff are `language sql`
-- functions, and Postgres resolves their body (incl. table references) at
-- CREATE FUNCTION time to determine the return type — public.profiles has to
-- already exist.

-- Normalize a phone number to digits only (keeps a leading country code as
-- digits). This is the canonical value used for duplicate detection + search.
-- e.g. "+91 98765 43210" -> "919876543210"
create or replace function public.normalize_phone(raw text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(raw, ''), '\D', '', 'g'), '');
$$;

-- Generic updated_at bumper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Return the caller's application role. SECURITY DEFINER so it can read
-- public.profiles without tripping that table's own RLS (prevents recursion).
create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'admin'), false);
$$;

-- Any authenticated clinic staff member (i.e. has a profile row).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where user_id = auth.uid());
$$;

create or replace function public.can_manage_clinical()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner','admin','dentist'), false);
$$;


-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- Patient search (the hot path). Trigram indexes power fast partial matches.
create index if not exists idx_patients_normalized_phone
  on public.patients (normalized_phone);
create index if not exists idx_patients_normalized_phone_trgm
  on public.patients using gin (normalized_phone gin_trgm_ops);
create index if not exists idx_patients_full_name_trgm
  on public.patients using gin (full_name gin_trgm_ops);
create index if not exists idx_patients_patient_number
  on public.patients (patient_number);

-- Appointments
create index if not exists idx_appointments_date
  on public.appointments (appointment_date);
create index if not exists idx_appointments_patient
  on public.appointments (patient_id);
create index if not exists idx_appointments_dentist
  on public.appointments (dentist_id);
create index if not exists idx_appointments_status
  on public.appointments (status);
create index if not exists idx_appointments_date_dentist
  on public.appointments (appointment_date, dentist_id);

-- Treatments / payments / prescriptions / documents by patient
create index if not exists idx_treatments_patient   on public.treatments (patient_id);
create index if not exists idx_treatments_appt       on public.treatments (appointment_id);
create index if not exists idx_payments_patient      on public.payments (patient_id);
create index if not exists idx_payments_treatment    on public.payments (treatment_id);
create index if not exists idx_prescriptions_patient on public.prescriptions (patient_id);
create index if not exists idx_documents_patient     on public.documents (patient_id);
create index if not exists idx_notifications_user    on public.notifications (user_id, read);
create index if not exists idx_audit_entity          on public.audit_logs (entity, entity_id);


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'staff')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Patient: fill normalized_phone + patient_number before insert; keep
-- normalized_phone in sync on update.
create or replace function public.handle_patient_write()
returns trigger
language plpgsql
as $$
begin
  new.normalized_phone := public.normalize_phone(new.phone);
  if new.normalized_phone is null then
    raise exception 'A valid phone number is required';
  end if;

  if tg_op = 'INSERT' and new.patient_number is null then
    new.patient_number := 'P' || lpad(nextval('public.patient_number_seq')::text, 6, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_patient_write on public.patients;
create trigger trg_patient_write
  before insert or update on public.patients
  for each row execute function public.handle_patient_write();

-- updated_at bumpers
drop trigger if exists trg_profiles_updated   on public.profiles;
create trigger trg_profiles_updated   before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_patients_updated   on public.patients;
create trigger trg_patients_updated   before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_treatments_updated on public.treatments;
create trigger trg_treatments_updated before update on public.treatments
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.patients      enable row level security;
alter table public.dentists      enable row level security;
alter table public.appointments  enable row level security;
alter table public.treatments    enable row level security;
alter table public.payments      enable row level security;
alter table public.prescriptions enable row level security;
alter table public.documents     enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs    enable row level security;

-- ---- profiles -------------------------------------------------------------
-- Every staff member can see the staff directory (needed for dentist names).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

-- You may update your own profile; admins may update anyone.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Only admins can hard-delete profiles.
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ---- patients : all staff may read + create + update; admin may delete ----
drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients
  for select to authenticated using (public.is_staff());

drop policy if exists patients_insert on public.patients;
create policy patients_insert on public.patients
  for insert to authenticated with check (public.is_staff());

drop policy if exists patients_update on public.patients;
create policy patients_update on public.patients
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists patients_delete on public.patients;
create policy patients_delete on public.patients
  for delete to authenticated using (public.is_admin());

-- ---- dentists : readable by staff; managed by admin -----------------------
drop policy if exists dentists_select on public.dentists;
create policy dentists_select on public.dentists
  for select to authenticated using (public.is_staff());

drop policy if exists dentists_write on public.dentists;
create policy dentists_write on public.dentists
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- appointments : staff read + create + update; admin delete ------------
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated using (public.is_staff());

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert to authenticated with check (public.is_staff());

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments
  for delete to authenticated using (public.is_admin());

-- ---- treatments : read all staff; write clinical roles (dentist/admin) ----
drop policy if exists treatments_select on public.treatments;
create policy treatments_select on public.treatments
  for select to authenticated using (public.is_staff());

drop policy if exists treatments_write on public.treatments;
create policy treatments_write on public.treatments
  for all to authenticated
  using (public.can_manage_clinical()) with check (public.can_manage_clinical());

-- ---- payments : read all staff; insert staff; update/delete admin ---------
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated using (public.is_staff());

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
  for insert to authenticated with check (public.is_staff());

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments
  for delete to authenticated using (public.is_admin());

-- ---- prescriptions : read all staff; write clinical roles -----------------
drop policy if exists prescriptions_select on public.prescriptions;
create policy prescriptions_select on public.prescriptions
  for select to authenticated using (public.is_staff());

drop policy if exists prescriptions_write on public.prescriptions;
create policy prescriptions_write on public.prescriptions
  for all to authenticated
  using (public.can_manage_clinical()) with check (public.can_manage_clinical());

-- ---- documents : read + upload by staff; delete by admin ------------------
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated using (public.is_staff());

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert to authenticated with check (public.is_staff());

drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
  for delete to authenticated using (public.is_admin());

-- ---- notifications : each user sees + updates only their own --------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (public.is_staff());

-- ---- audit_logs : any staff may append; only admins may read --------------
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert to authenticated with check (public.is_staff());

drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select to authenticated using (public.is_admin());


-- ============================================================================
-- 8. STORAGE — private patient documents bucket
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

-- Only authenticated staff may read/write objects in this private bucket.
drop policy if exists patient_docs_select on storage.objects;
create policy patient_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'patient-documents' and public.is_staff());

drop policy if exists patient_docs_insert on storage.objects;
create policy patient_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'patient-documents' and public.is_staff());

drop policy if exists patient_docs_delete on storage.objects;
create policy patient_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'patient-documents' and public.is_admin());


-- ============================================================================
-- OPTIONAL CONVENIENCE VIEW — patient balance (cost billed vs. paid)
-- Handy for the "Outstanding" figure on the patient preview card.
-- ============================================================================
create or replace view public.patient_balances as
select
  p.id                              as patient_id,
  coalesce(t.total_cost, 0)         as total_cost,
  coalesce(pay.total_paid, 0)       as total_paid,
  coalesce(t.total_cost, 0) - coalesce(pay.total_paid, 0) as outstanding
from public.patients p
left join (
  select patient_id, sum(cost) as total_cost
  from public.treatments group by patient_id
) t on t.patient_id = p.id
left join (
  select patient_id, sum(amount) as total_paid
  from public.payments
  where payment_status in ('paid', 'partial')
  group by patient_id
) pay on pay.patient_id = p.id;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
