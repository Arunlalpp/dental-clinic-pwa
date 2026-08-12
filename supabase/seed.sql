-- ---------------------------------------------------------------------------
-- Demo seed data.
--
-- Run AFTER:
--   1. applying supabase/migrations/0001_foundation.sql, and
--   2. creating at least one auth user (sign up in the app) so a `profiles`
--      row exists — dentists / appointments link to it.
--
-- Safe to re-run: patients are guarded by the unique phone constraint and the
-- rest is wrapped in existence checks.
-- ---------------------------------------------------------------------------

insert into public.patients (full_name, phone, gender, allergies, medical_notes)
values
  ('Rahul Thomas',  '+91 98765 43210', 'male',   'Penicillin', 'Hypertension — monitor BP'),
  ('Meera Nair',    '+91 90000 12345', 'female', null,          null),
  ('Arjun Menon',   '+91 99887 76655', 'male',   null,          'Sensitive to cold'),
  ('Fatima Sheikh', '+91 91234 56780', 'female', 'Latex',       null)
on conflict (normalized_phone) do nothing;

do $$
declare
  v_profile uuid;
  v_dentist uuid;
  v_p1 uuid;
  v_p2 uuid;
begin
  select id into v_profile from public.profiles order by created_at limit 1;
  if v_profile is null then
    raise notice 'No profile found — sign up a user first, then re-run seed.sql.';
    return;
  end if;

  -- One dentist linked to the first profile (idempotent by profile_id).
  select id into v_dentist from public.dentists where profile_id = v_profile;
  if v_dentist is null then
    insert into public.dentists (profile_id, specialization, active)
    values (v_profile, 'General Dentistry', true)
    returning id into v_dentist;
  end if;

  select id into v_p1 from public.patients where normalized_phone = '919876543210';
  select id into v_p2 from public.patients where normalized_phone = '919000012345';

  -- Today's appointments (unique constraint prevents duplicate slots on re-run).
  insert into public.appointments
    (patient_id, dentist_id, appointment_date, start_time, appointment_type, status, created_by)
  values
    (v_p1, v_dentist, current_date, '10:00', 'dental_cleaning', 'confirmed', v_profile),
    (v_p2, v_dentist, current_date, '11:30', 'root_canal',      'scheduled', v_profile)
  on conflict (dentist_id, appointment_date, start_time) do nothing;

  -- Some history for Rahul (only if he has none yet).
  if not exists (select 1 from public.treatments where patient_id = v_p1) then
    insert into public.treatments
      (patient_id, dentist_id, treatment_name, tooth_number, status, treatment_date, cost)
    values
      (v_p1, v_dentist, 'Root Canal Treatment', '36', 'completed', current_date - 30, 8000),
      (v_p1, v_dentist, 'Dental Cleaning',       null, 'completed', current_date - 10, 1500);

    insert into public.payments
      (patient_id, amount, payment_method, payment_status, payment_date, created_by)
    values
      (v_p1, 6500, 'upi',  'paid', current_date - 30, v_profile),
      (v_p1, 1500, 'cash', 'paid', current_date - 10, v_profile);
  end if;
end $$;
