-- Fix venue-booking-proofs storage RLS.
-- Bug: inside `exists (select … from venues v …)`, unqualified `name` binds to
-- venues.name (display name), not storage.objects.name (object path). Postgres
-- rewrites it as storage.foldername(v.name), so the venue_id folder check never
-- matches and INSERT fails with RLS for every player upload.
-- Path remains: {venue_id}/{user_id}/{uuid}.ext

drop policy if exists venue_booking_proofs_select on storage.objects;
create policy venue_booking_proofs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'venue-booking-proofs'
    and (
      public.is_admin()
      or (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
      or exists (
        select 1 from public.venues v
        where v.id::text = (storage.foldername(storage.objects.name))[1]
          and v.owner_id = (select auth.uid())
      )
    )
  );

drop policy if exists venue_booking_proofs_insert on storage.objects;
create policy venue_booking_proofs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'venue-booking-proofs'
    and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.venues v
      where v.id::text = (storage.foldername(storage.objects.name))[1]
        and v.deleted_at is null
    )
  );

drop policy if exists venue_booking_proofs_update on storage.objects;
create policy venue_booking_proofs_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'venue-booking-proofs'
    and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'venue-booking-proofs'
    and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
  );

drop policy if exists venue_booking_proofs_delete on storage.objects;
create policy venue_booking_proofs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'venue-booking-proofs'
    and (
      public.is_admin()
      or (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    )
  );
