-- ============================================================================
-- Patient search indexes (Phase 0 follow-up)
--
-- searchPatients() ORs together full_name, patient_number, email and
-- normalized_phone in one query. Postgres can only use a bitmap OR across
-- that many branches if every branch has a usable index — full_name and
-- normalized_phone already had trigram indexes (0001_foundation.sql), but
-- patient_number only had a plain btree (useless for '%term%') and email had
-- none, so the whole OR fell back to a sequential scan on every search.
-- ============================================================================

create index if not exists idx_patients_patient_number_trgm
  on public.patients using gin (patient_number gin_trgm_ops);

create index if not exists idx_patients_email_trgm
  on public.patients using gin (email gin_trgm_ops);

-- Backs the default (empty-query) listing: order by created_at desc limit N.
create index if not exists idx_patients_created_at
  on public.patients (created_at desc);
